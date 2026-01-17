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
 */

class SocketHandler {
  constructor() {
    this.socket = io();
    this.gameState = null;
    this.playerId = null;
    this.role = null;

    this.initializeEventListeners();
    this.initializeSocketEvents();
    this.init();
  }

  init() {
    const session = localStorage.getItem('euchre_session');
    if (session) {
        const { gameId, playerId, role } = JSON.parse(session);
        if (gameId && playerId) {
            this.socket.emit('ACTION_REJOIN_GAME', { gameId, playerId, role }, (response) => {
                if (response && response.status === 'ok') {
                    this.role = role;
                } else {
                    localStorage.removeItem('euchre_session');
                }
            });
        }
    }
  }

  initializeEventListeners() {
    const joinForm = document.getElementById("joinForm");
    if(joinForm) {
        joinForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const playerNameInput = document.getElementById("playerName");
          if(playerNameInput) {
            const playerName = playerNameInput.value.trim() || "Player";
            this.joinGame(playerName);
          }
        });
    }


    document.addEventListener("click", (e) => {
      const cardElement = e.target.closest(".card.playable");
      if (cardElement) {
        this.playCard(cardElement.dataset.id);
      }
    });
  }

  initializeSocketEvents() {
    this.socket.on("connect", () => {
      console.log("Connected to server with ID:", this.socket.id);
      this.updateConnectionStatus(true);
      this.init(); // Re-check session on reconnect
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
      this.updateConnectionStatus(false);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.showMessage("Connection error. Please check your network connection.", "error");
    });

    this.socket.on("GAME_STATE_UPDATE", (gameState) => {
      this.gameState = gameState;
      this.render(gameState);
    });

    this.socket.on("ASSIGN_ROLE", (data) => {
        this.role = data.role;
        this.playerId = data.playerId;
        this.gameState = data.gameState;
        localStorage.setItem('euchre_session', JSON.stringify({ gameId: data.gameId, playerId: data.playerId, role: data.role }));
        this.render(this.gameState);
    });

    this.socket.on("ERROR", (error) => {
      console.error("Game error:", error);
      this.showMessage(`Error: ${error.message || "An error occurred"}`, "error");
    });
  }

  joinGame(playerName) {
    if (!playerName || typeof playerName !== "string") {
      throw new Error("Player name must be a non-empty string");
    }
    // Additional validation can be added here
    this.socket.emit("joinGame", { name: playerName.trim() }, (response) => {
        if (response.error) {
          this.showMessage(response.error, "error");
          return;
        }
        // Role assignment and state update is now handled by server emitting ASSIGN_ROLE and GAME_STATE_UPDATE
      });
  }

  playCard(cardId) {
    if (this.isMyTurn()) {
        const card = this.gameState.players[this.role].hand.find(c => c.id === cardId);
        if(card){
            this.socket.emit("ACTION_PLAY_CARD", {
                gameId: this.gameState.gameId,
                playerRole: this.role,
                card: card
            });
        }
    }
  }

  isMyTurn() {
    return this.gameState && this.role && this.gameState.currentPlayer === this.role;
  }

  render(gameState) {
    if(!gameState) return;
    const myRole = this.role;

    const lobbyView = document.getElementById('lobby-view');
    const gameView = document.getElementById('game-view');
    if (lobbyView && gameView) {
        if (gameState.gamePhase === 'LOBBY') {
            lobbyView.style.display = 'block';
            gameView.style.display = 'none';
        } else {
            lobbyView.style.display = 'none';
            gameView.style.display = 'block';
        }
    }

    const playerHand = document.getElementById('player-hand');
    if(playerHand) {
        playerHand.innerHTML = '';
        if(gameState.players && gameState.players[myRole] && gameState.players[myRole].hand) {
            const myHand = gameState.players[myRole].hand;
            myHand.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                cardDiv.dataset.id = card.id;
                
                if (gameState.currentPlayer === myRole && gameState.gamePhase === 'PLAYING') {
                    cardDiv.classList.add('playable');
                } else {
                    cardDiv.classList.add('disabled');
                }
                
                this.renderCardDOM(card, cardDiv, gameState.trumpSuit);

                playerHand.appendChild(cardDiv);
            });
        }
    }
    
    const tableCenter = document.getElementById('table-center');
    if(tableCenter){
        tableCenter.innerHTML = '';
        if(gameState.currentTrick) {
            gameState.currentTrick.forEach(play => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                this.renderCardDOM(play.card, cardDiv, gameState.trumpSuit);
                tableCenter.appendChild(cardDiv);
            });
        }
    }

    const actionControls = document.getElementById('action-controls');
    if(actionControls){
        actionControls.innerHTML = '';
        if (gameState.gamePhase === 'ORDER_UP_ROUND1' && gameState.currentPlayer === myRole) {
            actionControls.innerHTML = `
                <button id="order-up-btn">Order Up</button>
                <button id="pass-btn">Pass</button>
            `;
            document.getElementById('order-up-btn').onclick = () => this.socket.emit("ACTION_ORDER_UP_DECISION", { gameId: this.gameState.gameId, playerRole: this.role, decision: true });
            document.getElementById('pass-btn').onclick = () => this.socket.emit("ACTION_ORDER_UP_DECISION", { gameId: this.gameState.gameId, playerRole: this.role, decision: false });

        } else if (gameState.gamePhase === 'ORDER_UP_ROUND2' && gameState.currentPlayer === myRole) {
            actionControls.innerHTML = `
                <select id="suit-selector">
                    <option value="CARD_SUIT_HEARTS">Hearts</option>
                    <option value="CARD_SUIT_DIAMONDS">Diamonds</option>
                    <option value="CARD_SUIT_CLUBS">Clubs</option>
                    <option value="CARD_SUIT_SPADES">Spades</option>
                </select>
                <button id="call-trump-btn">Call Trump</button>
                <button id="pass-btn">Pass</button>
            `;
            document.getElementById('call-trump-btn').onclick = () => {
                const suit = document.getElementById('suit-selector').value;
                this.socket.emit("ACTION_CALL_TRUMP_DECISION", { gameId: this.gameState.gameId, playerRole: this.role, decision: true, suit: suit });
            };
            document.getElementById('pass-btn').onclick = () => this.socket.emit("ACTION_CALL_TRUMP_DECISION", { gameId: this.gameState.gameId, playerRole: this.role, decision: false });
        } else if (gameState.gamePhase === 'DEALER_DISCARD' && gameState.currentPlayer === myRole) {
             actionControls.innerHTML = '<p>Click a card in hand to discard</p>';
        }
    }
    
    const gameMessages = document.getElementById('game-messages');
    if(gameMessages) {
        gameMessages.innerHTML = '';
        if(gameState.gameMessages) {
            gameState.gameMessages.forEach(msg => {
                const p = document.createElement('p');
                p.textContent = msg.text;
                gameMessages.appendChild(p);
            });
        }
    }
  }

  renderCardDOM(card, element, trumpSuit) {
    const SUITS_DATA = {
        'HEARTS': { symbol: "♥", colorClass: "red" },
        'DIAMONDS': { symbol: "♦", colorClass: "red" },
        'CLUBS': { symbol: "♣", colorClass: "black" },
        'SPADES': { symbol: "♠", colorClass: "black" },
    };

    element.innerHTML = "";
    if(!card || !card.suit) {
        element.classList.add('card-back');
        return;
    }
    const suitInfo = SUITS_DATA[card.suit.replace('CARD_SUIT_','')];
    if(!suitInfo){
        console.error("Invalid suit in cardData:", card);
        return;
    }
    
    element.classList.add(suitInfo.colorClass);
    const valueDisplay = card.value === "10" ? "10" : card.value.charAt(0).toUpperCase();

    element.innerHTML = `
        <div class="top-left-info">
            <div class="card-value">${valueDisplay}</div>
            <div class="card-suit-symbol">${suitInfo.symbol}</div>
        </div>
        <div class="card-suit-center">${suitInfo.symbol}</div>
        <div class="bottom-right-info">
            <div class="card-value">${valueDisplay}</div>
            <div class="card-suit-symbol">${suitInfo.symbol}</div>
        </div>
    `;
    
    const clientIsLeftBower = (c, t) => {
        if(!c || !t || c.value !== 'J') return false;
        const trumpColor = (t === 'CARD_SUIT_HEARTS' || t === 'CARD_SUIT_DIAMONDS') ? 'red' : 'black';
        const cardColor = (c.suit === 'CARD_SUIT_HEARTS' || c.suit === 'CARD_SUIT_DIAMONDS') ? 'red' : 'black';
        return trumpColor === cardColor && c.suit !== t;
    };

    if(card.suit === trumpSuit || clientIsLeftBower(card, trumpSuit)) {
        element.classList.add('is-trump-card');
    }
  }

  updateConnectionStatus(connected) {
    const statusEl = document.getElementById("connection-status");
    if (!statusEl) return;
    statusEl.textContent = connected ? "Connected" : "Disconnected";
    statusEl.className = connected ? "connected" : "disconnected";
  }

  showMessage(message, type = 'info') {
    // A simple way to show messages. Could be a toast notification library.
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.socketHandler = new SocketHandler();
});
