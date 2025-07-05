/**
 * @file Test helper utilities for the Euchre game test suite
 * @module test-helpers
 * @description Provides utility functions for creating mock game data and test fixtures.
 * These helpers are designed to make tests more maintainable and reduce boilerplate code.
 * 
 * @example
 * // Basic usage in a test file
 * import { createBaseGameState, createMockPlayer } from '@test/utils/test-helpers';
 * 
 * describe('Game Logic', () => {
 *   it('should handle player turns correctly', () => {
 *     const gameState = createBaseGameState({
 *       currentPlayer: 'PLAYER_1',
 *       gamePhase: 'PLAYING'
 *     });
 *     const player = createMockPlayer('player1', { isReady: true });
 *     // Test logic here
 *   });
 * });
 * 
 */

import { PATHS } from './path-utils.js';

/**
 * @typedef {import('@/src/types').GameState} GameState
 * @typedef {import('@/src/types').Card} Card
 * @typedef {import('@/src/types').PlayerRole} PlayerRole
 */

/**
 * Creates a basic game state object for testing
 * @param {Partial<GameState>} [overrides] - Optional overrides for the default game state
 * @returns {GameState} A game state object with default values
 */
export function createBaseGameState(overrides = {}) {
  const defaultState = {
    gamePhase: 'ORDER_UP_ROUND1',
    currentPlayer: 'PLAYER_1',
    dealer: 'PLAYER_1',
    turnCard: { suit: 'SPADES', value: 'ACE' },
    trumpSuit: null,
    currentTrick: [],
    gameId: 'test-game-' + Math.random().toString(36).substring(2, 8),
    players: {
      PLAYER_1: { role: 'PLAYER_1' },
      PLAYER_2: { role: 'PLAYER_2' },
      PLAYER_3: { role: 'PLAYER_3' },
      PLAYER_4: { role: 'PLAYER_4' },
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
 * Creates a mock player object
 * @param {string} id - Player ID
 * @param {Partial<import('@/src/types').Player>} [overrides] - Optional overrides
 * @returns {import('@/src/types').Player}
 */
export function createMockPlayer(id, overrides = {}) {
  return {
    id,
    name: `Player ${id}`,
    role: null,
    team: null,
    cards: [],
    isReady: false,
    isConnected: true,
    socketId: `socket-${id}`,
    ...overrides,
  };
}

/**
 * Creates a mock card object
 * @param {string} suit - Card suit (e.g., 'HEARTS')
 * @param {string|number} value - Card value (e.g., 'ACE', 'KING', 9, 10)
 * @returns {Card}
 */
export function createMockCard(suit, value) {
  return {
    suit,
    value: typeof value === 'number' ? value.toString() : value,
    code: `${value.toString().charAt(0)}${suit.charAt(0)}`,
  };
}

/**
 * Creates a deck of cards
 * @param {boolean} [shuffle=false] - Whether to shuffle the deck
 * @returns {Card[]} Array of cards
 */
export function createDeck(shuffle = false) {
  const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
  const values = [
    '9', '10', 'JACK', 'QUEEN', 'KING', 'ACE'
  ];
  
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push(createMockCard(suit, value));
    }
  }
  
  if (shuffle) {
    return [...deck].sort(() => Math.random() - 0.5);
  }
  
  return deck;
}

export default {
  createBaseGameState,
  createMockPlayer,
  createMockCard,
  createDeck,
  PATHS, // Re-export for convenience
};
