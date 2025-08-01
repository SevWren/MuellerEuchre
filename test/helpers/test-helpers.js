/**
 * @file Test helper utilities for the Euchre game test suite.
 * @module test-helpers
 * @description Provides robust, deterministic utility functions for creating mock game data
 * and test fixtures. These helpers are designed to make tests more maintainable and
 * reduce boilerplate code, aligning with modern testing best practices.
 * this file ia A AUTHORITATIVE SOURCE OF TRUTH. DO NOT MODIFY IT!
 */

import { mock, beforeEach, afterEach } from 'node:test';
import {
  PLAYER_ROLES as APP_PLAYER_ROLES,
  PLAYER_POSITIONS,
  SUITS,
  VALUES,
  TEAMS,
  GAME_PHASES,
} from '../../src/config/constants.js';

/**
 * A type representing one of the valid player role strings.
 * This is created directly from the keys of the PLAYER_POSITIONS constant object.
 * @typedef {keyof typeof PLAYER_POSITIONS} PlayerRole
 */

/**
 * Represents a playing card in Euchre.
 * @typedef {object} Card
 * @property {string} id - The unique identifier for the card (e.g., "AS", "9D").
 * @property {string} suit - The suit of the card, from SUITS constants.
 * @property {string} value - The face value of the card ('9', '10', 'J', 'Q', 'K', 'A').
 * @property {string} name - The human-readable name (e.g., "Ace of Spades").
 */

/**
 * Represents a player in the game.
 * @typedef {object} Player
 * @property {string} id - The unique identifier for the player, typically their role.
 * @property {string} name - The player's display name.
 * @property {PlayerRole} role - The player's role in the game (e.g., "PLAYER_SOUTH").
 * @property {string} teamId - The ID of the team the player belongs to (e.g., TEAMS.TEAM_NS).
 * @property {Card[]} hand - An array of card objects in the player's hand.
 * @property {number} tricksWonThisHand - The number of tricks won in the current hand.
 * @property {boolean} isConnected - The player's connection status.
 * @property {string} socketId - The player's current Socket.IO ID.
 */

/**
 * Represents the complete state of a Euchre game at any point in time.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game session.
 * @property {string} gamePhase - The current phase of the game, from GAME_PHASES.
 * @property {object.<PlayerRole, Player>} players - A map of player roles to player objects.
 * @property {PlayerRole} dealer - The role of the current dealer.
 * @property {PlayerRole} currentPlayer - The role of the player whose turn it is.
 * @property {Card | null} turnCard - The card turned up after the deal.
 * @property {Card[]} kitty - The remaining cards after dealing.
 * @property {string | null} trumpSuit - The suit that is currently trump.
 * @property {string | null} makerTeam - The team that called trump.
 * @property {{card: Card, playedBy: PlayerRole}[]} currentTrick - The cards played in the current trick.
 * @property {object} tricksTaken - A map of team IDs to the number of tricks they have won.
 * @property {object} teamScores - A map of team IDs to their total game score.
 */


// --- Test Environment Setup and Cleanup ---
const cleanupCallbacks = [];
const mockTracker = new WeakMap(); // Maps mock functions to their original implementations or reset logic

/**
 * Registers a cleanup function to be called after each test.
 * @param {Function} fn - The cleanup function.
 * @returns {Function} A function to unregister this specific cleanup.
 */
function onCleanup(fn) {
  cleanupCallbacks.push(fn);
  return () => {
    const index = cleanupCallbacks.indexOf(fn);
    if (index > -1) {
      cleanupCallbacks.splice(index, 1);
    }
  };
}

/**
 * Tracks a mock for automatic reset after each test.
 * @param {Function} mockFn - The mock function to track.
 * @returns {Function} The tracked mock function.
 */
function trackMock(mockFn) {
  if (typeof mockFn.mock === 'object' && typeof mockFn.mock.resetCalls === 'function') {
    onCleanup(() => mockFn.mock.resetCalls());
  } else {
    console.warn('trackMock received a function that does not appear to be a node:test mock. It will not be automatically reset.');
  }
  return mockFn;
}

/**
 * Creates a test context for managing related mocks and cleanup.
 * @returns {{track: Function, onCleanup: Function}} A context object with `track` and `onCleanup` methods.
 */
function createTestContext() {
  const contextCleanups = [];
  const contextMocks = [];

  onCleanup(() => {
    contextCleanups.forEach(fn => fn());
    contextMocks.forEach(mockFn => {
      if (typeof mockFn.mock === 'object' && typeof mockFn.mock.resetCalls === 'function') {
        mockFn.mock.resetCalls();
      }
    });
  });

  return {

/**
 * Tracks a mock within this context for automatic reset.
 * @param {Function} mockFn - The mock function to track.
 * @returns {Function} The tracked mock function.
 */

    track: (mockFn) => {
      contextMocks.push(mockFn);
      return mockFn;
    },
    /**
     * Registers a cleanup function specific to this context.
     * @param {Function} fn - The cleanup function.
     */
    onCleanup: (fn) => {
      contextCleanups.push(fn);
    }
  };
}

/**
 * Sets up the test environment with automatic cleanup for mocks and registered callbacks.
 * Should be called once per test file or in a global setup file.
 */

function setupTestEnvironment() {
  beforeEach(() => {
    // Reset deterministic ID counter for each test
    resetTestIdCounter();
  });

  afterEach(() => {
    // Execute all registered cleanup callbacks
    while (cleanupCallbacks.length > 0) {
      const cleanup = cleanupCallbacks.pop();
      try {
        cleanup();
      } catch (error) {
        console.error('Error during test cleanup:', error);
      }
    }
  });
}

/**
 * Creates and manages a test game state with automatic cleanup.
 * @param {object} [options={}] - Configuration for the test state, passed to `setupTestState`.
 * @returns {{gameState: GameState, cleanup: Function}} An object containing the game state and a cleanup function.
 */

function withTestState(options = {}) {
  const { gameState, playerHand } = setupTestState(options);
  // No explicit cleanup needed here as setupTestState returns a new object
  // and we rely on the immutability for state management.
  // The cleanup function returned is a no-op for now, but kept for API consistency.
  return { gameState, playerHand, cleanup: () => {} };
}

// --- ID Generation for Deterministic Tests ---
let testIdCounter = 0;
const getTestId = (prefix = 'id') => `${prefix}-${testIdCounter++}`;

/**
 * Resets the deterministic ID counter to 0.
 * @description IMPORTANT: This should be called in a global `beforeEach` hook
 * in your test setup to ensure test isolation and prevent test order dependency.
 */

const resetTestIdCounter = () => { testIdCounter = 0; };

// --- Card and Deck Creation ---
const fullDeck = createDeck();
const cardMap = new Map(fullDeck.map(c => [c.id, c]));

/**
 * Creates a realistic mock card object.
 * @param {string} suit - Card suit from SUITS constants.
 * @param {string} value - Card value from VALUES constants.
 * @returns {Card} A complete card object.
 */

function createMockCard(suit, value) {
  if (!Object.values(SUITS).includes(suit) || !VALUES.includes(value)) {
    throw new Error(`Invalid card created: ${value} of ${suit}`);
  }
  const suitChar = suit.split('_').pop().charAt(0);
  const valueChar = value === '10' ? '10' : value.charAt(0);
  const suitName = suit.split('_').pop().toLowerCase();
  const valueName = { '9': 'Nine', '10': 'Ten', J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' }[value];
  return { id: `${valueChar}${suitChar}`, suit, value, name: `${valueName} of ${suitName.charAt(0).toUpperCase() + suitName.slice(1)}s` };
}

/**
 * Creates an array of card objects from a comma-separated string of card IDs.
 * This function is case-insensitive and throws an error on duplicate IDs.
 * @param {string} cardIdString - e.g., "AS,kd,9c,JH"
 * @returns {Card[]} An array of card objects.
 */

function createCards(cardIdString) {
    if (typeof cardIdString !== 'string') throw new TypeError('cardIdString must be a string.');
    const ids = cardIdString.split(',').map(id => id.trim().toUpperCase());
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) throw new Error(`Invalid hand: Duplicate card IDs found in string "${cardIdString}"`);
    return ids.map(id => getCard(id));
}

/**
 * Retrieves a single card object from the deterministic deck by its ID.
 * @param {string} cardId - The case-insensitive ID of the card (e.g., "AS", "kd").
 * @returns {Card} The corresponding card object.
 */

function getCard(cardId) {
    const card = cardMap.get(cardId.toUpperCase());
    if (!card) throw new Error(`Card with ID "${cardId}" not found in standard deck.`);
    return card;
}

/**
 * Creates a standard, ordered 24-card Euchre deck. Deterministic.
 * @returns {Card[]} An array of 24 card objects.
 */

function createDeck() {
  const deck = [];
  const canonicalSuits = Object.values(SUITS).filter((s) => s.startsWith('CARD_SUIT_'));
  const uniqueSuits = [...new Set(canonicalSuits)];
  for (const suit of uniqueSuits) {
    for (const value of VALUES) {
      deck.push(createMockCard(suit, value));
    }
  }
  return deck;
}

/**
 * Shuffles a deck deterministically using a seeded pseudo-random number generator (Fisher-Yates).
 * @param {Card[]} deck - The deck to shuffle.
 * @param {number} [seed=12345] - The seed for the PRNG to ensure repeatable shuffles.
 * @returns {Card[]} A new, predictably shuffled array of cards.
 */

function shuffleDeterministic(deck, seed = 12345) {
    const newDeck = [...deck];
    let m = newDeck.length, t, i;
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    while (m) {
        i = Math.floor(random() * m--);
        t = newDeck[m];
        newDeck[m] = newDeck[i];
        newDeck[i] = t;
    }
    return newDeck;
}

//#---------------------------------------#
// --- Player and Game State Creation ----#
//#---------------------------------------#

/**
 * Creates a complete mock player object with a team automatically assigned.
 * @param {PlayerRole} role - The player's role.
 * @param {Partial<Player>} [overrides] - Optional overrides. Note: Overriding `teamId` can create logically inconsistent states, which may be useful for error testing.
 * @returns {Player} A complete player object.
 */
function createMockPlayer(role, overrides = {}) {
  if (!APP_PLAYER_ROLES.includes(role)) throw new Error(`Invalid player role: ${role}`);
  const teamId = APP_PLAYER_ROLES.indexOf(role) % 2 === 0 ? TEAMS.TEAM_NS : TEAMS.TEAM_EW;
  const roleName = role.split('_').pop();
  return { id: role, name: roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase(), role, teamId, hand: [], tricksWonThisHand: 0, isReady: false, isConnected: true, isActive: true, socketId: `socket-${role}`, ...overrides };
}

/**
 * Creates a base game state object with complete, consistent player objects.
 * @param {Partial<GameState>} [overrides] - Optional overrides.
 * @returns {GameState} A game state object with sensible defaults.
 */
function createBaseGameState(overrides = {}) {
  const [P1, P2, P3, P4] = APP_PLAYER_ROLES;
  const defaultState = { gameId: getTestId('game'), gamePhase: GAME_PHASES.LOBBY, players: { [P1]: createMockPlayer(P1), [P2]: createMockPlayer(P2), [P3]: createMockPlayer(P3), [P4]: createMockPlayer(P4) }, dealer: P1, currentPlayer: P1, turnCard: null, kitty: [], trumpSuit: null, makerTeam: null, currentTrick: [], tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, scores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, bids: [], gameMessages: [], version: '1.0.0', ...overrides };
  if (overrides.teamScores) defaultState.scores = { ...defaultState.scores, ...overrides.teamScores };
  else if (overrides.scores) defaultState.teamScores = { ...defaultState.teamScores, ...overrides.scores };
  return defaultState;
}

/**
 * A powerful, configurable state generator for setting up specific test scenarios.
 * It logically advances the game to the desired phase.
 *
 * @param {object} [options={}] - Configuration for the test state.
 * @param {string} [options.phase=GAME_PHASES.ORDER_UP_ROUND1] - The desired game phase.
 * @param {PlayerRole} [options.dealer=PLAYER_ROLES[0]] - The role of the dealer.
 * @param {boolean} [options.enforceStateConsistency=true] - If true, automatically removes played cards from hands and sets ledSuit. Set to false to test invalid states.
 * @param {object.<PlayerRole, Card[]>} [options.handOverrides] - Map of player roles to specific card arrays.
 * @param {{card: Card, playedBy: PlayerRole}[]} [options.trickOverrides] - An array of played card objects to place in the current trick.
 * @param {Partial<GameState>} [options.stateOverrides] - Raw overrides to apply to the final game state. Raw overrides are applied last and will win any conflicts.
 * @returns {{gameState: GameState, playerHand: Card[]}} A complete game state and a reference to the current player's hand.
 * @see test/game/logic/validation.unit.test.js - For examples of testing `validatePlay`.
 * @see test/game/phases/goAlonePhase.unit.test.js - For examples of setting up the `GOING_ALONE_DECISION` phase.
 */

function setupTestState(options = {}) {
    const { phase = GAME_PHASES.ORDER_UP_ROUND1, dealer = APP_PLAYER_ROLES[0], enforceStateConsistency = true, handOverrides = {}, trickOverrides = [], stateOverrides = {} } = options;
    let state = createBaseGameState({ dealer });
    const deck = shuffleDeterministic(createDeck());
    const dealtCards = new Set();
    APP_PLAYER_ROLES.forEach(role => {
        if (handOverrides[role]) {
            state.players[role].hand = handOverrides[role];
            handOverrides[role].forEach(card => dealtCards.add(card.id));
        }
    });
    const remainingDeck = deck.filter(card => !dealtCards.has(card.id));
    APP_PLAYER_ROLES.forEach(role => {
        while (state.players[role].hand.length < 5) {
            if (remainingDeck.length === 0) throw new Error("Deck exhausted during test setup.");
            state.players[role].hand.push(remainingDeck.pop());
        }
    });
    state.kitty = remainingDeck;
    state.turnCard = state.kitty.pop();
    state.currentPlayer = APP_PLAYER_ROLES[(APP_PLAYER_ROLES.indexOf(dealer) + 1) % 4];
    state.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;

    const advanceToPhase = (targetPhase) => {
        if (state.gamePhase === targetPhase) return;
        if (targetPhase === GAME_PHASES.ORDER_UP_ROUND2) {
            state.bids = APP_PLAYER_ROLES.map(role => ({ round: 1, playerRole: role, decision: 'pass' }));
            state.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
        }
        if (targetPhase === GAME_PHASES.DEALER_DISCARD) {
            state.winningBidder = state.currentPlayer; state.makerTeam = state.players[state.currentPlayer].teamId; state.trumpSuit = state.turnCard.suit; state.players[dealer].hand.push(state.turnCard); state.turnCard = null; state.gamePhase = GAME_PHASES.DEALER_DISCARD; state.currentPlayer = dealer;
        }
        if (targetPhase === GAME_PHASES.GOING_ALONE_DECISION) {
            state.winningBidder = state.currentPlayer; state.makerTeam = state.players[state.currentPlayer].teamId; state.trumpSuit = state.turnCard.suit; state.players[dealer].hand.push(state.turnCard); state.players[dealer].hand.shift(); state.turnCard = null; state.gamePhase = GAME_PHASES.GOING_ALONE_DECISION; state.currentPlayer = state.winningBidder;
        }
        if (targetPhase === GAME_PHASES.PLAYING) {
            state.winningBidder = state.currentPlayer; state.makerTeam = state.players[state.currentPlayer].teamId; state.trumpSuit = state.turnCard.suit; state.players[dealer].hand.push(state.turnCard); state.players[dealer].hand.shift(); state.turnCard = null; state.gamePhase = GAME_PHASES.PLAYING; state.currentPlayer = APP_PLAYER_ROLES[(APP_PLAYER_ROLES.indexOf(dealer) + 1) % 4];
        }
    };
    advanceToPhase(phase);

    if (phase === GAME_PHASES.PLAYING && trickOverrides.length > 0) {
        state.currentTrick = trickOverrides;
        if (enforceStateConsistency) {
            state.ledSuit = trickOverrides[0].card.suit;
            trickOverrides.forEach(played => {
                const player = state.players[played.playedBy];
                if (player) player.hand = player.hand.filter(card => card.id !== played.card.id);
            });
        }
        const lastPlayerInTrick = trickOverrides[trickOverrides.length - 1].playedBy;
        const lastPlayerIndex = APP_PLAYER_ROLES.indexOf(lastPlayerInTrick);
        state.currentPlayer = APP_PLAYER_ROLES[(lastPlayerIndex + 1) % 4];
    }
    
    if (state.gamePhase !== phase && phase !== GAME_PHASES.LOBBY) {
        throw new Error(`Could not advance test state to the requested phase: "${phase}". Current phase is "${state.gamePhase}".`);
    }

    Object.assign(state, stateOverrides);
    const playerHand = state.players[state.currentPlayer]?.hand || [];
    return { gameState: state, playerHand };
}

/**
 * Creates a game state that is ready for the SCORING phase.
 * @param {object} options - Configuration for the completed hand.
 * @param {string} options.makerTeam - The team that made the trump.
 * @param {number} options.tricksWonByMaker - The number of tricks the maker team won (0-5).
 * @param {boolean} [options.goingAlone=false] - Whether the maker went alone.
 * @param {Partial<GameState>} [options.stateOverrides] - Raw overrides for the final game state.
 * @returns {GameState} A game state object in the SCORING phase.
 */

function setupCompletedHandState(options) {
    const { makerTeam, tricksWonByMaker, goingAlone = false, stateOverrides = {} } = options;
    if (!makerTeam || tricksWonByMaker < 0 || tricksWonByMaker > 5) throw new Error("Invalid options for setupCompletedHandState.");
    const opponentTeam = makerTeam === TEAMS.TEAM_NS ? TEAMS.TEAM_EW : TEAMS.TEAM_NS;
    const tricksWonByOpponent = 5 - tricksWonByMaker;
    const state = createBaseGameState({ gamePhase: GAME_PHASES.SCORING, makerTeam, goingAlone, tricksTaken: { [makerTeam]: tricksWonByMaker, [opponentTeam]: tricksWonByOpponent, }, ...stateOverrides });
    return state;
}

/**
 * Creates a complete mock environment for testing a socket handler.
 * @param {object} [options={}] - Configuration options.
 * @param {GameState} [options.gameState] - A specific game state to use. If not provided, a default is created.
 * @param {string} [options.socketId='socket-p1'] - The socket ID for the mock socket.
 * @param {PlayerRole} [options.playerRole] - The role to associate with the socket ID. If not provided, it's looked up from the gameState.
 * @returns {{mockSocket: object, mockIo: object, mockGameRepository: object, playerRole: PlayerRole, gameState: GameState}} An object containing all necessary mocks.
 */

function setupSocketTest(options = {}) {
    const gameState = options.gameState || createBaseGameState();
    const socketId = options.socketId || 'socket-p1';
    const playerRole = options.playerRole || Object.values(gameState.players).find(p => p.socketId === socketId)?.role;

    if (!playerRole) {
        throw new Error(`Failed to setup socket test: Could not find a player with socketId "${socketId}" in the provided gameState.`);
    }

    const mockSocket = { id: socketId, emit: mock.fn(), join: mock.fn(), leave: mock.fn(), on: mock.fn(), getHandler: (event) => mockSocket.on.mock.calls.find(c => c.arguments[0] === event)?.arguments[1], };
    
    // Create a mock for the emit function that will be returned by io.to()
    const mockEmit = mock.fn();
    
    // Create a mock for the object returned by io.to()
    const mockToReturn = { emit: mockEmit };
    
    // Create the mock for io.to() that returns our mock object
    const mockTo = mock.fn(() => mockToReturn);
    
    // Create the mock io object with our tracked mocks
    const mockIo = { to: mockTo };
    
    // For backward compatibility, add the emitSpy to the mockIo object
    mockIo.emitSpy = mockEmit;
    const mockGameRepository = { getGame: mock.fn(async (gameId) => (gameId === gameState.gameId ? gameState : null)), updateGame: mock.fn(async (gameId, state) => state), };
    return { mockSocket, mockIo, mockGameRepository, playerRole, gameState };
}

const PLAYER_ROLES = APP_PLAYER_ROLES;

// ===== Exports =====

/**
 * @typedef {object} GameState - The game state object.
 * @typedef {string} PlayerRole - A player role (e.g., 'north', 'south', etc.).
 * @typedef {object} MockSocket - A mock socket object.
 * @typedef {object} MockIo - A mock io object.
 * @typedef {object} MockGameRepository - A mock game repository object.
 * @typedef {array} Card - A card object (e.g., [rank, suit]).
 */

export {
  /**
   * @type {(options: object) => GameState}
   */
  createBaseGameState,
  /**
   * @type {(options: object) => GameState}
   */
  setupTestState,
  /**
   * @type {(options: object) => GameState}
   */
  setupCompletedHandState,
  /**
   * @type {(options: object) => {mockSocket: MockSocket, mockIo: MockIo, mockGameRepository: MockGameRepository, playerRole: PlayerRole, gameState: GameState}}
   */
  setupSocketTest,
  /**
   * @type {(options: object) => Player}
   */
  createMockPlayer,
  /**
   * @type {(suit: string, value: string) => Card}
   */
  createMockCard,
  /**
   * @type {(cards: array) => array<Card>}
   */
  createCards,
  /**
   * @type {(suit: string, value: string) => Card}
   */
  getCard,
  /**
   * @type {() => array<Card>}
   */
  createDeck,
  /**
   * @type {(deck: array<Card>, seed: number) => array<Card>}
   */
  shuffleDeterministic,
  /**
   * @type {array<PlayerRole>}
   */
  PLAYER_ROLES,
  /**
   * @type {(prefix: string) => string}
   */
  getTestId,
  /**
   * @type {() => void}
   */
  resetTestIdCounter,
  /**
   * @type {() => void}
   */
  setupTestEnvironment,
  /**
   * @type {(mockFn: function) => void}
   */
  trackMock,
  /**
   * @type {() => object}
   */
  createTestContext,
  /**
   * @type {(fn: function) => void}
   */
  withTestState,
  /**
   * @type {(fn: function) => void}
   */
  onCleanup,
};