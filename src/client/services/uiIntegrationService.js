import { log } from '../../utils/logger.js';
import { GAME_EVENTS } from '../../config/constants.js';

export class UIIntegrationService {
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
     * Initialize the UI integration service
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
     * Initialize UI components and event listeners
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
     * Handle game state changes
     * @param {Object} state - The new game state
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
     * Handle connection status changes
     * @param {Object} status - Connection status object
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
     * Update the game board based on the current state
     * @param {Object} state - The current game state
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
     * Update player information display
     * @param {Object} state - The current game state
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
     * Handle UI updates based on game phase
     * @param {Object} state - The current game state
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
     * Handle lobby phase UI
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
     * Handle dealing phase UI
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
     * Handle bidding phase UI
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
     * Handle playing phase UI
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
     * Handle game over UI
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
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (info, success, warning, error)
     * @param {number} duration - How long to show the toast in ms (default: 3000)
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
     * Add CSS styles for UI components
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
     * Check if the current user can start the game
     */
    canStartGame(state) {
        // Implementation depends on your game's rules
        // This is a placeholder - implement according to your requirements
        return Object.keys(state.players || {}).length >= 2;
    }
    
    /**
     * Check if it's the current user's turn
     */
    isMyTurn(state) {
        // Implementation depends on how you track the current user
        // This is a placeholder - implement according to your requirements
        return state.currentPlayer === this.stateSyncService.getCurrentPlayerId();
    }
    
    /**
     * Calculate game statistics
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
     * Clean up resources
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

export function createUIIntegrationService(stateSyncService, gameUI) {
    if (!instance) {
        instance = new UIIntegrationService(stateSyncService, gameUI);
        instance.initialize();
    }
    return instance;
}

export default UIIntegrationService;
