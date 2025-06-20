import { log } from '../../utils/logger.js';
import { GAME_EVENTS, STORAGE_KEYS } from '../../config/constants.js';

/**
 * @namespace safeStorage
 * @description A helper object to safely access localStorage, handling potential errors.
 */
// Helper to safely access localStorage
const safeStorage = {
    /**
     * Safely retrieves an item from localStorage.
     * @param {string} key - The key of the item to retrieve.
     * @returns {string|null} The item's value, or null if not found or an error occurs.
     * @memberof safeStorage
     */
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            log(2, `Error reading from localStorage: ${e.message}`);
            return null;
        }
    },
    /**
     * Safely sets an item in localStorage.
     * @param {string} key - The key of the item to set.
     * @param {string} value - The value to set for the item.
     * @returns {boolean} True if the item was set successfully, false otherwise.
     * @memberof safeStorage
     */
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            log(2, `Error writing to localStorage: ${e.message}`);
            return false;
        }
    },
    /**
     * Safely removes an item from localStorage.
     * @param {string} key - The key of the item to remove.
     * @returns {boolean} True if the item was removed successfully, false otherwise.
     * @memberof safeStorage
     */
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

/**
 * @class StateSyncService
 * @description Manages client-side state synchronization with the server,
 * handling offline queueing, state persistence, and reconnection logic.
 * It ensures that the client's game state is consistent and actions are reliably sent.
 */
class StateSyncService {
    /**
     * Creates an instance of StateSyncService.
     * @param {import('./socketService.js').SocketService} socketService - The socket service instance for server communication.
     * @memberof StateSyncService
     */
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
     * Initializes the StateSyncService.
     * Sets up event listeners for socket events (STATE_UPDATE, reconnect, disconnect).
     * Loads any saved state from storage and starts the offline queue processing timer.
     * This method should be called once when the service is created.
     * @async
     * @returns {Promise<void>}
     * @memberof StateSyncService
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
     * Handles incoming game state updates from the server via `GAME_EVENTS.STATE_UPDATE`.
     * If replaying actions, this method will ignore updates until replay is complete.
     * Merges the new state with the current state or performs a full update.
     * Saves the updated state to storage and notifies listeners.
     * @param {object} newState - The new game state received from the server.
     * @memberof StateSyncService
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
     * Handles the 'reconnect' event from the socket service.
     * Attempts to replay any pending actions that were queued while offline.
     * If replay fails or there are no pending actions, requests a full state update from the server.
     * @async
     * @memberof StateSyncService
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
     * Handles the 'disconnect' event from the socket service.
     * Sets the service to offline mode and saves the current state to storage.
     * @memberof StateSyncService
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
     * Requests the full game state from the server using `GAME_EVENTS.REQUEST_FULL_STATE`.
     * Updates the current state and notifies listeners upon successful retrieval.
     * @async
     * @memberof StateSyncService
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
     * Sends an action to the server via `socketService.send`.
     * If the client is offline, the action is added to an offline queue to be sent upon reconnection.
     * If an error occurs during sending (e.g., disconnection), the action is queued.
     * @param {string} event - The event name to send.
     * @param {...any} args - Arguments for the event.
     * @returns {Promise<any>} A promise that resolves with the server's response or rejects on error.
     * @throws {Error} If offline and action is queued, or if `socketService.send` throws an error not related to disconnection.
     * @memberof StateSyncService
     */
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
     * Processes actions stored in the offline queue.
     * This is typically called periodically by a timer or after reconnection.
     * Sends actions one by one; if an action fails due to connection issues, processing stops.
     * Successfully sent actions are removed from the queue.
     * Requests a full state update if any actions were processed.
     * @async
     * @memberof StateSyncService
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
     * Saves the current game state to localStorage via `safeStorage`.
     * Certain sensitive or large parts of the state (e.g., players, deck) are excluded.
     * Includes a timestamp with the saved state.
     * @param {object} state - The game state to save.
     * @memberof StateSyncService
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
     * Loads the game state from localStorage via `safeStorage`.
     * If the saved state is older than a defined threshold (e.g., 1 hour), it is discarded.
     * @async
     * @returns {Promise<object|null>} The loaded game state, or null if no valid state is found.
     * @memberof StateSyncService
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
     * Saves the current offline action queue to localStorage via `safeStorage`.
     * Includes a timestamp with the saved queue.
     * @memberof StateSyncService
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
     * Loads the offline action queue from localStorage via `safeStorage`.
     * If the saved queue is older than a defined threshold (e.g., 24 hours), it is discarded.
     * @returns {Array<object>} The loaded offline queue, or an empty array if no valid queue is found.
     * @memberof StateSyncService
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
     * Cleans up resources used by the service.
     * Clears the offline queue timer and removes socket event listeners.
     * This should be called when the service is no longer needed (e.g., user logs out).
     * @memberof StateSyncService
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
     * Gets a deep clone of the current game state.
     * @returns {object|null} A deep clone of the current game state, or null if no state is set.
     * @memberof StateSyncService
     */
    getState() {
        return this.deepClone(this.currentState);
    }

    /**
     * Subscribes a callback function to a specific event (e.g., 'stateChange').
     * @param {string} event - The event name to subscribe to (e.g., 'stateChange').
     * @param {function(any): void} callback - The function to call when the event occurs. It will receive event data.
     * @returns {function(): void} An unsubscribe function. Call this to remove the subscription.
     * @memberof StateSyncService
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
     * Notifies all subscribers of the 'stateChange' event with the current game state.
     * This is called internally after the state is updated.
     * @memberof StateSyncService
     * @private
     */
    notifyStateChange() {
        if (!this.currentState) return;
        this.notifyListeners('stateChange', this.getState());
    }

    /**
     * Notifies all listeners subscribed to a specific event.
     * @param {string} event - The event name.
     * @param {any} data - The data to pass to the listeners' callback functions.
     * @memberof StateSyncService
     * @private
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
     * Creates a deep clone of an object using `JSON.parse(JSON.stringify(obj))`.
     * @param {object} obj - The object to clone.
     * @returns {object} A deep clone of the object. Returns null if obj is null or undefined.
     * @memberof StateSyncService
     * @private
     */
    deepClone(obj) {
        if (obj === null || obj === undefined) return null;
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Merges the `newState` into the `current` state.
     * This is a shallow merge for top-level properties, with special handling for nested `players` object.
     * Can be customized for more complex state structures.
     * @param {object} current - The current state object.
     * @param {object} newState - The new state object to merge in.
     * @returns {object} The merged state object.
     * @memberof StateSyncService
     * @private
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

/**
 * Creates and returns a singleton instance of StateSyncService.
 * If an instance already exists, it returns that instance.
 * Initializes the service and loads the offline queue from storage upon first creation.
 * @param {import('./socketService.js').SocketService} socketService - The socket service instance.
 * @returns {StateSyncService} The singleton instance of StateSyncService.
 */
export function createStateSyncService(socketService) {
    if (!instance) {
        instance = new StateSyncService(socketService);
        // Load any queued actions from storage
        instance.offlineQueue = instance.loadOfflineQueue();
    }
    return instance;
}

export default StateSyncService;
