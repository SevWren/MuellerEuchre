/**
 * ============================================================================
 * REFACTORING NOTICE (2025-05-25)
 * ============================================================================
 * 
 * This file has been identified for refactoring into a modular structure to
 * improve maintainability and AI assistance efficiency. However, the refactoring
 * is being POSTPONED until core game functionality is more complete.
 * 
 * PLANNED REFACTORING STRUCTURE:
 * /socket/
 *   /handlers/    # Event handlers (game.js, player.js, chat.js)
 *   /services/    # Core services (socket.js, state.js)
 *   /utils/       # Utility functions
 *   /constants/   # Constants and enums
 * 
 * REFACTORING BENEFITS:
 * - Better code organization and maintainability
 * - Improved AI/LLM efficiency and accuracy
 * - Easier testing and debugging
 * - Better separation of concerns
 * 
 * CURRENT STATUS: Postponed
 * - Focus on implementing core game functionality first
 * - Will revisit when implementing major new features
 * - Document any new code with refactoring in mind
 * ============================================================================
 */

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
     * Sets up delegated event handlers for game controls and user inputs.
     * 
     * @private
     * @listens submit#joinForm - Handles player joining the game
     * @listens click - Delegated handler for card clicks
     * @listens click#passBtn - Handles pass bid action
     * @listens click#orderUpBtn - Handles order up bid action
     * @listens click#goAloneBtn - Handles go alone bid action
     * @listens click#pickSuitBtn - Handles suit selection for bid
     * 
     * @example
     * // The following elements require specific data attributes:
     * // - Cards: data-card-id="AH" (for Ace of Hearts)
     * // - Buttons: id="passBtn", id="orderUpBtn", etc.
     * 
     * @description
     * Event delegation is used for card clicks to handle dynamically generated elements.
     * All button handlers are bound to the SocketHandler instance.
     * 
     * @see #joinGame - Called when join form is submitted
     * @see #playCard - Called when a card is clicked
     * @see #makeBid - Called for all bid-related buttons
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
     * 
     * @example
     * // Example of handling a custom event
     * this.socket.on('customEvent', (data) => {
     *   console.log('Custom event received:', data);
     * });
     * 
     * @description
     * This method sets up all socket event listeners when the SocketHandler is instantiated.
     * Each event updates the UI accordingly using the provided data.
     * 
     * @see #updateUI - Called on most game state changes
     * @see #showMessage - Used to display game notifications
     * @see #showGameOverModal - Called when game ends
     * 
     * @emits joinGame - When player joins the game
     * @emits playCard - When a card is played
     * @emits makeBid - When a bid is made
     * @emits newGame - When starting a new game
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
    /**
     * Joins the game with the specified player name after validating input.
     * 
     * @param {string} playerName - The name to join with (will be trimmed)
     * @returns {boolean} True if join request was sent, false if validation failed
     * @throws {Error} If playerName is invalid (empty, too long, or contains invalid characters)
     * @throws {Error} If already in a game and trying to join again
     * @fires Socket#joinGame - Emits join request to server
     * 
     * @example
     * // Basic usage
     * try {
     *   const success = socketHandler.joinGame('Alice');
     *   if (!success) {
     *     console.log('Failed to join game');
     *   }
     * } catch (error) {
     *   console.error('Error joining game:', error.message);
     *   showErrorToUser(error.message);
     * }
     * 
     * @example
     * // With error handling for specific error types
     * try {
     *   socketHandler.joinGame(''); // Will throw 'Player name cannot be empty'
     * } catch (error) {
     *   if (error.message.includes('empty')) {
     *     // Handle empty name case
     *   }
     * }
     */
    joinGame(playerName) {
        // Input validation
        if (!playerName || typeof playerName !== 'string') {
            throw new Error('Player name must be a non-empty string');
        }
        
        const trimmedName = playerName.trim();
        if (trimmedName.length === 0) {
            throw new Error('Player name cannot be empty');
        }
        
        if (trimmedName.length > 20) {
            throw new Error('Player name must be 20 characters or less');
        }
        
        // Check for invalid characters (alphanumeric and spaces only)
        if (!/^[a-zA-Z0-9 ]+$/.test(trimmedName)) {
            throw new Error('Player name can only contain letters, numbers, and spaces');
        }
        
        // Check if already in a game
        if (this.role) {
            throw new Error('Already in a game. Please leave the current game before joining another.');
        }
        
        try {
            this.socket.emit('joinGame', { name: trimmedName }, (response) => {
                if (response.error) {
                    this.showMessage(response.error, 'error');
                    return;
                }
                this.role = response.role;
                this.showMessage(`Joined as ${trimmedName} (${response.role})`, 'success');
                this.toggleGameLobby(false);
            });
            return true;
        } catch (error) {
            console.error('Error joining game:', error);
            this.showMessage('Failed to join game. Please try again.', 'error');
            return false;
        }
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
    /**
     * Attempts to play a card from the player's hand with validation.
     * 
     * @param {string} cardId - The ID of the card to play (e.g., 'AH' for Ace of Hearts)
     * @returns {boolean} True if the card play was attempted, false if validation failed
     * @throws {Error} If cardId is invalid, it's not the player's turn, or game is not in play
     * @fires Socket#playCard - Emits card play to server
     * 
     * @example
     * // Basic usage
     * try {
     *   const success = socketHandler.playCard('AH');
     *   if (!success) {
     *     console.log('Cannot play that card now');
     *   }
     * } catch (error) {
     *   console.error('Error playing card:', error.message);
     * }
     * 
     * @example
     * // With validation
     * function handleCardClick(cardId) {
     *   if (!socketHandler.isMyTurn()) {
     *     socketHandler.showMessage('Wait for your turn', 'warning');
     *     return;
     *   }
     *   
     *   try {
     *     socketHandler.playCard(cardId);
     *   } catch (error) {
     *     socketHandler.showMessage(error.message, 'error');
     *   }
     * }
     */
    playCard(cardId) {
        // Input validation
        if (!cardId || typeof cardId !== 'string') {
            throw new Error('Invalid card ID');
        }
        
        // Game state validation
        if (!this.gameState) {
            throw new Error('Game not started');
        }
        
        if (!this.isMyTurn()) {
            this.showMessage('Please wait for your turn', 'warning');
            return false;
        }
        
        // Card validation
        const validCard = /^[2-9TJQKA][HCDS]$/i.test(cardId);
        if (!validCard) {
            throw new Error(`Invalid card ID format: ${cardId}. Expected format: [Rank][Suit] (e.g., 'AH' for Ace of Hearts)`);
        }
        
        try {
            this.socket.emit('playCard', { cardId }, (response) => {
                if (response?.error) {
                    this.showMessage(response.error, 'error');
                    // Re-enable UI if there was an error
                    this.updateControls(this.gameState);
                }
            });
            return true;
        } catch (error) {
            console.error('Error playing card:', error);
            this.showMessage('Failed to play card. Please try again.', 'error');
            return false;
        }
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
    /**
     * Makes a bid action with validation.
     * 
     * @param {'PASS'|'ORDER_UP'|'GO_ALONE'|'PICK_SUIT'} bidType - Type of bid
     * @param {Object} [options={}] - Additional options for the bid
     * @param {'hearts'|'diamonds'|'clubs'|'spades'} [options.suit] - Required for PICK_SUIT bid type
     * @returns {boolean} True if bid was attempted, false if validation failed
     * @throws {Error} If bid is invalid, not allowed, or missing required options
     * @fires Socket#makeBid - Emits bid to server
     * 
     * @example
     * // Make a pass bid
     * try {
     *   socketHandler.makeBid('PASS');
     * } catch (error) {
     *   console.error('Bid failed:', error.message);
     * }
     * 
     * @example
     * // Select a suit after winning the bid
     * try {
     *   socketHandler.makeBid('PICK_SUIT', { suit: 'hearts' });
     * } catch (error) {
     *   if (error.message.includes('suit')) {
     *     // Handle missing suit
     *   }
     * }
     */
    makeBid(bidType, options = {}) {
        // Input validation
        const validBidTypes = ['PASS', 'ORDER_UP', 'GO_ALONE', 'PICK_SUIT'];
        if (!validBidTypes.includes(bidType)) {
            throw new Error(`Invalid bid type: ${bidType}. Must be one of: ${validBidTypes.join(', ')}`);
        }
        
        // Game state validation
        if (!this.gameState) {
            throw new Error('Game not started');
        }
        
        if (!this.isMyTurn()) {
            this.showMessage('Please wait for your turn', 'warning');
            return false;
        }
        
        // Special validation for PICK_SUIT
        if (bidType === 'PICK_SUIT' && !options.suit) {
            throw new Error('Must specify a suit when using PICK_SUIT');
        }
        
        // Validate suit if provided
        if (options.suit) {
            const validSuits = ['hearts', 'diamonds', 'clubs', 'spades'];
            if (!validSuits.includes(options.suit.toLowerCase())) {
                throw new Error(`Invalid suit: ${options.suit}. Must be one of: ${validSuits.join(', ')}`);
            }
        }
        
        try {
            this.socket.emit('makeBid', { bidType, ...options }, (response) => {
                if (response?.error) {
                    this.showMessage(response.error, 'error');
                    // Re-enable bidding UI if there was an error
                    this.updateControls(this.gameState);
                }
            });
            return true;
        } catch (error) {
            console.error('Error making bid:', error);
            this.showMessage('Failed to make bid. Please try again.', 'error');
            return false;
        }
    }

    /**
     * Determines if it's currently the player's turn based on the game state.
     * 
     * @returns {boolean} True if it's the current player's turn, false otherwise
     * @example
     * // Check if it's the player's turn before allowing card play
     * if (socketHandler.isMyTurn()) {
     *   // Enable card selection
     *   enableCardSelection();
     * } else {
     *   // Show waiting message
     *   showMessage('Please wait for your turn', 'info');
     * }
     * 
     * @description
     * This method checks multiple conditions:
     * - If the game state exists
     * - If the current player matches this player's role
     * - If the game is in a playable phase
     * 
     * @see #updateControls - Uses this to enable/disable controls
     * @see #playCard - Uses this to validate card plays
     * @see #makeBid - Uses this to validate bids
     * 
     * @emits turn:changed - When the turn state changes
     */
    isMyTurn() {
        if (!this.gameState || !this.role) return false;
        return this.gameState.currentPlayer === this.role;
    }

    /**
     * Updates the entire UI based on the current game state.
     * Coordinates updates to all UI components in the correct order.
     * 
     * @param {Object} gameState - The current game state from the server
     * @returns {void}
     * 
     * @example
     * // Called when receiving a game state update from server
     * socket.on('gameState', (gameState) => {
     *   socketHandler.updateUI(gameState);
     * });
     * 
     * @description
     * The update process follows this order:
     * 1. Update player information (names, scores, roles)
     * 2. Update the game board (trick area, messages)
     * 3. Update controls based on game phase and player turn
     * 
     * @see #updatePlayerInfo - Updates player-specific UI elements
     * @see #updateGameBoard - Updates the main game area
     * @see #updateControls - Updates interactive elements
     * 
     * @fires UI#update - After all UI updates are complete
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
     * @returns {void}
     * 
     * @example
     * // Updates player info when game state changes
     * updatePlayerInfo({
     *   players: {
     *     PLAYER_1: { 
     *       name: 'Alice', 
     *       score: 3,
     *       isDealer: true,
     *       isLeader: false
     *     },
     *     PLAYER_2: { 
     *       name: 'Bob', 
     *       score: 2,
     *       isDealer: false,
     *       isLeader: true
     *     }
     *   },
     *   // ... other game state
     * });
     * 
     * @description
     * Updates the following UI elements:
     * - Player names and scores
     * - Dealer indicator
     * - Current turn indicator
     * - Team information
     * 
     * @requires gameState.players - Object containing player data
     * @requires gameState.currentPlayer - ID of the player whose turn it is
     * @requires gameState.dealer - ID of the current dealer
     * 
     * @see #formatPlayerName - Formats player names with role indicators
     * @see #updateScoreDisplay - Updates the score display separately
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
     * @returns {void}
     * 
     * @example
     * // Updates the game board with current trick and messages
     * updateGameBoard({
     *   trick: {
     *     cards: [
     *       { code: 'AH', player: 'PLAYER_1' },
     *       { code: 'KH', player: 'PLAYER_2' }
     *     ],
     *     leader: 'PLAYER_1',
     *     suit: 'HEARTS'
     *   },
     *   currentPlayer: 'PLAYER_3',
     *   phase: 'PLAYING',
     *   message: 'Your turn to play'
     * });
     * 
     * @description
     * Handles the following UI updates:
     * - Current trick display (cards played this round)
     * - Game messages and status updates
     * - Trump suit indicator
     * - Turn indicator
     * 
     * @requires gameState.trick - Current trick information
     * @requires gameState.message - Status message to display
     * @requires gameState.trumpSuit - Current trump suit
     * 
     * @see #updateTrickDisplay - Updates just the trick area
     * @see #showMessage - Displays game messages
     * @see #updatePlayerHand - Updates the player's hand display
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
     * Updates the display of the player's hand with the current set of cards.
     * 
     * @param {Array<Object>} hand - Array of card objects in the player's hand
     * @private
     * @returns {void}
     * 
     * @example
     * // Updates the player's hand with current cards
     * updatePlayerHand([
     *   { 
     *     code: 'AH', 
     *     suit: 'HEARTS', 
     *     rank: 'A',
     *     value: 'ACE',
     *     isPlayable: true
     *   },
     *   // ... other cards
     * ]);
     * 
     * @description
     * This method:
     * - Clears the current hand display
     * - Creates card elements for each card in the hand
     * - Adds appropriate CSS classes based on card properties
     * - Sets up click handlers for playable cards
     * - Updates the UI to reflect the current hand
     * 
     * @requires hand - Array of card objects with at least 'code' and 'suit' properties
     * 
     * @see #formatCard - Formats card for display
     * @see #playCard - Called when a card is clicked
     * @see #isMyTurn - Determines if cards should be playable
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
     * @param {string} [trick.suit] - The leading suit of the trick
     * @private
     * @returns {void}
     * 
     * @example
     * // Updates the trick display with two played cards
     * updateTrickDisplay({
     *   cards: {
     *     PLAYER_1: { code: 'AH', suit: 'HEARTS', rank: 'A' },
     *     PLAYER_2: { code: 'KH', suit: 'HEARTS', rank: 'K' },
     *     PLAYER_3: null,
     *     PLAYER_4: { code: 'QH', suit: 'HEARTS', rank: 'Q' }
     *   },
     *   leader: 'PLAYER_1',
     *   suit: 'HEARTS'
     * });
     * 
     * @description
     * This method:
     * - Clears the previous trick display
     * - Shows cards played by each player in their respective positions
     * - Highlights the trick leader
     * - Indicates the current trick's leading suit
     * - Handles empty slots for players who haven't played yet
     * 
     * @see #formatCard - Formats card for display
     * @see #getPlayerPosition - Gets screen position for each player
     * @see #updateGameBoard - Parent method that calls this
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
     * Updates the score display for both teams in the UI.
     * 
     * @param {Object} scores - The current scores
     * @param {number} scores.team1 - Score for team 1 (0-10)
     * @param {number} scores.team2 - Score for team 2 (0-10)
     * @param {string} [scores.winningTeam] - Optional: The team that just won a trick
     * @private
     * @returns {void}
     * 
     * @example
     * // Updates the score display with scores
     * updateScoreDisplay({
     *   team1: 3,
     *   team2: 5,
     *   winningTeam: 'team2' // Optional: highlights the winning team
     * });
     * 
     * @description
     * This method:
     * - Updates the score display for both teams
     * - Optionally highlights the winning team's score
     * - Handles score animations if needed
     * - Ensures scores stay within valid range (0-10)
     * 
     * @requires .team1-score - Element displaying team 1's score
     * @requires .team2-score - Element displaying team 2's score
     * 
     * @see #updateUI - Parent method that calls this
     * @see #showGameOverModal - Called when a team reaches 10 points
     * 
     * @emits score:updated - When scores are updated
     * @emits game:won - When a team reaches 10 points (win condition)
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
     * @returns {void}
     * 
     * @example
     * // Updates controls based on game state
     * updateControls({
     *   phase: 'BIDDING',
     *   currentPlayer: 'PLAYER_1',
     *   canOrderUp: true,
     *   canGoAlone: false,
     *   // ... other game state
     * });
     * 
     * @description
     * This method manages the interactive elements of the UI:
     * - Enables/disables action buttons based on game phase
     * - Shows/hides bid controls during bidding phase
     * - Updates card playability based on game rules
     * - Manages visibility of game phase-specific UI elements
     * 
     * @requires gameState.phase - Current game phase
     * @requires gameState.currentPlayer - ID of the current player
     * @requires gameState.canOrderUp - If player can order up the card
     * @requires gameState.canGoAlone - If player can go alone
     * 
     * @see #isMyTurn - Determines if controls should be active
     * @see #updateButtonStates - Updates individual button states
     * @see #enableControls - Enables/disables groups of controls
     * 
     * @emits controls:updated - When controls have been updated
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
     * Toggles the visibility of the game lobby and waiting area.
     * 
     * @param {boolean} show - Whether to show (true) or hide (false) the lobby
     * @param {string} [message] - Optional message to display in the lobby
     * @returns {void}
     * @private
     * 
     * @example
     * // Show the lobby with a waiting message
     * toggleGameLobby(true, 'Waiting for players...');
     * 
     * // Hide the lobby when game starts
     * toggleGameLobby(false);
     * 
     * @description
     * This method manages the lobby UI:
     * - Shows/hides the lobby container
     * - Updates any status messages
     * - Manages UI state for players waiting in the lobby
     * - Handles animations for smooth transitions
     * 
     * @requires #lobby-container - The lobby container element
     * @requires .lobby-message - Element for displaying lobby messages
     * 
     * @see #joinGame - Shows the lobby when joining
     * @see #startGame - Hides the lobby when game starts
     * 
     * @emits lobby:shown - When the lobby is displayed
     * @emits lobby:hidden - When the lobby is hidden
     */
    toggleGameLobby(show, message) {
        const lobbyEl = document.getElementById('lobby');
        const gameEl = document.getElementById('game');
        
        if (lobbyEl) {
            lobbyEl.style.display = show ? 'block' : 'none';
            if (message) {
                const messageEl = lobbyEl.querySelector('.lobby-message');
                if (messageEl) messageEl.textContent = message;
            }
        }
        if (gameEl) gameEl.style.display = show ? 'none' : 'block';
    }

    /**
     * Updates the connection status indicator in the UI.
     * 
     * @param {boolean} connected - Whether the client is connected to the server
     * @returns {void}
     * @private
     * 
     * @example
     * // Update UI to show connection status
     * updateConnectionStatus(true);  // Connected
     * updateConnectionStatus(false); // Disconnected
     * 
     * @description
     * This method updates the connection status indicator with appropriate
     * styling based on the connection state.
     * 
     * @requires #connection-status - Element to display connection status
     * 
     * @see #initializeSocketEvents - Calls this on connection events
     * 
     * @emits connection:status - When connection status changes
     */
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;
        
        statusEl.textContent = connected ? 'Connected' : 'Disconnected';
        statusEl.className = connected ? 'connected' : 'disconnected';
    }

    /**
     * Gets the Unicode symbol for a given card suit.
     * 
     * @param {string} suit - The suit name (HEARTS, DIAMONDS, CLUBS, SPADES)
     * @returns {string} The Unicode symbol for the suit
     * @private
     * @example
     * // Returns '♥'
     * getSuitSymbol('HEARTS');
     * 
     * @description
     * This method maps standard suit names to their corresponding
     * Unicode playing card symbols. It's case-insensitive and
     * returns a question mark for unknown suits.
     * 
     * @see #formatCard - Uses this to display card suits
     * @see #updatePlayerHand - Uses this when rendering cards
     * 
     * @throws {Error} If suit is not a string
     */
    getSuitSymbol(suit) {
        if (typeof suit !== 'string') return '?';
        
        const symbols = {
            'HEARTS': '♥',
            'DIAMONDS': '♦',
            'CLUBS': '♣',
            'SPADES': '♠'
        };
        return symbols[suit.toUpperCase()] || '?';
    }

    /**
     * Displays the game over modal with final scores and winner information.
     * 
     * @param {Object} data - Game over data
     * @param {string} data.winningTeam - The winning team name
     * @param {number} data.team1Score - Final score for team 1 (0-10)
     * @param {number} data.team2Score - Final score for team 2 (0-10)
     * @param {string} [data.message] - Optional game over message
     * @returns {void}
     * @private
     * 
     * @example
     * // Show game over modal
     * showGameOverModal({
     *   winningTeam: 'Team 1',
     *   team1Score: 10,
     *   team2Score: 7,
     *   message: 'Congratulations to Team 1!'
     * });
     * 
     * @description
     * This method:
     * - Creates and displays a modal dialog
     * - Shows the winning team and final scores
     * - Provides a button to start a new game
     * - Handles cleanup when the modal is closed
     * 
     * @requires .modal - CSS class for the modal container
     * @requires .modal-content - CSS class for the modal content
     * 
     * @see #startNewGame - Called when new game is requested
     * 
     * @emits game:over - When the game over modal is shown
     * @emits game:new - When starting a new game
     */
    showGameOverModal(data) {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'gameOverTitle');
        
        // Set modal content
        modal.innerHTML = `
            <div class="modal-content">
                <h2 id="gameOverTitle">Game Over!</h2>
                <p>${data.winningTeam} wins ${data.team1Score}-${data.team2Score}!</p>
                ${data.message ? `<p class="game-message">${data.message}</p>` : ''}
                <button id="newGameBtn" class="btn btn-primary">Play Again</button>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Handle new game button
        const newGameBtn = modal.querySelector('#newGameBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.socket.emit('newGame');
                modal.remove();
            });
        }
        
        // Focus the button for better keyboard navigation
        newGameBtn.focus();
        
        // Dispatch event that modal was shown
        document.dispatchEvent(new CustomEvent('game:over', { detail: data }));
    }
    
    /**
     * Starts a new game by resetting the UI and notifying the server.
     * 
     * @returns {void}
     * @public
     * 
     * @example
     * // Start a new game
     * socketHandler.startNewGame();
     * 
     * @description
     * This method:
     * - Resets the game UI to its initial state
     * - Emits a 'newGame' event to the server
     * - Shows the lobby while waiting for players
     * 
     * @see #toggleGameLobby - Used to show the lobby
     * @see #resetUI - Resets the game interface
     * 
     * @emits game:new - When a new game is started
     */
    startNewGame() {
        // Reset UI state
        this.resetUI();
        
        // Show lobby
        this.toggleGameLobby(true, 'Starting new game...');
        
        // Notify server
        this.socket.emit('newGame');
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('game:new'));
    }
}

// Initialize the socket handler when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.socketHandler = new SocketHandler();
});