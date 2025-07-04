// CONCEPTUAL CLIENT-SIDE CODE
// This file outlines the structure and logic for a client-side service.
// It is not intended to be fully functional UI code, but rather a blueprint
// for how the client might handle game events and state.
// Actual UI rendering and direct DOM manipulation are beyond the scope here.

export class StateService {
  // Export the class
  constructor() {
    // Conceptual: In a real app, these might be initialized from localStorage
    // to persist session across page reloads.
    // Example: this.playerId = localStorage.getItem('euchrePlayerId') || null;
    this.playerId = null; // Unique identifier for the player/session
    this.gameId = null; // Current game ID
    this.playerRole = null; // e.g., 'south', 'player1' - role within the current game
    this.isHost = false;
    this.players = []; // List of player objects from the server's perspective (auxiliary or for lobby)
    this.gameState = {
      // Stores the comprehensive game state received from the server
      players: {}, // This will store player objects keyed by role, including their hands
      turnCard: null,
      currentTrick: [],
      teamScores: {
        /* e.g., NS: 0, EW: 0 */
      },
      message: "", // For latest game message
      // ... other game state properties
    };
    this.subscriptions = []; // Initialize subscriptions array

    console.log("[Conceptual StateService] Initialized");
  }

  setGameDetails({ gameId, isHost }) {
    this.gameId = gameId;
    // Conceptual: localStorage.setItem('euchreGameId', gameId);
    this.isHost = !!isHost; // Ensure boolean
    console.log("[Conceptual StateService] setGameDetails:", {
      gameId: this.gameId,
      isHost: this.isHost,
    });
  }

  // Added setPlayerId
  setPlayerId(id) {
    this.playerId = id;
    // Conceptual: localStorage.setItem('euchrePlayerId', id);
    console.log("[Conceptual StateService] setPlayerId:", this.playerId);
  }

  setPlayerRole(role) {
    this.playerRole = role;
    // Note: playerRole is specific to a game, might not be stored long-term in localStorage
    // unless tied to a specific game session being restored.
    console.log("[Conceptual StateService] setPlayerRole:", this.playerRole);
  }

  // --- Getters for connection/session info ---
  getPlayerId() {
    // Conceptual: return this.playerId || localStorage.getItem('euchrePlayerId');
    return this.playerId;
  }

  getGameId() {
    // Conceptual: return this.gameId || localStorage.getItem('euchreGameId');
    return this.gameId;
  }

  getPlayerRole() {
    // Existing getter, just formalizing its presence
    return this.playerRole;
  }

  /**
   * Checks if there is enough information to attempt a game reconnection.
   * @returns {boolean} True if playerId and gameId are set, false otherwise.
   */
  hasReconnectInfo() {
    const hasInfo = !!(this.getPlayerId() && this.getGameId());
    console.log("[Conceptual StateService] hasReconnectInfo:", hasInfo);
    return hasInfo;
  }

  updatePlayerList(players) {
    // This might be an array of player data or an object, depending on server structure
    // For consistency with getPlayerHand, assume gameState.players is an object keyed by role
    // This function might re-populate this.players array or update gameState.players directly
    this.players = Array.isArray(players)
      ? players
      : Object.values(players || {});
    console.log(
      "[Conceptual StateService] updatePlayerList (this.players might be auxiliary):",
      this.players,
    );
    // If the 'players' argument is the main player structure from gameState:
    if (
      typeof players === "object" &&
      !Array.isArray(players) &&
      players !== null
    ) {
      this.gameState.players = players; // Store the rich player objects here
      console.log("[Conceptual StateService] gameState.players updated.");
    }
  }

  getFullGameState() {
    console.log("[Conceptual StateService] getFullGameState called.");
    return { ...this.gameState };
  }

  updateFullGameState(newState) {
    console.log("[Conceptual StateService] updateFullGameState called.");
    this.gameState = newState || {};
    // Update this.players array if it's meant to be a flat list derived from gameState.players
    if (this.gameState.players) {
      this.players = Object.values(this.gameState.players);
    }
    console.log(
      "[Conceptual StateService] Full gameState updated:",
      this.gameState,
    );

    // Notify subscribers
    this.subscriptions.forEach((callback) => {
      try {
        callback(this.gameState);
      } catch (error) {
        console.error(
          "[Conceptual StateService] Error in subscription callback:",
          error,
        );
      }
    });
    console.log(
      `[Conceptual StateService] Notified ${this.subscriptions.length} subscribers.`,
    );
  }

  /**
   * Subscribes a callback function to game state changes.
   * @param {function} callback - The function to call when the state changes. It will receive the new state.
   * @returns {function} An unsubscribe function.
   */
  subscribe(callback) {
    if (typeof callback !== "function") {
      console.error(
        "[Conceptual StateService] Attempted to subscribe with non-function:",
        callback,
      );
      return () => {}; // Return a no-op unsubscribe function
    }
    this.subscriptions.push(callback);
    console.log(
      "[Conceptual StateService] New subscription added. Total subscribers:",
      this.subscriptions.length,
    );
    // Return an unsubscribe function
    return () => {
      this.subscriptions = this.subscriptions.filter((sub) => sub !== callback);
      console.log(
        "[Conceptual StateService] Subscription removed. Total subscribers:",
        this.subscriptions.length,
      );
    };
  }

  // --- New Getter Methods ---

  /**
   * Gets the hand for the current client's player.
   * Assumes playerRole is set and gameState.players contains player details.
   * @returns {Array|null} Array of card objects or null if not available.
   */
  getPlayerHand() {
    if (
      !this.playerRole ||
      !this.gameState.players ||
      !this.gameState.players[this.playerRole]
    ) {
      console.warn(
        "[Conceptual StateService] getPlayerHand: Player role or player data not found.",
      );
      return null;
    }
    const playerHand = this.gameState.players[this.playerRole]?.hand;
    console.log(
      "[Conceptual StateService] getPlayerHand for role",
      this.playerRole,
      ":",
      playerHand,
    );
    return playerHand || []; // Return empty array if hand is undefined
  }

  /**
   * Gets the current turn card (kitty top card).
   * @returns {object|null} The turn card object or null.
   */
  getTurnCard() {
    const turnCard = this.gameState.turnCard;
    console.log("[Conceptual StateService] getTurnCard:", turnCard);
    return turnCard;
  }

  /**
   * Gets the cards currently played in the active trick.
   * @returns {Array} Array of card objects in the current trick.
   */
  getCurrentTrick() {
    const currentTrick = this.gameState.currentTrick;
    console.log("[Conceptual StateService] getCurrentTrick:", currentTrick);
    return currentTrick || []; // Return empty array if undefined
  }

  /**
   * Gets the scores for each team.
   * @returns {object|null} Team scores object e.g., { TEAM_NS: 0, TEAM_EW: 0 } or null.
   */
  getTeamScores() {
    const teamScores = this.gameState.teamScores;
    console.log("[Conceptual StateService] getTeamScores:", teamScores);
    return teamScores;
  }

  /**
   * Gets the latest game message or log.
   * @returns {string} The latest game message.
   */
  getLatestGameMessage() {
    const message = this.gameState.message;
    console.log("[Conceptual StateService] getLatestGameMessage:", message);
    return message || ""; // Return empty string if undefined
  }

  // Example utility to get current player's details from the list
  // This might be less relevant if role-based access in gameState.players is primary
  getCurrentPlayerInfoFromList() {
    if (!this.playerRole || !this.players.length) return null;
    return this.players.find((p) => p.role === this.playerRole) || null;
  }
}

// Conceptual singleton instance
const stateServiceInstance = new StateService();
export { stateServiceInstance }; // Export instance as named export
export default stateServiceInstance; // Keep default export for existing app usage

// Conceptual Unit Test for updateFullGameState:
// it('should update the local gameState with newState and notify subscribers', () => {
//   const service = new StateService(); // Assuming constructor initializes gameState and subscriptions
//   const initialState = { phase: 'bidding', round: 1 };
//   const newState = { phase: 'playing', turnCard: { suit: 'Hearts', rank: 'A' }, round: 1 };
//   service.gameState = initialState; // Set initial state

//   const subscriberCallback = sinon.spy();
//   service.subscribe(subscriberCallback);

//   service.updateFullGameState(newState);

//   expect(service.gameState).to.deep.equal(newState);
//   expect(subscriberCallback).to.have.been.calledOnceWith(newState);
// });

// Conceptual Unit Test for subscription mechanism:
// it('should call subscribed callbacks when gameState is updated', () => {
//   const service = new StateService();
//   const callback1 = sinon.spy();
//   const callback2 = sinon.spy();

//   const unsubscribe1 = service.subscribe(callback1);
//   service.subscribe(callback2);

//   const newState = { phase: 'scoring', scores: { NS: 5, EW: 2 } };
//   service.updateFullGameState(newState);

//   expect(callback1).to.have.been.calledOnceWith(newState);
//   expect(callback2).to.have.been.calledOnceWith(newState);

//   // Test unsubscribe
//   const newerState = { phase: 'gameOver' };
//   unsubscribe1(); // Unsubscribe callback1
//   service.updateFullGameState(newerState);

//   expect(callback1).to.have.been.calledOnce; // Still only called once
//   expect(callback2).to.have.been.calledTwice.and.calledWith(newerState); // Called again with newer state
// });

// Conceptual Unit Test for subscribe method:
// it('should add a callback to subscriptions and return an unsubscribe function', () => {
//    const service = new StateService();
//    const callback = sinon.spy();
//    expect(service.subscriptions.length).to.equal(0);
//    const unsubscribe = service.subscribe(callback);
//    expect(service.subscriptions.length).to.equal(1);
//    expect(service.subscriptions[0]).to.equal(callback);
//
//    unsubscribe();
//    expect(service.subscriptions.length).to.equal(0);
// });
//
// it('should not add non-function callbacks to subscriptions', () => {
//    const service = new StateService();
//    service.subscribe("not a function");
//    expect(service.subscriptions.length).to.equal(0);
// });

// --- Conceptual Unit Tests for Reconnection State (Task 2) ---

// describe('StateService Reconnection Logic', () => {
//   let service;

//   beforeEach(() => {
//     service = new StateService();
//     // Conceptual: For tests involving localStorage, you might mock localStorage.
//     // global.localStorage = { getItem: sinon.stub(), setItem: sinon.stub(), removeItem: sinon.stub() };
//   });

//   afterEach(() => {
//     // Conceptual: Clear mocks if localStorage was mocked.
//     // if (global.localStorage && global.localStorage.setItem.restore) {
//     //   global.localStorage.getItem.restore();
//     //   global.localStorage.setItem.restore();
//     //   global.localStorage.removeItem.restore();
//     // }
//   });

//   it('should set and get playerId', () => {
//     expect(service.getPlayerId()).to.be.null;
//     service.setPlayerId('playerTest123');
//     expect(service.getPlayerId()).to.equal('playerTest123');
//     // Conceptual: expect(localStorage.setItem).to.have.been.calledWith('euchrePlayerId', 'playerTest123');
//   });

//   it('should set and get gameId (via setGameDetails and getGameId)', () => {
//     expect(service.getGameId()).to.be.null;
//     service.setGameDetails({ gameId: 'gameTest456', isHost: false });
//     expect(service.getGameId()).to.equal('gameTest456');
//     // Conceptual: expect(localStorage.setItem).to.have.been.calledWith('euchreGameId', 'gameTest456');
//   });

//   it('hasReconnectInfo should return false if playerId is missing', () => {
//     service.setGameDetails({ gameId: 'gameTest789', isHost: true });
//     service.setPlayerId(null); // Ensure playerId is null
//     expect(service.hasReconnectInfo()).to.be.false;
//   });

//   it('hasReconnectInfo should return false if gameId is missing', () => {
//     service.setPlayerId('playerTestABC');
//     service.setGameDetails({ gameId: null, isHost: false }); // Ensure gameId is null
//     expect(service.hasReconnectInfo()).to.be.false;
//   });

//   it('hasReconnectInfo should return false if both playerId and gameId are missing', () => {
//     service.setPlayerId(null);
//     service.setGameDetails({ gameId: null, isHost: false });
//     expect(service.hasReconnectInfo()).to.be.false;
//   });

//   it('hasReconnectInfo should return true if both playerId and gameId are set', () => {
//     service.setPlayerId('playerTestXYZ');
//     service.setGameDetails({ gameId: 'gameTestDEF', isHost: false });
//     expect(service.hasReconnectInfo()).to.be.true;
//   });
// });
