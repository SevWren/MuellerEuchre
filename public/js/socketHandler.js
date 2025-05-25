/**
 * @file Socket Handler for Euchre Multiplayer
 * @module SocketHandler
 * @description Handles all client-side socket.io communications for the Euchre game,
 * managing game state synchronization, player actions, and real-time UI updates.
 * 
 * @example
 * // Basic usage:
 * // The SocketHandler initializes automatically when the page loads
 * // Access the instance via window.socketHandler
 * 
 * @example
 * // Making a move:
 * socketHandler.playCard('AH'); // Play Ace of Hearts
 * 
 * @example
 * // Making a bid:
 * socketHandler.makeBid('PASS'); // Pass the bid
 * 
 * @see {@link https://socket.io/} for socket.io documentation
 * @see {@link https://en.wikipedia.org/wiki/Euchre} for Euchre game rules
 */

/**
 * Main class for managing all client-side game communication and state.
 * 
 * This class is responsible for:
 * - Establishing and maintaining WebSocket connection to the game server
 * - Managing game state and player information
 * - Handling user interactions and translating them to server events
 * - Updating the UI based on game state changes
 * - Managing game flow and turn-based mechanics
 * 
 * @class SocketHandler
 * @property {Socket} socket - The socket.io client instance
 * @property {Object|null} gameState - Current game state received from server
 * @property {string|null} playerId - Current player's unique identifier
 * @property {string|null} role - Current player's role ('PLAYER_1' to 'PLAYER_4')
 * @property {Object} uiElements - Cached DOM elements for better performance
 * @property {boolean} isConnected - Connection status flag
 * 
 * @listens connect - Fired when connection to server is established
 * @listens disconnect - Fired when connection to server is lost
 * @listens gameState - Fired when game state is updated
 * @listens error - Fired when a game or connection error occurs
 * 
 * @emits joinGame - When player joins the game
 * @emits playCard - When player plays a card
 * @emits makeBid - When player makes a bid
 * @emits newGame - When starting a new game
 */
class SocketHandler {
    /**
     * Creates a new SocketHandler instance.
     * Initializes socket connection and sets up all necessary event listeners.
     * 
     * @constructor
     * @throws {Error} If socket.io is not loaded
     * 
     * @example
     * // Initialize a new game handler
     * const handler = new SocketHandler();
     * 
     * @listens document#DOMContentLoaded - Initializes the handler when page loads
     * @emits connect - When connection to server is established
     */
    constructor() {
        /** @private */
        this.socket = io();
        
        /** @type {Object|null} */
        this.gameState = null;
        
        /** @type {string|null} */
        this.playerId = null;
        
        /** @type {string|null} */
        this.role = null;
        
        /** @private @type {Object} */
        this.uiElements = {};
        
        // Initialize event listeners
        this.initializeEventListeners();
        this.initializeSocketEvents();
    }

    /**
     * Initializes all DOM event listeners for user interactions.
     * Sets up handlers for:
     * - Join game form submission
     * - Card clicks
     * - Bid actions (pass, order up, go alone, pick suit)
     * 
     * @private
     * @listens submit#joinForm - Handles player joining the game
     * @listens click - Delegated handler for card clicks
     * @listens click#passBtn - Handles pass bid action
     * @listens click#orderUpBtn - Handles order up bid action
     * @listens click#goAloneBtn - Handles go alone bid action
     * @listens click#pickSuitBtn - Handles suit selection for bid
     */
    initializeEventListeners() {
        // Join game form submission
        document.getElementById('joinForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const playerName = document.getElementById('playerName')?.value.trim() || 'Player';
            this.joinGame(playerName);
        });

        // Card click handler (delegated to document for dynamic elements)
        document.addEventListener('click', (e) => {
            const cardElement = e.target.closest('.card');
            if (cardElement && this.isMyTurn()) {
                this.playCard(cardElement.dataset.cardId);
            }
        });

        // Bid action handlers
        const bidHandlers = {
            'passBtn': () => this.makeBid('PASS'),
            'orderUpBtn': () => this.makeBid('ORDER_UP'),
            'goAloneBtn': () => this.makeBid('GO_ALONE'),
            'pickSuitBtn': () => {
                const suit = document.getElementById('suitSelector')?.value;
                if (suit) this.makeBid('PICK_SUIT', { suit });
            }
        };

        // Attach bid handlers
        Object.entries(bidHandlers).forEach(([id, handler]) => {
            document.getElementById(id)?.addEventListener('click', handler);
        });
    }

    /**
     * Initializes all socket.io event listeners.
     * Handles connection events and game-specific events from the server.
     * 
     * @private
     * @listens connect - Connection established with server
     * @listens disconnect - Connection lost with server
     * @listens connect_error - Error in connection
     * @listens gameState - Full game state update
     * @listens playerJoined - New player joined the game
     * @listens playerLeft - Player left the game
     * @listens cardPlayed - A card was played by a player
     * @listens trickWon - A trick was won by a player
     * @listens handStarted - A new hand has started
     * @listens gameOver - The game has ended
     */
    initializeSocketEvents() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.playerId = this.socket.id;
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.showMessage('Connection error. Please check your network connection.', 'error');
        });

        // Game state updates
        this.socket.on('gameState', (gameState) => {
            this.gameState = gameState;
            this.updateUI(gameState);
        });

        // Player events
        this.socket.on('playerJoined', (data) => {
            this.showMessage(`${data.player.name} joined as ${data.player.role}`);
            this.updatePlayerList(data);
        });

        this.socket.on('playerLeft', (data) => {
            this.showMessage(`${data.player.name} left the game`);
            this.updatePlayerList(data);
        });

        // Game action events
        this.socket.on('cardPlayed', (data) => {
            this.showMessage(`${data.playerName} played ${this.formatCard(data.card)}`);
            this.updateTrickDisplay(data.card, data.playerRole);
        });

        this.socket.on('trickWon', (data) => {
            this.showMessage(`${data.winnerName} won the trick!`);
            this.updateScoreDisplay(data.scores);
        });

        this.socket.on('handStarted', (data) => {
            this.showMessage(`New hand started. Dealer: ${data.dealerName}, Trump: ${data.trumpSuit}`);
            this.updateHandDisplay(data);
        });

        this.socket.on('gameOver', (data) => {
            this.showMessage(`Game over! ${data.winningTeam} wins ${data.score}-${data.opponentScore}!`);
            this.showGameOverModal(data);
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('Game error:', error);
            this.showMessage(`Error: ${error.message || 'An error occurred'}`, 'error');
        });
    }

    /**
     * Join the game with a player name
     * @param {string} playerName - The name of the player
     */
    /**
     * Joins the game with the specified player name.
     * Validates the name and emits a 'joinGame' event to the server.
     * 
     * @param {string} playerName - The name to join with (will be trimmed)
     * @returns {boolean} True if join request was sent, false if validation failed
     * @throws {Error} If playerName is empty or too long
     * @fires Socket#joinGame - Emits join request to server
     * @emits error - If player name is invalid
     * 
     * @example
     * // Join the game with a player name
     * const success = socketHandler.joinGame('Alice');
     * if (!success) {
     *   console.error('Failed to join game');
     * }
     * 
     * @see #handleGameState - Handles the game state after joining
     */
    joinGame(playerName) {
        this.socket.emit('joinGame', { name: playerName }, (response) => {
            if (response.error) {
                this.showMessage(response.error, 'error');
                return;
            }
            this.role = response.role;
            this.showMessage(`Joined as ${playerName} (${response.role})`, 'success');
            this.toggleGameLobby(false);
        });
    }

    /**
     * Play a card from the player's hand
     * @param {string} cardId - The ID of the card to play
     */
    /**
     * Attempts to play a card from the player's hand.
     * Validates the move is allowed before sending to server.
     * 
     * @param {string} cardId - The ID of the card to play (e.g., 'AH' for Ace of Hearts)
     * @returns {boolean} True if the card play was attempted, false if validation failed
     * @throws {Error} If it's not the player's turn, card is invalid, or game is not in play
     * @fires Socket#playCard - Emits card play to server
     * @emits error - If the move is invalid
     * 
     * @example
     * // Play the Ace of Hearts
     * try {
     *   const success = socketHandler.playCard('AH');
     *   if (!success) {
     *     console.log('Cannot play that card now');
     *   }
     * } catch (error) {
     *   console.error('Error playing card:', error.message);
     * }
     * 
     * @see #isMyTurn - Checks if it's the player's turn
     * @see #updateUI - Updates the UI after card is played
     */
    playCard(cardId) {
        if (!this.isMyTurn()) return;
        
        this.socket.emit('playCard', { cardId }, (response) => {
            if (response.error) {
                this.showMessage(response.error, 'error');
            }
        });
    }

    /**
     * Make a bid (pass, order up, etc.)
     * @param {string} bidType - The type of bid (e.g., 'PASS', 'ORDER_UP')
     * @param {Object} [options] - Additional options for the bid
     */
    /**
     * Makes a bid action (pass, order up, go alone, or pick suit).
     * Validates the bid before sending to server.
     * 
     * @param {'PASS'|'ORDER_UP'|'GO_ALONE'|'PICK_SUIT'} bidType - Type of bid
     * @param {Object} [options={}] - Additional options for the bid
     * @param {'hearts'|'diamonds'|'clubs'|'spades'} [options.suit] - Required for PICK_SUIT bid type
     * @returns {boolean} True if bid was attempted, false if validation failed
     * @throws {Error} If bid is invalid, not allowed, or missing required options
     * @fires Socket#makeBid - Emits bid to server
     * @emits error - If the bid is invalid
     * 
     * @example
     * // Make a pass bid during bidding phase
     * socketHandler.makeBid('PASS');
     * 
     * @example
     * // Select a suit after winning the bid
     * socketHandler.makeBid('PICK_SUIT', { suit: 'hearts' });
     * 
     * @see #isMyTurn - Checks if it's the player's turn to bid
     * @see #updateUI - Updates the UI after bid is made
     * 
     * @description
     * Valid bid types:
     * - 'PASS': Decline to bid
     * - 'ORDER_UP': Accept the face-up card as trump
     * - 'GO_ALONE': Play the hand without partner
     * - 'PICK_SUIT': Choose a trump suit (requires options.suit)
     */
    makeBid(bidType, options = {}) {
        this.socket.emit('makeBid', { bidType, ...options }, (response) => {
            if (response.error) {
                this.showMessage(response.error, 'error');
            }
        });
    }

    /**
     * Determines if it's currently the player's turn.
     * 
     * @returns {boolean} True if it's the current player's turn, false otherwise
     * @example
     * if (socketHandler.isMyTurn()) {
     *   // Enable card selection
     *   enableCardSelection();
     * }
     */
    isMyTurn() {
        if (!this.gameState || !this.role) return false;
        return this.gameState.currentPlayer === this.role;
    }

    /**
     * Updates the entire UI based on the current game state.
     * Coordinates updates to all UI components.
     * 
     * @param {Object} gameState - The current game state from the server
     * @example
     * // Called when receiving a game state update from server
     * socket.on('gameState', (gameState) => {
     *   socketHandler.updateUI(gameState);
     * });
     */
    updateUI(gameState) {
        this.updatePlayerInfo(gameState);
        this.updateGameBoard(gameState);
        this.updateControls(gameState);
    }

    /**
     * Updates the player information display including names, scores, and roles.
     * 
     * @param {Object} gameState - The current game state
     * @private
     * @example
     * // Updates player info when game state changes
     * updatePlayerInfo({
     *   players: {
     *     PLAYER_1: { name: 'Alice', score: 3 },
     *     PLAYER_2: { name: 'Bob', score: 2 }
     *   },
     *   // ... other game state
     * });
     */
    updatePlayerInfo(gameState) {
        // Update player cards, scores, etc.
        const playerElements = document.querySelectorAll('.player');
        
        playerElements.forEach(playerEl => {
            const role = playerEl.dataset.role;
            const player = gameState.players[role];
            
            if (player) {
                // Update name and score
                const nameEl = playerEl.querySelector('.player-name');
                const scoreEl = playerEl.querySelector('.player-score');
                
                if (nameEl) nameEl.textContent = player.name || role;
                if (scoreEl) scoreEl.textContent = player.score || 0;
                
                // Highlight current player
                playerEl.classList.toggle('current-player', gameState.currentPlayer === role);
                
                // Update cards in hand (for the current player)
                if (role === this.role && player.hand) {
                    this.updatePlayerHand(player.hand);
                }
            }
        });
    }

    /**
     * Updates the main game board including the trick area and game messages.
     * 
     * @param {Object} gameState - The current game state
     * @private
     * @example
     * // Updates the game board with current trick and messages
     * updateGameBoard({
     *   trick: {
     *     cards: [
     *       { code: 'AH', player: 'PLAYER_1' },
     *       { code: 'KH', player: 'PLAYER_2' }
     *     ],
     *     leader: 'PLAYER_1'
     *   },
     *   // ... other game state
     * });
     */
    updateGameBoard(gameState) {
        // Update trump suit display
        if (gameState.trumpSuit) {
            const trumpEl = document.querySelector('.trump-suit');
            if (trumpEl) trumpEl.textContent = gameState.trumpSuit;
        }
        
        // Update current trick display
        if (gameState.currentTrick) {
            this.updateTrickDisplay(gameState.currentTrick);
        }
        
        // Update score display
        if (gameState.scores) {
            this.updateScoreDisplay(gameState.scores);
        }
    }

    /**
     * Updates the display of the player's hand.
     * 
     * @param {Array<Object>} hand - Array of card objects in the player's hand
     * @private
     * @example
     * // Updates the player's hand with current cards
     * updatePlayerHand([
     *   { code: 'AH', suit: 'HEARTS', value: 'ACE' },
     *   { code: 'KH', suit: 'HEARTS', value: 'KING' },
     *   // ... other cards
     * ]);
     */
    updatePlayerHand(hand) {
        const handEl = document.querySelector('.player-hand');
        if (!handEl) return;
        
        handEl.innerHTML = hand.map(card => `
            <div class="card" data-card-id="${card.id}">
                <span class="card-rank">${card.rank}</span>
                <span class="card-suit">${this.getSuitSymbol(card.suit)}</span>
            </div>
        `).join('');
    }

    /**
     * Updates the display of the current trick being played.
     * Shows all cards played in the current trick with player indicators.
     * 
     * @param {Object} trick - The current trick state
     * @param {Object} trick.cards - Object mapping player roles to their played cards
     * @param {string} [trick.leader] - The player who led the trick
     * @private
     * @example
     * // Updates the trick display with two played cards
     * updateTrickDisplay({
     *   cards: {
     *     PLAYER_1: { code: 'AH', suit: 'HEARTS', rank: 'A' },
     *     PLAYER_2: { code: 'KH', suit: 'HEARTS', rank: 'K' }
     *   },
     *   leader: 'PLAYER_1'
     * });
     */
    updateTrickDisplay(trick) {
        const trickEl = document.querySelector('.current-trick');
        if (!trickEl) return;
        
        trickEl.innerHTML = Object.entries(trick.cards || {})
            .map(([playerRole, card]) => `
                <div class="trick-card" data-player="${playerRole}">
                    <div class="player-role">${playerRole}</div>
                    <div class="card">
                        <span class="card-rank">${card.rank}</span>
                        <span class="card-suit">${this.getSuitSymbol(card.suit)}</span>
                    </div>
                </div>
            `)
            .join('');
    }

    /**
     * Updates the score display for both teams.
     * 
     * @param {Object} scores - The current scores
     * @param {number} scores.team1 - Score for team 1
     * @param {number} scores.team2 - Score for team 2
     * @private
     * @example
     * // Updates the score display
     * updateScoreDisplay({
     *   team1: 3,
     *   team2: 5
     * });
     */
    updateScoreDisplay(scores) {
        const team1ScoreEl = document.querySelector('.team1-score');
        const team2ScoreEl = document.querySelector('.team2-score');
        
        if (team1ScoreEl) team1ScoreEl.textContent = scores.team1 || 0;
        if (team2ScoreEl) team2ScoreEl.textContent = scores.team2 || 0;
    }

    /**
     * Updates the game controls based on the current game state.
     * Enables/disables UI elements according to the current phase and player's turn.
     * 
     * @param {Object} gameState - The current game state
     * @private
     * @example
     * // Updates controls based on game state
     * updateControls({
     *   phase: 'PLAYING',
     *   currentPlayer: 'PLAYER_1',
     *   trick: { cards: [], leader: 'PLAYER_1' }, // Example trick data
     *   // ... other game state
     * });
     */
    updateControls(gameState) {
        const isMyTurn = this.isMyTurn();
        const isBiddingPhase = gameState.phase === 'BIDDING';
        
        // Enable/disable card controls based on turn
        document.querySelectorAll('.card').forEach(cardEl => {
            cardEl.style.opacity = isMyTurn ? '1' : '0.5';
            cardEl.style.cursor = isMyTurn ? 'pointer' : 'not-allowed';
        });
        
        // Show/hide bidding controls
        const biddingControls = document.querySelector('.bidding-controls');
        const playingControls = document.querySelector('.playing-controls');
        
        if (biddingControls) {
            biddingControls.style.display = isBiddingPhase ? 'block' : 'none';
        }
        
        if (playingControls) {
            playingControls.style.display = isBiddingPhase ? 'none' : 'block';
        }
        
        // Update button states
        this.updateButtonStates(gameState);
    }

    /**
     * Updates the state of all action buttons based on the current game state.
     * Controls the visibility and enabled state of bid, play, and other action buttons.
     * 
     * @param {Object} gameState - The current game state
     * @private
     * @example
     * // Updates button states for bidding phase
     * updateButtonStates({
     *   phase: 'BIDDING',
     *   currentPlayer: 'PLAYER_1',
     *   // ... other game state
     * });
     */
    updateButtonStates(gameState) {
        const isMyTurn = this.isMyTurn();
        const canOrderUp = gameState.canOrderUp && isMyTurn;
        const canGoAlone = gameState.canGoAlone && isMyTurn;
        
        // Update bid buttons
        const passBtn = document.getElementById('passBtn');
        const orderUpBtn = document.getElementById('orderUpBtn');
        const goAloneBtn = document.getElementById('goAloneBtn');
        
        if (passBtn) passBtn.disabled = !isMyTurn;
        if (orderUpBtn) orderUpBtn.disabled = !canOrderUp;
        if (goAloneBtn) goAloneBtn.disabled = !canGoAlone;
    }

    /**
     * Toggles the visibility of the game lobby.
     * 
     * @param {boolean} show - Whether to show the lobby
     * @private
     * @example
     * // Show the game lobby
     * toggleGameLobby(true);
     * 
     * // Hide the game lobby
     * toggleGameLobby(false);
     */
    toggleGameLobby(show) {
        const lobbyEl = document.getElementById('lobby');
        const gameEl = document.getElementById('game');
        
        if (lobbyEl) lobbyEl.style.display = show ? 'block' : 'none';
        if (gameEl) gameEl.style.display = show ? 'none' : 'block';
    }

    /**
     * Updates the connection status indicator in the UI.
     * 
     * @param {boolean} connected - Whether the client is connected to the server
     * @private
     * @example
     * // Update UI to show connection status
     * updateConnectionStatus(true);  // Connected
     * updateConnectionStatus(false); // Disconnected
     */
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;
        
        statusEl.textContent = connected ? 'Connected' : 'Disconnected';
        statusEl.className = connected ? 'connected' : 'disconnected';
    }

    /**
     * Displays a message to the player with appropriate styling based on type.
     * 
     * @param {string} message - The message text to display
     * @param {'info'|'success'|'error'} [type='info'] - The type of message
     * @private
     * @example
     * // Show different types of messages
     * showMessage('Game starting!', 'success');
     * showMessage('Cannot play that card', 'error');
     * showMessage('Waiting for other players...'); // Defaults to 'info'
     */
    showMessage(message, type = 'info') {
        const messagesEl = document.querySelector('.messages');
        if (!messagesEl) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        messagesEl.appendChild(messageEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        
        // Auto-remove message after delay
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    /**
     * Formats a card object into a human-readable string.
     * 
     * @param {Object} card - The card to format
     * @param {string} card.rank - The card rank (e.g., 'A', 'K', 'Q', 'J', '10')
     * @param {string} card.suit - The card suit (e.g., 'HEARTS', 'DIAMONDS')
     * @returns {string} Formatted card string (e.g., 'A♥', 'K♦')
     * @private
     * @example
     * // Format different cards
     * formatCard({ rank: 'A', suit: 'HEARTS' });   // Returns 'A♥'
     * formatCard({ rank: '10', suit: 'CLUBS' });   // Returns '10♣'
     */
    formatCard(card) {
        if (!card) return 'unknown card';
        return `${card.rank}${this.getSuitSymbol(card.suit)}`;
    }

    /**
     * Converts a suit name to its corresponding symbol.
     * 
     * @param {string} suit - The suit name (e.g., 'HEARTS', 'DIAMONDS')
     * @returns {string} The corresponding symbol (♥, ♦, ♣, ♠)
     * @private
     * @example
     * // Get suit symbols
     * getSuitSymbol('HEARTS');   // Returns '♥'
     * getSuitSymbol('SPADES');   // Returns '♠'
     */
    getSuitSymbol(suit) {
        const symbols = {
            'HEARTS': '♥',
            'DIAMONDS': '♦',
            'CLUBS': '♣',
            'SPADES': '♠'
        };
        return symbols[suit] || suit[0] || '?';
    }

    /**
     * Displays the game over modal with final scores and winner information.
     * 
     * @param {Object} data - Game over data
     * @param {string} data.winner - The winning team
     * @param {number} data.team1Score - Final score for team 1
     * @param {number} data.team2Score - Final score for team 2
     * @param {string} [data.message] - Optional game over message
     * @private
     * @example
     * // Show game over modal
     * showGameOverModal({
     *   winner: 'Team 1',
     *   team1Score: 10,
     *   team2Score: 7,
     *   message: 'Congratulations to Team 1!'
     * });
     */
    showGameOverModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Game Over!</h2>
                <p>${data.winningTeam} wins ${data.score}-${data.opponentScore}!</p>
                <button id="newGameBtn">Play Again</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle new game button
        const newGameBtn = modal.querySelector('#newGameBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.socket.emit('newGame');
                modal.remove();
            });
        }
    }
}

// Initialize the socket handler when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.socketHandler = new SocketHandler();
});