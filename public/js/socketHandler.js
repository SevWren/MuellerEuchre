/**
 * @file Socket Handler for Euchre Multiplayer
 * @description Manages all socket.io communications between client and server
 */

class SocketHandler {
    constructor() {
        // Initialize socket connection
        this.socket = io();
        this.gameState = null;
        this.playerId = null;
        this.role = null;
        
        // Initialize event listeners
        this.initializeEventListeners();
        this.initializeSocketEvents();
    }

    /**
     * Initialize DOM event listeners
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
     * Initialize socket event listeners
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
    makeBid(bidType, options = {}) {
        this.socket.emit('makeBid', { bidType, ...options }, (response) => {
            if (response.error) {
                this.showMessage(response.error, 'error');
            }
        });
    }

    /**
     * Check if it's the current player's turn
     * @returns {boolean} True if it's the player's turn
     */
    isMyTurn() {
        if (!this.gameState || !this.role) return false;
        return this.gameState.currentPlayer === this.role;
    }

    /**
     * Update the UI based on the current game state
     * @param {Object} gameState - The current game state
     */
    updateUI(gameState) {
        this.updatePlayerInfo(gameState);
        this.updateGameBoard(gameState);
        this.updateControls(gameState);
    }

    /**
     * Update player information display
     * @param {Object} gameState - The current game state
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
     * Update the game board display
     * @param {Object} gameState - The current game state
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
     * Update the player's hand display
     * @param {Array} hand - Array of cards in the player's hand
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
     * Update the current trick display
     * @param {Object} trick - The current trick state
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
     * Update the score display
     * @param {Object} scores - The current scores
     */
    updateScoreDisplay(scores) {
        const team1ScoreEl = document.querySelector('.team1-score');
        const team2ScoreEl = document.querySelector('.team2-score');
        
        if (team1ScoreEl) team1ScoreEl.textContent = scores.team1 || 0;
        if (team2ScoreEl) team2ScoreEl.textContent = scores.team2 || 0;
    }

    /**
     * Update game controls based on current state
     * @param {Object} gameState - The current game state
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
     * Update button states based on game state
     * @param {Object} gameState - The current game state
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
     * Toggle game lobby visibility
     * @param {boolean} show - Whether to show the lobby
     */
    toggleGameLobby(show) {
        const lobbyEl = document.getElementById('lobby');
        const gameEl = document.getElementById('game');
        
        if (lobbyEl) lobbyEl.style.display = show ? 'block' : 'none';
        if (gameEl) gameEl.style.display = show ? 'none' : 'block';
    }

    /**
     * Update connection status indicator
     * @param {boolean} connected - Whether the client is connected
     */
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;
        
        statusEl.textContent = connected ? 'Connected' : 'Disconnected';
        statusEl.className = connected ? 'connected' : 'disconnected';
    }

    /**
     * Show a message to the player
     * @param {string} message - The message to display
     * @param {string} [type='info'] - The type of message (info, success, error)
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
     * Format a card for display
     * @param {Object} card - The card to format
     * @returns {string} Formatted card string
     */
    formatCard(card) {
        if (!card) return 'unknown card';
        return `${card.rank}${this.getSuitSymbol(card.suit)}`;
    }

    /**
     * Get the symbol for a suit
     * @param {string} suit - The suit name
     * @returns {string} The suit symbol
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
     * Show the game over modal
     * @param {Object} data - Game over data
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