import { log } from '../../utils/logger.js';
import { GAME_EVENTS } from '../../config/constants.js';

/**
 * @class UIIntegrationService
 * @description Service responsible for integrating game state updates with the UI.
 * It subscribes to state changes from StateSyncService and calls appropriate methods
 * on the gameUI object to render updates. It also manages UI elements like
 * connection status indicators and toast notifications.
 */
export class UIIntegrationService {
    /**
     * Creates an instance of UIIntegrationService.
     * @param {import('./stateSyncService.js').StateSyncService} stateSyncService - The state synchronization service.
     * @param {object} gameUI - The main UI object containing methods to update the game's visual representation.
     * This object is expected to have methods like `updateBoard`, `updateHands`, `showLobby`, etc.
     * @memberof UIIntegrationService
     */
    constructor(stateSyncService, gameUI) {
        this.stateSyncService = stateSyncService;
        this.gameUI = gameUI;
        this.connectionToast = null;
        this.isInitialized = false;
        
        // Bind methods
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleConnectionStatus = this.handleConnectionStatus.bind(this);
        this.showToast = this.showToast.bind(this);
    }
    
    /**
     * Initializes the UIIntegrationService.
     * Subscribes to state and connection status changes from StateSyncService.
     * Calls `initializeUI` to set up necessary DOM elements and styles.
     * This method should be called once when the service is created.
     * @memberof UIIntegrationService
     */
    initialize() {
        if (this.isInitialized) return;
        
        // Subscribe to state changes
        this.stateSyncService.subscribe('stateChange', this.handleStateChange);
        
        // Subscribe to connection status changes
        this.stateSyncService.subscribe('connectionStatus', this.handleConnectionStatus);
        
        // Initialize UI components
        this.initializeUI();
        
        this.isInitialized = true;
        log(1, 'UIIntegrationService initialized');
    }
    
    /**
     * Initializes core UI components managed by this service, such as
     * the connection status indicator and toast notification container.
     * Also adds necessary CSS styles to the document head.
     * @memberof UIIntegrationService
     * @private
     */
    initializeUI() {
        // Create connection status indicator
        this.connectionIndicator = document.createElement('div');
        this.connectionIndicator.className = 'connection-indicator';
        document.body.appendChild(this.connectionIndicator);
        
        // Create toast container
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
        
        // Add CSS for UI components
        this.addStyles();
    }
    
    /**
     * Handles game state changes received from StateSyncService.
     * Triggers updates to the game board, player information, and phase-specific UI elements.
     * @param {object} state - The new game state.
     * @memberof UIIntegrationService
     * @private
     */
    handleStateChange(state) {
        if (!state) return;
        
        // Update game board
        this.updateGameBoard(state);
        
        // Update player information
        this.updatePlayerInfo(state);
        
        // Show appropriate UI based on game phase
        this.handleGamePhase(state);
    }
    
    /**
     * Handles connection status changes received from StateSyncService.
     * Updates the visual connection indicator and shows toast notifications
     * for connection status (e.g., disconnected, reconnecting, reconnected).
     * @param {object} status - Connection status object.
     * @param {boolean} status.isConnected - Whether the client is currently connected.
     * @param {boolean} status.isReconnecting - Whether the client is attempting to reconnect.
     * @param {string} [status.lastError] - Description of the last connection error, if any.
     * @memberof UIIntegrationService
     * @private
     */
    handleConnectionStatus(status) {
        const { isConnected, isReconnecting, lastError } = status;
        
        // Update connection indicator
        this.connectionIndicator.className = `connection-indicator ${isConnected ? 'connected' : 'disconnected'}`;
        this.connectionIndicator.title = isConnected 
            ? 'Connected to server' 
            : `Disconnected: ${lastError || 'No connection'}`;
        
        // Show connection status to user
        if (isReconnecting) {
            this.showToast('Reconnecting to server...', 'info');
        } else if (!isConnected) {
            this.showToast('Connection lost. Attempting to reconnect...', 'warning');
        } else if (lastError) {
            this.showToast('Reconnected successfully', 'success');
        }
    }
    
    /**
     * Updates the main game board UI using methods from the `gameUI` object.
     * This typically includes rendering cards, scores, and player hands.
     * @param {object} state - The current game state.
     * @memberof UIIntegrationService
     * @private
     */
    updateGameBoard(state) {
        // Update game board UI
        if (this.gameUI.updateBoard) {
            this.gameUI.updateBoard(state);
        }
        
        // Update player hands
        if (state.players && this.gameUI.updateHands) {
            this.gameUI.updateHands(state.players, state.currentPlayer);
        }
        
        // Update scores
        if (state.scores && this.gameUI.updateScores) {
            this.gameUI.updateScores(state.scores);
        }
    }
    
    /**
     * Updates the display of player-specific information, such as current player indicator,
     * dealer status, and other player details, using methods from the `gameUI` object.
     * @param {object} state - The current game state.
     * @memberof UIIntegrationService
     * @private
     */
    updatePlayerInfo(state) {
        if (!state.players || !this.gameUI.updatePlayerInfo) return;
        
        // Update current player indicator
        this.gameUI.updatePlayerInfo({
            currentPlayer: state.currentPlayer,
            dealer: state.dealer,
            players: state.players
        });
    }
    
    /**
     * Directs UI updates based on the current game phase (e.g., LOBBY, DEALING, BIDDING).
     * Calls specific handler methods for each phase.
     * @param {object} state - The current game state.
     * @memberof UIIntegrationService
     * @private
     */
    handleGamePhase(state) {
        if (!state.gamePhase) return;
        
        switch (state.gamePhase) {
            case 'LOBBY':
                this.handleLobbyPhase(state);
                break;
            case 'DEALING':
                this.handleDealingPhase(state);
                break;
            case 'BIDDING':
                this.handleBiddingPhase(state);
                break;
            case 'PLAYING':
                this.handlePlayingPhase(state);
                break;
            case 'GAME_OVER':
                this.handleGameOver(state);
                break;
            default:
                log(2, `Unknown game phase: ${state.gamePhase}`);
        }
    }
    
    /**
     * Handles UI updates specific to the LOBBY game phase.
     * Typically involves showing the lobby screen with player lists and start game options.
     * @param {object} state - The current game state.
     * @memberof UIIntegrationService
     * @private
     */
    handleLobbyPhase(state) {
        if (this.gameUI.showLobby) {
            this.gameUI.showLobby({
                players: state.players || {},
                canStart: this.canStartGame(state)
            });
        }
    }
    
    /**
     * Handles UI updates specific to the DEALING game phase.
     * May show animations or indicators related to card dealing.
     * @param {object} state - The current game state.
     * @memberof UIIntegrationService
     * @private
     */
    handleDealingPhase(state) {
        if (this.gameUI.showDealing) {
            this.gameUI.showDealing({
                dealer: state.dealer,
                cardsDealt: state.cardsDealt || 0
            });
        }
    }
    
    /**
     * Handles UI updates specific to the BIDDING game phase.
     * Shows bidding options, current bids, and the up-card.
     * @param {object} state - The current game state.
     * @memberof UIIntegrationService
     * @private
     */
    handleBiddingPhase(state) {
        if (this.gameUI.showBidding) {
            this.gameUI.showBidding({
                currentPlayer: state.currentPlayer,
                dealer: state.dealer,
                upCard: state.upCard,
                bids: state.bids || {}
            });
        }
    }
    
    /**
     * Handles UI updates specific to the PLAYING game phase.
     * Displays the current trick, trump suit, and indicates whose turn it is.
     * @param {object} state - The current game state.
     * @memberof UIIntegrationService
     * @private
     */
    handlePlayingPhase(state) {
        if (this.gameUI.showPlaying) {
            this.gameUI.showPlaying({
                currentPlayer: state.currentPlayer,
                trick: state.currentTrick || [],
                trumpSuit: state.trumpSuit,
                isMyTurn: this.isMyTurn(state)
            });
        }
    }
    
    /**
     * Handles UI updates specific to the GAME_OVER game phase.
     * Displays game results, scores, and potentially options for a new game.
     * @param {object} state - The current game state.
     * @memberof UIIntegrationService
     * @private
     */
    handleGameOver(state) {
        if (this.gameUI.showGameOver) {
            this.gameUI.showGameOver({
                winner: state.winner,
                scores: state.scores,
                gameStats: this.calculateGameStats(state)
            });
        }
    }
    
    /**
     * Displays a toast notification message on the UI.
     * @param {string} message - The message to display in the toast.
     * @param {'info'|'success'|'warning'|'error'} [type='info'] - The type of toast, determining its appearance.
     * @param {number} [duration=3000] - How long the toast should be visible in milliseconds.
     * @memberof UIIntegrationService
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        // Remove toast after duration
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (this.toastContainer.contains(toast)) {
                    this.toastContainer.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    /**
     * Adds CSS styles required for the connection indicator and toast notifications
     * to the document's head.
     * @memberof UIIntegrationService
     * @private
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Connection indicator */
            .connection-indicator {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                z-index: 1000;
                transition: background-color 0.3s;
            }
            
            .connection-indicator.connected {
                background-color: #4caf50; /* Green */
                box-shadow: 0 0 10px #4caf50;
            }
            
            .connection-indicator.disconnected {
                background-color: #f44336; /* Red */
                box-shadow: 0 0 10px #f44336;
            }
            
            /* Toast notifications */
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 300px;
            }
            
            .toast {
                padding: 12px 20px;
                margin-bottom: 10px;
                border-radius: 4px;
                color: white;
                opacity: 0.95;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                animation: slideIn 0.3s ease-out;
                transition: opacity 0.3s;
            }
            
            .toast.fade-out {
                opacity: 0;
            }
            
            .toast-info {
                background-color: #2196f3; /* Blue */
            }
            
            .toast-success {
                background-color: #4caf50; /* Green */
            }
            
            .toast-warning {
                background-color: #ff9800; /* Orange */
            }
            
            .toast-error {
                background-color: #f44336; /* Red */
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 0.95;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Placeholder method to determine if the current user can start the game.
     * Actual implementation will depend on game-specific rules (e.g., number of players).
     * @param {object} state - The current game state.
     * @returns {boolean} True if the game can be started, false otherwise.
     * @memberof UIIntegrationService
     * @private
     */
    canStartGame(state) {
        // Implementation depends on your game's rules
        // This is a placeholder - implement according to your requirements
        return Object.keys(state.players || {}).length >= 2;
    }
    
    /**
     * Placeholder method to determine if it is the current client's player's turn.
     * Actual implementation depends on how the current player is identified in the state
     * and how the client's own player ID is retrieved (likely from StateSyncService or StateService).
     * @param {object} state - The current game state.
     * @returns {boolean} True if it's the current user's turn, false otherwise.
     * @memberof UIIntegrationService
     * @private
     */
    isMyTurn(state) {
        // Implementation depends on how you track the current user
        // This is a placeholder - implement according to your requirements
        return state.currentPlayer === this.stateSyncService.getCurrentPlayerId(); // Assuming StateSyncService has such a method
    }
    
    /**
     * Placeholder method to calculate game statistics from the game state.
     * Actual implementation will depend on what statistics are relevant to the game.
     * @param {object} state - The current game state.
     * @returns {object} An object containing calculated game statistics.
     * @memberof UIIntegrationService
     * @private
     */
    calculateGameStats(state) {
        // Implementation depends on what stats you want to track
        // This is a placeholder - implement according to your requirements
        return {
            totalTricks: state.tricks ? state.tricks.length : 0,
            // Add more stats as needed
        };
    }
    
    /**
     * Cleans up resources used by the UIIntegrationService.
     * Unsubscribes from StateSyncService events and removes DOM elements
     * created by this service (connection indicator, toast container).
     * @memberof UIIntegrationService
     */
    destroy() {
        // Remove event listeners
        this.stateSyncService.unsubscribe('stateChange', this.handleStateChange);
        this.stateSyncService.unsubscribe('connectionStatus', this.handleConnectionStatus);
        
        // Clean up DOM elements
        if (this.connectionIndicator && this.connectionIndicator.parentNode) {
            this.connectionIndicator.parentNode.removeChild(this.connectionIndicator);
        }
        
        if (this.toastContainer && this.toastContainer.parentNode) {
            this.toastContainer.parentNode.removeChild(this.toastContainer);
        }
        
        this.isInitialized = false;
    }
}

// Export a singleton instance
let instance = null;

/**
 * Creates and returns a singleton instance of UIIntegrationService.
 * If an instance already exists, it returns that instance.
 * Initializes the service upon first creation.
 * @param {import('./stateSyncService.js').StateSyncService} stateSyncService - The state synchronization service.
 * @param {object} gameUI - The main UI object.
 * @returns {UIIntegrationService} The singleton instance of UIIntegrationService.
 */
export function createUIIntegrationService(stateSyncService, gameUI) {
    if (!instance) {
        instance = new UIIntegrationService(stateSyncService, gameUI);
        instance.initialize();
    }
    return instance;
}

export default UIIntegrationService;
