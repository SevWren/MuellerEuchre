/**
 * @file Test utilities and mocks for startNewHandPhase testing.
 * @module test/game/phases/__mocks__/startNewHandPhase
 * @description Provides test utilities and dependency-injected mocks for testing the startNewHandPhase functionality.
 * This follows the project's mocking standards and provides pure, deterministic test utilities.
 * 
 * @see test/__mocks__/mocks_doc.md
 * @see test/game/phases/startNewHandPhase.unit.test.js
 */

import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, VALUES } from '../../../../src/config/constants.js';
import { PhaseLogicError } from '../../../../src/game/logic/validation-errors.js';
import * as deckUtils from '../../../../src/utils/deck.js';
import { getNextPlayer as realGetNextPlayer } from '../../../../src/utils/players.js';

// ========================
// Type Definitions
// ========================

/**
 * Represents a valid game phase string from GAME_PHASES.
 * @typedef {keyof typeof GAME_PHASES} GamePhase
 * @see src/config/constants.js
 */

/**
 * Represents a valid player role string from PLAYER_ROLES.
 * @typedef {keyof typeof PLAYER_ROLES} PlayerRole
 * @see src/config/constants.js
 */

/**
 * Represents a valid team name string from TEAMS.
 * @typedef {keyof typeof TEAMS} TeamName
 * @see src/config/constants.js
 */

/**
 * Represents a playing card.
 * @typedef {object} Card
 * @property {string} id - Unique identifier for the card.
 * @property {string} suit - The suit of the card (e.g., 'CLUBS', 'DIAMONDS').
 * @property {string} value - The value of the card (e.g., 'NINE', 'KING').
 * @property {function(): string} toString - Returns a string representation of the card.
 */

/**
 * Represents the state of a player in the game.
 * @typedef {object} PlayerState
 * @property {string} id - The unique ID of the player.
 * @property {string} name - The display name of the player.
 * @property {boolean} isConnected - Whether the player is currently connected.
 * @property {TeamName} teamId - The team the player belongs to.
 * @property {Card[]} hand - An array of cards in the player's hand.
 */

/**
 * Represents the full state of a Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game.
 * @property {GamePhase} gamePhase - The current phase of the game.
 * @property {Object.<PlayerRole, PlayerState>} players - An object mapping player roles to their states.
 * @property {PlayerRole} dealer - The role of the current dealer.
 * @property {PlayerRole | null} currentPlayer - The role of the player whose turn it is.
 * @property {any[]} gameMessages - An array of game messages or events.
 * @property {Object.<TeamName, number>} teamScores - An object mapping team names to their current scores.
 * @property {PlayerRole | null} orderUpTurn - The player who can order up the trump.
 * @property {Card | null} turnCard - The card turned up for trump selection.
 * @property {string | null} trumpSuit - The current trump suit.
 * @property {Card[]} currentTrick - An array of cards played in the current trick.
 * @property {string | null} leadSuit - The suit of the first card played in the trick.
 * @property {string | null} makerTeam - The team that made trump.
 * @property {boolean} goingAlone - True if a player is going alone.
 * @property {PlayerRole | null} partnerSittingOut - The partner sitting out if a player is going alone.
 * @property {any[]} bids - An array of bid objects.
 * @property {Card[]} kitty - The cards remaining in the kitty.
 */

// ========================
// Mock Implementations
// ========================

/**
 * Generates a mock deck of Euchre cards for testing.
 * @param {number} [numCards=24] - The number of cards to generate in the mock deck.
 * @returns {Card[]} An array of card objects representing a Euchre deck.
 */
function createMockDeck(numCards = 24) {
  const euchreValues = [
    VALUES.NINE,
    VALUES.TEN,
    VALUES.JACK,
    VALUES.QUEEN,
    VALUES.KING,
    VALUES.ACE,
  ];

  const deck = [];
  let cardCount = 0;
  let cardIndex = 0;

  // Generate cards for each suit
  for (const suit of Object.values(SUITS)) {
    for (const value of euchreValues) {
      if (cardCount >= numCards) break;
      
      const cardValue = value.toLowerCase();
      const cardSuit = suit.toLowerCase();
      
      deck.push({
        id: `card_${cardIndex++}`,
        suit: cardSuit,
        value: cardValue,
        toString: () => `${cardValue}_of_${cardSuit}`,
      });

      cardCount++;
    }
    if (cardCount >= numCards) break;
  }

  return deck;
}

/**
 * Creates a version of startNewHand with injectable dependencies for testing.
 * @param {object} dependencies - An object with mock implementations for dependent utils.
 * @param {function(): Card[]} dependencies.createDeck - Function to create a new deck.
 * @param {function(Card[]): Card[]} dependencies.shuffleDeck - Function to shuffle a deck.
 * @param {function(PlayerRole, PlayerRole[]): PlayerRole} dependencies.getNextPlayer - Function to get next player.
 * @returns {function(GameState): GameState} The configured startNewHand function for testing.
 */
function createStartNewHand({ 
  createDeck, 
  shuffleDeck, 
  getNextPlayer 
}) {
  if (typeof createDeck !== 'function') {
    throw new Error('createDeck must be a function');
  }
  if (typeof shuffleDeck !== 'function') {
    throw new Error('shuffleDeck must be a function');
  }
  if (typeof getNextPlayer !== 'function') {
    throw new Error('getNextPlayer must be a function');
  }

  return function startNewHand(currentGameState) {
    // Input validation
    if (!currentGameState?.players || !currentGameState.gameId) {
      throw new Error('Invalid game state: missing required properties');
    }

    // Phase validation
    const validPhases = [
      GAME_PHASES.DEALING,
      GAME_PHASES.LOBBY,
      GAME_PHASES.SCORING,
      GAME_PHASES.GAME_OVER,
    ];
    
    if (!validPhases.includes(currentGameState.gamePhase)) {
      throw new Error(`Cannot start a new hand from phase: ${currentGameState.gamePhase}`);
    }

    // Create a deep copy of the game state to avoid mutations
    const newState = JSON.parse(JSON.stringify(currentGameState));
    
    // Use the injected getNextPlayer function to determine the next dealer and first bidder
    const playerRoles = Object.values(PLAYER_ROLES);
    
    // If no dealer is set, default to the first player
    if (!newState.dealer) {
      newState.dealer = playerRoles[0];
    } else {
      // Get the next dealer using the injected getNextPlayer function
      newState.dealer = getNextPlayer(newState.dealer, playerRoles);
    }
    
    // Set the first bidder to the player after the dealer
    newState.currentPlayer = getNextPlayer(newState.dealer, playerRoles);
    newState.orderUpTurn = newState.currentPlayer;
    newState.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;
    
    // Reset game state
    newState.turnCard = null;
    newState.trumpSuit = null;
    newState.currentTrick = [];
    newState.leadSuit = null;
    newState.makerTeam = null;
    newState.goingAlone = false;
    newState.partnerSittingOut = null;
    newState.bids = [];
    
    try {
      // Create and shuffle a new deck
      const freshDeck = createDeck();
      const shuffledDeck = shuffleDeck(freshDeck);
      
      // Check for minimum cards needed (5 cards per player * 4 players = 20, plus 1 for turn card = 21)
      const MIN_CARDS_NEEDED = 21;
      if (shuffledDeck.length < MIN_CARDS_NEEDED) {
        // Create a new PhaseLogicError with the appropriate message
        const error = new Error(`Not enough cards to deal. Need at least ${MIN_CARDS_NEEDED} cards, but only have ${shuffledDeck.length}`);
        error.name = 'PhaseLogicError';
        throw error;
      }
      
      // Get active players (those with isActive not explicitly set to false)
      const activePlayers = Object.entries(newState.players)
        .filter(([_, player]) => player.isActive !== false)
        .map(([role, player]) => ({ role, ...player }));
      
      const cardsNeeded = activePlayers.length * 5; // 5 cards per active player
      
      // For exactly the number of cards needed + 1 for turn card, there should be no kitty
      if (shuffledDeck.length === cardsNeeded + 1) {
        newState.kitty = [];
        // All cards are dealt to active players
        activePlayers.forEach(player => {
          newState.players[player.role].hand = shuffledDeck.splice(0, 5);
        });
        // The last card is the turn card
        if (shuffledDeck.length > 0) {
          newState.turnCard = shuffledDeck.pop();
        }
      } else {
        // Normal case: 3 cards in kitty, rest dealt to active players
        // Store the kitty (last 3 cards)
        newState.kitty = shuffledDeck.slice(-3);
        // Deal cards to active players
        const dealCards = shuffledDeck.slice(0, -3);
        activePlayers.forEach(player => {
          newState.players[player.role].hand = dealCards.splice(0, 5);
        });
        // Set the turn card (last card of the deck before kitty)
        if (dealCards.length > 0) {
          newState.turnCard = dealCards.pop();
        }
      }
    } catch (error) {
      throw new Error(`Failed to deal cards: ${error.message}`);
    }

    return newState;
  };
}

// ========================
// Test Helpers
// ========================

/**
 * Creates a base game state object for testing purposes.
 * @param {object} [overrides={}] - Optional overrides for the default game state.
 * @returns {GameState} A new game state object.
 */
function createBaseGameState(overrides = {}) {
  const defaultState = {
    gameId: 'test-game',
    gamePhase: GAME_PHASES.LOBBY,
    players: {
      [PLAYER_ROLES.PLAYER_NORTH]: {
        id: 'player-north',
        name: 'North',
        isConnected: true,
        teamId: TEAMS.TEAM_NS,
        hand: []
      },
      [PLAYER_ROLES.PLAYER_EAST]: {
        id: 'player-east',
        name: 'East',
        isConnected: true,
        teamId: TEAMS.TEAM_EW,
        hand: []
      },
      [PLAYER_ROLES.PLAYER_SOUTH]: {
        id: 'player-south',
        name: 'South',
        isConnected: true,
        teamId: TEAMS.TEAM_NS,
        hand: []
      },
      [PLAYER_ROLES.PLAYER_WEST]: {
        id: 'player-west',
        name: 'West',
        isConnected: true,
        teamId: TEAMS.TEAM_EW,
        hand: []
      }
    },
    dealer: PLAYER_ROLES.PLAYER_NORTH,
    currentPlayer: null,
    gameMessages: [],
    teamScores: {
      [TEAMS.TEAM_NS]: 0,
      [TEAMS.TEAM_EW]: 0
    },
    orderUpTurn: null,
    turnCard: null,
    trumpSuit: null,
    currentTrick: [],
    leadSuit: null,
    makerTeam: null,
    goingAlone: false,
    partnerSittingOut: null,
    bids: [],
    kitty: []
  };

  return { ...defaultState, ...overrides };
}

/**
 * Resets any internal state in the mocks.
 * This should be called between tests to ensure test isolation.
 * @returns {void}
 */
function reset() {
  // Reset any internal state here if needed
}

// ========================
// Default Export
// ========================

// Create a default implementation using real dependencies
const defaultStartNewHand = createStartNewHand({
  createDeck: deckUtils.createDeck,
  shuffleDeck: deckUtils.shuffleDeck,
  getNextPlayer: realGetNextPlayer
});

// Named exports for individual imports
export { 
  createStartNewHand, 
  createBaseGameState, 
  createMockDeck,
  reset 
};

// Default export for backward compatibility
export default defaultStartNewHand;
