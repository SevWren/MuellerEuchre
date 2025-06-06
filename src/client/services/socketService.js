import io from 'socket.io-client';
import ReconnectionHandler from '../../socket/reconnectionHandler.js';
import { GAME_EVENTS } from '../../config/constants.js';
import { log } from '../../utils/logger.js';

// Connection quality thresholds (in ms)
const CONNECTION_QUALITY = {
    EXCELLENT: 100,
    GOOD: 200,
    FAIR: 500,
    POOR: 1000
};

class SocketService {
    constructor() {
        this.socket = null;
        this.reconnectionHandler = null;
        this.isConnected = false;
        this.messageQueue = [];
        this.eventListeners = new Map();
        this.reconnectCallbacks = [];
        this.disconnectCallbacks = [];
        this.connectionPromise = null;
        
        // Connection quality tracking
        this.connectionQuality = {
            latency: 0,
            jitter: 0,
            lastUpdated: null,
            quality: 'unknown' // 'excellent', 'good', 'fair', 'poor', 'unknown'
        };
        
        // Bind methods
        this.getConnectionQuality = this.getConnectionQuality.bind(this);
        this.updateConnectionQuality = this.updateConnectionQuality.bind(this);
    }

    /**
     * Connects to the WebSocket server
     * @param {string} url - The server URL
     * @param {Object} options - Connection options
     * @returns {Promise} Resolves when connected
     */
    connect(url, options = {}) {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                log(1, `Connecting to WebSocket server at ${url}`);
                
                // Create socket with options
                const socketOptions = {
                    reconnection: false, // We'll handle reconnection manually
                    autoConnect: true,
                    transports: ['websocket'],
                    ...options
                };
                
                this.socket = io(url, socketOptions);
                
                // Initialize reconnection handler
                this.reconnectionHandler = new ReconnectionHandler(this.socket, {
                    onReconnect: this.handleReconnect.bind(this),
                    onReconnectFailed: this.handleReconnectFailed.bind(this)
                });
                
                // Set up event forwarding
                this.setupEventForwarding();
                
                // Initialize connection quality monitoring
                this.setupConnectionMonitoring();
                
                // Handle initial connection
                const onConnect = () => {
                    log(1, 'Successfully connected to WebSocket server');
                    this.isConnected = true;
                    this.socket.off('connect', onConnect);
                    this.socket.off('connect_error', onConnectError);
                    resolve();
                };
                
                const onConnectError = (error) => {
                    log(2, `WebSocket connection error: ${error.message}`);
                    this.socket.off('connect', onConnect);
                    this.socket.off('connect_error', onConnectError);
                    reject(error);
                };
                
                this.socket.once('connect', onConnect);
                this.socket.once('connect_error', onConnectError);
                
            } catch (error) {
                log(3, `Error initializing WebSocket: ${error.message}`);
                reject(error);
            }
        });
        
        return this.connectionPromise;
    }

    /**
     * Disconnects from the WebSocket server
     */
    disconnect() {
        if (this.qualityCheckInterval) {
            clearInterval(this.qualityCheckInterval);
            this.qualityCheckInterval = null;
        }
        
        if (this.socket) {
            this.socket.disconnect();
            this.isConnected = false;
            this.socket = null;
            this.reconnectionHandler = null;
            this.connectionPromise = null;
            
            // Reset connection quality
            this.connectionQuality = {
                latency: 0,
                jitter: 0,
                lastUpdated: null,
                quality: 'unknown'
            };
        }
    }

    /**
     * Sets up event forwarding from the socket to our listeners
     */
    setupEventForwarding() {
        // Forward all socket events to our listeners
        this.socket.onAny((event, ...args) => {
            this.emit(event, ...args);
            
            // Special handling for certain events
            if (event === GAME_EVENTS.GAME_STATE_UPDATE) {
                this.handleGameStateUpdate(...args);
            } else if (event === GAME_EVENTS.PLAYER_RECONNECTED) {
                this.handlePlayerReconnected(...args);
            }
        });
        
        // Handle socket.io events
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.emit('connect');
        });
        
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            this.emit('disconnect', reason);
        });
        
        this.socket.on('error', (error) => {
            log(2, `WebSocket error: ${error.message}`);
            this.emit('error', error);
        });
    }

    /**
     * Handles reconnection
     */
    handleReconnect(attempt) {
        log(1, `Reconnected to server (attempt ${attempt})`);
        this.isConnected = true;
        
        // Notify listeners
        this.reconnectCallbacks.forEach(callback => {
            try {
                callback(attempt);
            } catch (error) {
                log(2, `Error in reconnect callback: ${error.message}`);
            }
        });
        
        this.emit('reconnect', attempt);
    }

    /**
     * Handles reconnection failure
     */
    handleReconnectFailed(error) {
        log(2, `Failed to reconnect: ${error.message}`);
        this.emit('reconnect_failed', error);
    }

    /**
     * Handles game state updates
     * @param {Object} gameState - The updated game state
     */
    handleGameStateUpdate(gameState) {
        // Cache the latest game state
        this.latestGameState = gameState;
        
        // Update local storage if needed
        if (gameState.gameId) {
            localStorage.setItem(`gameState_${gameState.gameId}`, JSON.stringify(gameState));
        }
    }

    /**
     * Handles player reconnection
     * @param {Object} data - Reconnection data
     */
    handlePlayerReconnected(data) {
        log(1, `Player ${data.playerId} reconnected to game ${data.gameId}`);
        // Additional reconnection logic can be added here
    }

    /**
     * Sends a message to the server
     * @param {string} event - The event name
     * @param {...any} args - The message arguments
     * @returns {Promise} Resolves with the server response
     */
    send(event, ...args) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isConnected) {
                const error = new Error('Not connected to server');
                log(2, error.message);
                return reject(error);
            }
            
            // Add ack callback if not provided
            const hasCallback = typeof args[args.length - 1] === 'function';
            
            if (!hasCallback) {
                // If no callback provided, add one that resolves the promise
                args.push((response) => {
                    if (response && response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response);
                    }
                });
                
                // Add error handler for the ack timeout
                const timeout = setTimeout(() => {
                    reject(new Error('Request timed out'));
                }, 10000); // 10 second timeout
                
                // Store the original callback
                const originalCallback = args[args.length - 1];
                args[args.length - 1] = (...args) => {
                    clearTimeout(timeout);
                    originalCallback(...args);
                };
            }
            
            // Send the message
            this.socket.emit(event, ...args);
        });
    }

    /**
     * Registers an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    /**
     * Removes an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function to remove
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.eventListeners.delete(event);
            }
        }
    }

    /**
     * Emits an event to all registered listeners
     * @param {string} event - The event name
     * @param {...any} args - The event arguments
     */
    emit(event, ...args) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    log(2, `Error in event listener for ${event}: ${error.message}`);
                }
            });
        }
    }

    /**
     * Registers a callback to be called when reconnected
     * @param {Function} callback - The callback function
     */
    onReconnect(callback) {
        if (typeof callback === 'function') {
            this.reconnectCallbacks.push(callback);
        }
        return this;
    }

    /**
     * Registers a callback to be called when disconnected
     * @param {Function} callback - The callback function
     */
    onDisconnect(callback) {
        if (typeof callback === 'function') {
            this.disconnectCallbacks.push(callback);
        }
        return this;
    }

    /**
     * Gets the current connection status
     * @returns {boolean} True if connected, false otherwise
     */
    get connected() {
        return this.isConnected;
    }

    /**
     * Gets the socket ID
     * @returns {string} The socket ID, or null if not connected
     */
    get id() {
        return this.socket ? this.socket.id : null;
    }
}

// Export a singleton instance
export const socketService = new SocketService();

export default socketService;
