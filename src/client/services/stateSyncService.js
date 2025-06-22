import { log } from '../../utils/logger.js';
import { GAME_EVENTS, STORAGE_KEYS } from '../../config/constants.js';

// Helper to safely access localStorage
const safeStorage = {
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            log(2, `Error reading from localStorage: ${e.message}`);
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            log(2, `Error writing to localStorage: ${e.message}`);
            return false;
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            log(2, `Error removing from localStorage: ${e.message}`);
            return false;
        }
    }
};

class StateSyncService {
    constructor(socketService) {
        this.socketService = socketService;
        this.currentState = null;
        this.pendingActions = [];
        this.isReplaying = false;
        this.initialized = false;
        this.isOffline = false;
        this.listeners = new Map();
        this.offlineQueue = [];
        this.offlineTimer = null;
        
        // Bind methods
        this.handleGameUpdate = this.handleGameUpdate.bind(this);
        this.handleReconnect = this.handleReconnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
        this.processOfflineQueue = this.processOfflineQueue.bind(this);
        this.saveStateToStorage = this.saveStateToStorage.bind(this);
        this.loadStateFromStorage = this.loadStateFromStorage.bind(this);
    }

    /**
     * Initialize the state sync service
     */
    async initialize() {
        if (this.initialized) return;
        
        // Set up event listeners
        this.socketService.on(GAME_EVENTS.STATE_UPDATE, this.handleGameUpdate);
        this.socketService.on('reconnect', this.handleReconnect);
        this.socketService.on('disconnect', this.handleDisconnect);
        
        // Load any saved state from storage
        const savedState = await this.loadStateFromStorage();
        if (savedState) {
            this.currentState = savedState;
            this.notifyStateChange();
        }
        
        // Start processing offline queue
        this.offlineTimer = setInterval(this.processOfflineQueue, 5000);
        
        this.initialized = true;
        log(1, 'StateSyncService initialized');
    }

    /**
     * Handle game state updates from the server
     * @param {Object} newState - The new game state
     */
    handleGameUpdate(newState) {
        // If we're replaying actions, don't process updates until done
        if (this.isReplaying) {
            return;
        }

        // If this is the first state or a full state update
        if (!this.currentState || newState._fullUpdate) {
            this.currentState = this.deepClone(newState);
        } else {
            // Merge the new state with the current state
            this.currentState = this.mergeStates(this.currentState, newState);
        }

        // Save state to storage
        this.saveStateToStorage(this.currentState);
        
        // Clear offline flag if we're back online
        if (this.isOffline) {
            this.isOffline = false;
            log(1, 'Back online, state updated from server');
        }

        // Notify listeners of the state change
        this.notifyStateChange();
    }

    /**
     * Handle reconnection events
     */
    async handleReconnect() {
        log(1, 'Connection restored, syncing state...');
        
        // Replay any pending actions
        if (this.pendingActions.length > 0) {
            this.isReplaying = true;
            
            try {
                // Replay actions in order
                for (const action of this.pendingActions) {
                    await this.socketService.send(action.event, ...action.args);
                }
                log(1, `Replayed ${this.pendingActions.length} pending actions`);
            } catch (error) {
                log(3, `Error replaying actions: ${error.message}`);
                // If replay fails, request full state from server
                await this.requestFullState();
            }
            
            this.pendingActions = [];
            this.isReplaying = false;
        } else {
            // No pending actions, just request the latest state
            await this.requestFullState();
        }
    }

    /**
     * Handle disconnection events
     */
    handleDisconnect() {
        log(1, 'Connection lost, buffering actions...');
        this.isOffline = true;
        
        // Save current state to storage
        if (this.currentState) {
            this.saveStateToStorage(this.currentState);
        }
    }

    /**
     * Request the full game state from the server
     */
    async requestFullState() {
        try {
            const fullState = await this.socketService.send(GAME_EVENTS.REQUEST_FULL_STATE);
            if (fullState) {
                this.currentState = fullState;
                this.notifyStateChange();
            }
        } catch (error) {
            log(3, `Failed to fetch full state: ${error.message}`);
        }
    }

    /**
     * Send an action to the server with automatic reconnection handling
     * @param {string} event - The event name
     * @param {...any} args    // Send an action to the server
    async sendAction(event, ...args) {
        if (!this.socketService.isConnected) {
            // If not connected, add to offline queue
            const actionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const action = { event, args, id: actionId, timestamp: Date.now() };
            
            // Add to offline queue and save to storage
            this.offlineQueue.push(action);
            this.saveOfflineQueue();
            
            // Update offline state
            this.isOffline = true;
            
            throw new Error('Not connected to server. Action queued for later.');
        }

        try {
            const result = await this.socketService.send(event, ...args);
            
            // If we had queued actions, try to process them
            if (this.offlineQueue.length > 0) {
                this.processOfflineQueue();
            }
            
            return result;
        } catch (error) {
            // If the error is due to connection loss, queue the action
            if (error.message.includes('disconnected') || error.message.includes('timeout')) {
                const actionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                const action = { event, args, id: actionId, timestamp: Date.now() };
                this.offlineQueue.push(action);
                this.saveOfflineQueue();
                this.isOffline = true;
            }
            throw error;
        }
    }

    /**
     * Process the offline queue
     */
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0 || !this.socketService.isConnected) {
            return;
        }

        // Sort by timestamp to maintain order
        this.offlineQueue.sort((a, b) => a.timestamp - b.timestamp);
        
        // Process each action in the queue
        const processed = [];
        const failed = [];
        
        for (const action of this.offlineQueue) {
            try {
                await this.socketService.send(action.event, ...action.args);
                processed.push(action.id);
            } catch (error) {
                log(2, `Failed to process queued action ${action.event}: ${error.message}`);
                failed.push(action);
                
                // If it's a connection error, stop processing further actions
                if (error.message.includes('disconnected') || error.message.includes('timeout')) {
                    this.isOffline = true;
                    break;
                }
            }
        }
        
        // Update the queue with any failed actions
        this.offlineQueue = failed;
        this.saveOfflineQueue();
        
        // If we processed any actions, request a full state update
        if (processed.length > 0) {
            log(1, `Processed ${processed.length} queued actions`);
            await this.requestFullState();
        }
    }
    
    /**
     * Save state to localStorage
     */
    saveStateToStorage(state) {
        if (!state) return;
        
        try {
            // Don't store sensitive or large data
            const stateToStore = {
                ...state,
                // Clear any sensitive data that shouldn't be persisted
                players: undefined,
                deck: undefined,
                _fullUpdate: undefined
            };
            
            safeStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({
                state: stateToStore,
                timestamp: Date.now()
            }));
        } catch (error) {
            log(2, `Error saving state to storage: ${error.message}`);
        }
    }
    
    /**
     * Load state from localStorage
     */
    async loadStateFromStorage() {
        try {
            const saved = safeStorage.getItem(STORAGE_KEYS.GAME_STATE);
            if (!saved) return null;
            
            const { state, timestamp } = JSON.parse(saved);
            
            // Don't use state if it's too old (1 hour)
            if (Date.now() - timestamp > 3600000) {
                safeStorage.removeItem(STORAGE_KEYS.GAME_STATE);
                return null;
            }
            
            log(1, 'Loaded game state from storage');
            return state;
        } catch (error) {
            log(2, `Error loading state from storage: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Save offline queue to storage
     */
    saveOfflineQueue() {
        try {
            safeStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify({
                queue: this.offlineQueue,
                timestamp: Date.now()
            }));
        } catch (error) {
            log(2, `Error saving offline queue: ${error.message}`);
        }
    }
    
    /**
     * Load offline queue from storage
     */
    loadOfflineQueue() {
        try {
            const saved = safeStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
            if (!saved) return [];
            
            const { queue, timestamp } = JSON.parse(saved);
            
            // Don't use queue if it's too old (24 hours)
            if (Date.now() - timestamp > 86400000) {
                safeStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
                return [];
            }
            
            return Array.isArray(queue) ? queue : [];
        } catch (error) {
            log(2, `Error loading offline queue: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        if (this.offlineTimer) {
            clearInterval(this.offlineTimer);
            this.offlineTimer = null;
        }
        
        if (this.socketService) {
            this.socketService.off(GAME_EVENTS.STATE_UPDATE, this.handleGameUpdate);
            this.socketService.off('reconnect', this.handleReconnect);
            this.socketService.off('disconnect', this.handleDisconnect);
        }
    }

    /**
     * Get the current game state
     * @returns {Object} The current game state
     */
    getState() {
        return this.deepClone(this.currentState);
    }

    /**
     * Subscribe to state changes
     * @param {string} event - The event to listen for
     * @param {Function} callback - The callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        const listeners = this.listeners.get(event);
        listeners.add(callback);
        
        // Return unsubscribe function
        return () => {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.listeners.delete(event);
            }
        };
    }

    /**
     * Notify all listeners of a state change
     */
    notifyStateChange() {
        if (!this.currentState) return;
        this.notifyListeners('stateChange', this.getState());
    }

    /**
     * Notify all listeners of a specific event
     * @param {string} event - The event name
     * @param {any} data - The event data
     */
    notifyListeners(event, data) {
        const callbacks = this.listeners.get(event) || [];
        for (const callback of callbacks) {
            try {
                callback(data);
            } catch (error) {
                log(3, `Error in ${event} listener:`, error);
            }
        }
    }

    /**
     * Deep clone an object
     * @param {Object} obj - The object to clone
     * @returns {Object} A deep clone of the object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Merge two states, with newState taking precedence
     * @param {Object} current - The current state
     * @param {Object} newState - The new state to merge in
     * @returns {Object} The merged state
     */
    mergeStates(current, newState) {
        // Simple deep merge for now - can be optimized for specific state structure
        return {
            ...current,
            ...newState,
            // Handle nested objects that need special merging
            players: {
                ...current.players,
                ...(newState.players || {})
            },
            // Add other nested objects that need special handling
        };
    }
}

// Export a singleton instance
let instance = null;

export function createStateSyncService(socketService) {
    if (!instance) {
        instance = new StateSyncService(socketService);
        // Load any queued actions from storage
        instance.offlineQueue = instance.loadOfflineQueue();
    }
    return instance;
}

export default StateSyncService;
