import { log } from '../utils/logger.js';
import { gameStateManager } from '../game/stateManager.js';
import { GAME_EVENTS } from '../config/constants.js';

// Default reconnection settings
const DEFAULT_RECONNECTION_SETTINGS = {
    maxReconnectAttempts: 5,           // Maximum number of reconnection attempts
    reconnectInterval: 1000,           // Initial delay between reconnection attempts (ms)
    maxReconnectInterval: 10000,       // Maximum delay between reconnection attempts (ms)
    reconnectDecay: 1.5,               // Rate of increase of the reconnect delay
    timeout: 5000,                     // Connection timeout (ms)
    autoReconnect: true,               // Whether to automatically attempt to reconnect
};

class ReconnectionHandler {
    /**
     * Creates a new ReconnectionHandler
     * @param {Object} socket - The WebSocket client instance
     * @param {Object} options - Configuration options
     */
    constructor(socket, options = {}) {
        this.socket = socket;
        this.options = { ...DEFAULT_RECONNECTION_SETTINGS, ...options };
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.isReconnecting = false;
        this.pendingMessages = [];
        this.messageHandlers = new Map();
        this.connectionCheckInterval = null;
        this.lastPingTime = null;
        
        // Bind methods
        this.handleDisconnect = this.handleDisconnect.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleError = this.handleError.bind(this);
        this.checkConnection = this.checkConnection.bind(this);
        this.sendPing = this.sendPing.bind(this);
        this.handlePong = this.handlePong.bind(this);
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Sets up event listeners on the WebSocket
     */
    setupEventListeners() {
        this.socket.on('disconnect', this.handleDisconnect);
        this.socket.on('connect', this.handleConnect);
        this.socket.on('error', this.handleError);
        this.socket.on('pong', this.handlePong);
        
        // Start connection health monitoring
        this.startConnectionMonitoring();
    }

    /**
     * Starts monitoring the connection health
     */
    startConnectionMonitoring() {
        // Clear any existing interval
        this.stopConnectionMonitoring();
        
        // Set up ping-pong for connection health
        this.connectionCheckInterval = setInterval(() => {
            if (this.socket.connected) {
                this.sendPing();
            }
        }, 30000); // Send ping every 30 seconds
        
        // Initial ping
        if (this.socket.connected) {
            this.sendPing();
        }
    }

    /**
     * Stops monitoring the connection health
     */
    stopConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    /**
     * Sends a ping message to the server
     */
    sendPing() {
        if (this.socket.connected) {
            this.lastPingTime = Date.now();
            this.socket.emit('ping');
            
            // Check if we got a pong back within the timeout
            setTimeout(() => this.checkConnection(), this.options.timeout);
        }
    }

    /**
     * Handles a pong message from the server
     */
    handlePong() {
        this.lastPingTime = null; // Reset ping time on pong
    }

    /**
     * Checks if the connection is still alive
     */
    checkConnection() {
        // If we're still waiting for a pong from the last ping
        if (this.lastPingTime && (Date.now() - this.lastPingTime) > this.options.timeout) {
            log(2, 'Connection appears to be unresponsive, attempting to reconnect...');
            this.handleDisconnect('Connection timeout');
        }
    }

    /**
     * Handles a disconnection event
     * @param {string} reason - The reason for disconnection
     */
    handleDisconnect(reason) {
        if (this.isReconnecting) return; // Already handling reconnection
        
        log(1, `Disconnected: ${reason}`);
        
        if (!this.options.autoReconnect) {
            log(1, 'Auto-reconnect is disabled');
            return;
        }
        
        this.attemptReconnect();
    }

    /**
     * Attempts to reconnect to the server
     */
    async attemptReconnect() {
        if (this.isReconnecting) return;
        
        this.isReconnecting = true;
        
        // Calculate delay using exponential backoff
        const delay = Math.min(
            this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts),
            this.options.maxReconnectInterval
        );
        
        log(1, `Attempting to reconnect (attempt ${this.reconnectAttempts + 1}/${this.options.maxReconnectAttempts}) in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(async () => {
            try {
                // Try to reconnect
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.socket.off('connect', onConnect);
                        reject(new Error('Connection timeout'));
                    }, this.options.timeout);
                    
                    const onConnect = () => {
                        clearTimeout(timeout);
                        resolve();
                    };
                    
                    this.socket.once('connect', onConnect);
                    this.socket.connect();
                });
                
                // If we get here, reconnection was successful
                this.handleReconnectSuccess();
                
            } catch (error) {
                this.handleReconnectError(error);
            }
        }, delay);
    }

    /**
     * Handles a successful reconnection
     */
    async handleReconnectSuccess() {
        log(1, 'Successfully reconnected to the server');
        
        // Reset reconnection state
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        
        // Resubscribe to any channels or re-authenticate if needed
        await this.resubscribe();
        
        // Resend any pending messages
        this.resendPendingMessages();
        
        // Notify any listeners
        this.emit('reconnect', this.reconnectAttempts);
    }

    /**
     * Handles a reconnection error
     * @param {Error} error - The error that occurred
     */
    handleReconnectError(error) {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            // Max reconnection attempts reached
            log(2, `Max reconnection attempts (${this.options.maxReconnectAttempts}) reached. Giving up.`);
            this.isReconnecting = false;
            this.emit('reconnect_failed', error);
        } else {
            // Try again
            this.isReconnecting = false;
            this.attemptReconnect();
        }
    }

    /**
     * Handles a connection event
     */
    handleConnect() {
        log(1, 'Connected to the server');
        this.reconnectAttempts = 0;
        this.startConnectionMonitoring();
        this.emit('connect');
    }

    /**
     * Handles an error event
     * @param {Error} error - The error that occurred
     */
    handleError(error) {
        log(2, `WebSocket error: ${error.message}`);
        this.emit('error', error);
    }

    /**
     * Resubscribes to channels and re-authenticates
     */
    async resubscribe() {
        try {
            // Get the current game ID from the socket or local storage
            const gameId = this.socket.gameId || localStorage.getItem('currentGameId');
            const playerId = this.socket.playerId || localStorage.getItem('playerId');
            const sessionId = this.socket.sessionId || localStorage.getItem('sessionId');
            
            if (gameId && playerId && sessionId) {
                log(1, `Rejoining game ${gameId} as player ${playerId}`);
                
                // Rejoin the game room
                await this.socket.emitWithAck('rejoin_game', {
                    gameId,
                    playerId,
                    sessionId
                });
                
                // Request the current game state
                this.socket.emit('request_game_state', { gameId });
            }
        } catch (error) {
            log(2, `Error during resubscription: ${error.message}`);
            throw error;
        }
    }

    /**
     * Resends any pending messages that were queued during disconnection
     */
    resendPendingMessages() {
        if (this.pendingMessages.length === 0) return;
        
        log(1, `Resending ${this.pendingMessages.length} pending messages`);
        
        // Send all pending messages
        while (this.pendingMessages.length > 0) {
            const { event, args, callback } = this.pendingMessages.shift();
            try {
                if (callback) {
                    this.socket.emit(event, ...args, callback);
                } else {
                    this.socket.emit(event, ...args);
                }
            } catch (error) {
                log(2, `Error resending message ${event}: ${error.message}`);
            }
        }
    }

    /**
     * Queues a message to be sent when the connection is restored
     * @param {string} event - The event name
     * @param {Array} args - The message arguments
     * @param {Function} [callback] - Optional callback
     */
    queueMessage(event, args, callback) {
        this.pendingMessages.push({ event, args, callback });
        
        // If queue is getting too large, remove oldest messages
        const MAX_QUEUE_SIZE = 50;
        if (this.pendingMessages.length > MAX_QUEUE_SIZE) {
            this.pendingMessages.shift();
        }
    }

    /**
     * Wrapper for socket.emit that handles reconnection
     * @param {string} event - The event name
     * @param  {...any} args - The message arguments
     */
    emit(event, ...args) {
        // Handle special events
        if (event === 'disconnect') {
            return this.socket.disconnect();
        }
        
        // If socket is connected, send immediately
        if (this.socket.connected) {
            return this.socket.emit(event, ...args);
        }
        
        // If we're trying to reconnect, queue the message
        if (this.isReconnecting) {
            log(1, `Queueing message (${event}) - waiting for reconnection`);
            
            // Check if the last argument is a callback
            const lastArg = args[args.length - 1];
            const callback = typeof lastArg === 'function' ? args.pop() : null;
            
            this.queueMessage(event, args, callback);
            return;
        }
        
        // Otherwise, try to reconnect and then send
        log(1, `Socket not connected, attempting to send message (${event}) after reconnection`);
        
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
            args[args.length - 1] = (...response) => {
                callback(...response);
            };
        }
        
        this.queueMessage(event, args, callback);
        this.attemptReconnect();
    }

    /**
     * Disposes of the reconnection handler
     */
    dispose() {
        this.stopConnectionMonitoring();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        // Remove event listeners
        this.socket.off('disconnect', this.handleDisconnect);
        this.socket.off('connect', this.handleConnect);
        this.socket.off('error', this.handleError);
        this.socket.off('pong', this.handlePong);
        
        // Clear pending messages
        this.pendingMessages = [];
    }
}

// Add EventEmitter methods to the prototype
['on', 'once', 'off', 'emit'].forEach(method => {
    ReconnectionHandler.prototype[method] = function(...args) {
        this.socket[method](...args);
        return this;
    };
});

export default ReconnectionHandler;
