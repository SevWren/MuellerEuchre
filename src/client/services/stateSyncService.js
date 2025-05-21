import { log } from '../../utils/logger.js';
import { GAME_EVENTS } from '../../config/constants.js';

class StateSyncService {
    constructor(socketService) {
        this.socketService = socketService;
        this.currentState = null;
        this.pendingActions = [];
        this.isReplaying = false;
        this.initialized = false;
        this.listeners = new Map();
        
        // Bind methods
        this.handleGameUpdate = this.handleGameUpdate.bind(this);
        this.handleReconnect = this.handleReconnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    /**
     * Initialize the state sync service
     */
    initialize() {
        if (this.initialized) return;
        
        // Set up event listeners
        this.socketService.on(GAME_EVENTS.STATE_UPDATE, this.handleGameUpdate);
        this.socketService.on('reconnect', this.handleReconnect);
        this.socketService.on('disconnect', this.handleDisconnect);
        
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
     * @param {...any} args - The action arguments
     */
    async dispatch(event, ...args) {
        if (!this.socketService.connected) {
            // Queue the action if offline
            this.queueAction(event, args);
            throw new Error('Offline: Action queued for later');
        }

        try {
            const result = await this.socketService.send(event, ...args);
            return result;
        } catch (error) {
            if (error.message.includes('offline') || error.message.includes('disconnected')) {
                // Queue the action if we lost connection during the request
                this.queueAction(event, args);
            }
            throw error;
        }
    }

    /**
     * Queue an action for later execution
     * @param {string} event - The event name
     * @param {Array} args - The action arguments
     */
    queueAction(event, args) {
        this.pendingActions.push({ event, args, timestamp: Date.now() });
        log(1, `Action queued: ${event} (${this.pendingActions.length} in queue)`);
        
        // Notify listeners of the queue change
        this.notifyListeners('queueUpdate', this.pendingActions);
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
        instance.initialize();
    }
    return instance;
}

export default StateSyncService;
