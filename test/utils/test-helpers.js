/**
 * @file Test helper utilities for the Euchre game test suite
 * @module test-helpers
 * @description Provides utility functions for creating mock game data and test fixtures.
 * These helpers are designed to make tests more maintainable and reduce boilerplate code.
 *
 * @example
 * // Basic usage in a test file
 * import { createBaseGameState, createMockPlayer, PLAYER_ROLES } from '@test/utils/test-helpers';
 *
 * describe('Game Logic', () => {
 *   it('should handle player turns correctly', () => {
 *     const gameState = createBaseGameState({
 *       currentPlayer: PLAYER_ROLES[0], // e.g., 'PLAYER_SOUTH'
 *       gamePhase: 'PLAYING'
 *     });
 *     const player = createMockPlayer(PLAYER_ROLES[0], { isReady: true });
 *     // Test logic here
 *   });
 * });
 *
 */

// Import the OFFICIAL constants from the application's source of truth.
import { PLAYER_ROLES as APP_PLAYER_ROLES, SUITS, VALUES } from '../../src/config/constants.js';

/**
 * @typedef {import('@/src/types').GameState} GameState
 * @typedef {import('@/src/types').Card} Card
 * @typedef {import('@/src/types').PlayerRole} PlayerRole
 */

/**
 * Creates a basic game state object for testing.
 * This function now uses the official uppercase player roles from the application constants.
 * @param {Partial<GameState>} [overrides] - Optional overrides for the default game state
 * @returns {GameState} A game state object with default values
 */
function createBaseGameState(overrides = {}) {
  // Use the official player roles from the application
  const [P1, P2, P3, P4] = APP_PLAYER_ROLES;

  const defaultState = {
    gamePhase: 'ORDER_UP_ROUND1',
    currentPlayer: P1,
    dealer: P1,
    turnCard: { suit: 'SPADES', value: 'ACE' },
    trumpSuit: null,
    currentTrick: [],
    gameId: 'test-game-' + Math.random().toString(36).substring(2, 8),
    players: {
      [P1]: { role: P1, name: 'South' },
      [P2]: { role: P2, name: 'West' },
      [P3]: { role: P3, name: 'North' },
      [P4]: { role: P4, name: 'East' },
    },
    version: '1.0.0',
    scores: { team1: 0, team2: 0 },
    teamScores: { team1: 0, team2: 0 },
    messages: [],
    gameMessages: [],
    ...overrides,
  };

  // Ensure both scores and teamScores are in sync if either is provided
  if (overrides.scores) {
    defaultState.teamScores = { ...defaultState.teamScores, ...overrides.scores };
  } else if (overrides.teamScores) {
    defaultState.scores = { ...defaultState.scores, ...overrides.teamScores };
  }

  return defaultState;
}

/**
 * Creates a mock player object.
 * The 'id' parameter is now explicitly documented as the player's role.
 * @param {string} role - The player's role (e.g., 'PLAYER_SOUTH').
 * @param {Partial<import('@/src/types').Player>} [overrides] - Optional overrides
 * @returns {import('@/src/types').Player}
 */
function createMockPlayer(role, overrides = {}) {
  return {
    id: role, // The ID is the role itself for consistency
    name: `Player ${role}`,
    role: role,
    team: null,
    cards: [],
    isReady: false,
    isConnected: true,
    socketId: `socket-${role}`,
    ...overrides,
  };
}

/**
 * Creates a mock card object.
 * @param {string} suit - Card suit (e.g., 'HEARTS')
 * @param {string|number} value - Card value (e.g., 'ACE', 'KING', 9, 10)
 * @returns {Card}
 */
function createMockCard(suit, value) {
  const stringValue = typeof value === 'number' ? value.toString() : value;
  const valueChar = stringValue === '10' ? '10' : stringValue.charAt(0);
  const suitChar = suit.charAt(0);

  return {
    suit,
    value: stringValue,
    code: `${valueChar}${suitChar}`,
  };
}

/**
 * Creates a deck of cards using the official constants.
 * @param {boolean} [shuffle=false] - Whether to shuffle the deck
 * @returns {Card[]} Array of cards
 */
function createDeck(shuffle = false) {
  const deck = [];
  for (const suit of Object.values(SUITS)) {
    for (const value of VALUES) {
      // Skip creating cards if suit or value is a legacy key like 'HEARTS' instead of 'CARD_SUIT_HEARTS'
      if (suit.startsWith('CARD_SUIT_') && !['9','10','J','Q','K','A'].includes(suit)) {
          deck.push(createMockCard(suit, value));
      }
    }
  }

  if (shuffle) {
    return [...deck].sort(() => Math.random() - 0.5);
  }

  return deck;
}

// Re-export the official PLAYER_ROLES constant for use in tests.
// This ensures all tests use the same source of truth.
const PLAYER_ROLES = APP_PLAYER_ROLES;

// ===== Exports =====
// All exports are grouped here at the end of the file
// This follows the project's code style guidelines
export {
  createBaseGameState,
  createMockPlayer,
  createMockCard,
  createDeck,
  PLAYER_ROLES
};