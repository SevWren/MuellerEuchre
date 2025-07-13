/**
 * @file Test utilities for validation tests
 * @module test/utils/validation-test-utils
 * @description Shared utilities for creating consistent test data in validation tests
 */

import { mock } from 'node:test';
import {
  CARD_SUITS as SUITS,
  CARD_VALUES as VALUES,
  GAME_PHASES,
  PLAYER_ROLES,
  BID_DECISIONS
} from '../../src/config/constants.js';

/**
 * Creates a card object with the correct structure for testing
 * @param {string} id - The card ID (e.g., 'AS' for Ace of Spades)
 * @param {string} suit - The card suit (must match SUITS constants)
 * @param {string} value - The card value (must match VALUES constants)
 * @returns {Object} A card object with required properties and methods
 */
function createCard(id, suit, value) {
  if (!id || !suit || !value) {
    throw new Error('createCard requires id, suit, and value parameters');
  }

  return {
    id,
    suit,
    value,
    // These methods will be properly mocked in tests
    isLeftBower: () => false,
    getEffectiveSuit: (trumpSuit) => suit
  };
}

/**
 * Creates a standard deck of 24 Euchre cards
 * @returns {Array<Object>} Array of card objects
 */
function createStandardDeck() {
  const deck = [];
  const suits = [SUITS.SPADES, SUITS.HEARTS, SUITS.DIAMONDS, SUITS.CLUBS];
  const values = VALUES;

  // Map constant names to their single-character ID representation.
  const suitCharMap = {
    [SUITS.SPADES]: 'S',
    [SUITS.HEARTS]: 'H',
    [SUITS.DIAMONDS]: 'D',
    [SUITS.CLUBS]: 'C',
  };

  for (const suit of suits) {
    for (const value of values) {
      // Correctly use the map to generate a unique ID.
      deck.push(createCard(`${value}${suitCharMap[suit]}`, suit, value));
    }
  }

  return deck;
}

/**
 * Creates a base game state with all required fields
 * @param {Object} overrides - Optional overrides for default values
 * @returns {Object} A complete game state object
 */
function createBaseGameState(overrides = {}) {
  const defaultState = {
    gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
    dealer: 'north',
    currentPlayer: 'south',
    currentTrick: [],
    tricks: { NS: 0, EW: 0 },
    trumpSuit: null,
    upCard: createCard('KH', 'HEARTS', 'K'),
    turnCard: createCard('KH', 'HEARTS', 'K'),
    players: {
      [PLAYER_ROLES[0]]: {
        id: 'south',
        name: 'South',
        hand: [],
        team: 'NS',
        role: PLAYER_ROLES[0]
      },
      [PLAYER_ROLES[1]]: {
        id: 'west',
        name: 'West',
        hand: [],
        team: 'EW',
        role: PLAYER_ROLES[1]
      },
      [PLAYER_ROLES[2]]: {
        id: 'north',
        name: 'North',
        hand: [],
        team: 'NS',
        role: PLAYER_ROLES[2]
      },
      [PLAYER_ROLES[3]]: {
        id: 'east',
        name: 'East',
        hand: [],
        team: 'EW',
        role: PLAYER_ROLES[3]
      },
    },
    // Add any other required fields with default values
    ...overrides
  };

  return defaultState;
}

/**
 * Deals cards to players for testing
 * @param {Object} gameState - The game state to modify
 * @param {Object} hands - Object mapping player IDs to arrays of cards
 * @returns {Object} The updated game state
 */
function dealCards(gameState, hands) {
  // Perform a deep copy to ensure immutability.
  const newState = JSON.parse(JSON.stringify(gameState));

  for (const [playerId, cards] of Object.entries(hands)) {
    if (!newState.players[playerId]) {
      throw new Error(`Player ${playerId} not found in game state`);
    }
    newState.players[playerId] = {
      ...newState.players[playerId],
      hand: [...cards]
    };
  }

  return newState;
}

/**
 * Creates a mock logger for testing
 * @returns {Object} A mock logger object
 */
function createMockLogger() {
  const mockLogger = {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    debug: mock.fn(),
    reset: function() {
      this.info.mock.resetCalls();
      this.warn.mock.resetCalls();
      this.error.mock.resetCalls();
      this.debug.mock.resetCalls();
    }
  };
  return mockLogger;
}

export {
  createCard,
  createStandardDeck,
  createBaseGameState,
  dealCards,
  createMockLogger,
  SUITS,
  VALUES,
  GAME_PHASES,
  PLAYER_ROLES,
  BID_DECISIONS
};