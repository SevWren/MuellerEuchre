/**
 * @file Test mocks and utilities for Euchre game unit testing
 * @module testMocks
 * @description Provides reusable mock objects and utilities for testing Euchre game logic.
 * This module includes mock implementations of common game components like loggers, player utilities,
 * validation functions, and game state management to facilitate isolated unit testing.
 *
 * @example
 * // Basic usage in a test file
 * import { createMockLogger, createMockGameState, resetMocks } from '@test/utils/testMocks';
 * import sinon from 'sinon';
 *
 * describe('Game Logic', () => {
 *   let sandbox;
 *   let logger;
 *   let gameState;
 *
 *   beforeEach(() => {
 *     sandbox = sinon.createSandbox();
 *     logger = createMockLogger();
 *     gameState = createMockGameState({
 *       gamePhase: 'BIDDING',
 *       currentPlayer: 'south'
 *     });
 *   });
 *
 *   afterEach(() => {
 *     resetMocks(sandbox, { logger });
 *     sandbox.restore();
 *   });
 *
 *   it('should handle player turns', () => {
 *     // Test implementation using the mocks
 *   });
 * });
 */

import sinon from 'sinon';

/**
 * Creates a mock logger with Sinon stubs for all logging methods
 * @returns {Object} Mock logger object with stubbed methods
 */
export function createMockLogger() {
  return {
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
    log: sinon.stub(),
  };
}

/**
 * Creates a mock player utilities object with common player-related functions
 * @param {Object} [overrides] - Methods to override the default mocks
 * @returns {Object} Mock player utilities
 */
export function createMockPlayerUtils(overrides = {}) {
  const defaults = {
    /**
     * Mock implementation of getNextPlayer that matches the real implementation's behavior
     * @param {string} currentPlayerRole - The current player's role
     * @param {Array<string>} [playerSlots=PLAYER_ROLES] - Ordered array of player roles
     * @param {boolean} [goingAlone=false] - Whether a player is "going alone"
     * @param {string} [partnerSittingOut] - Role of the partner who is sitting out
     * @returns {string|undefined} Next player's role or undefined if inputs are invalid
     */
    getNextPlayer: sinon.stub().callsFake((currentPlayerRole, playerSlots = ['south', 'west', 'north', 'east'], goingAlone = false, partnerSittingOut = null) => {
      // Input validation
      if (!currentPlayerRole || !playerSlots || playerSlots.length !== 4) {
        return undefined;
      }

      const currentIndex = playerSlots.indexOf(currentPlayerRole);
      if (currentIndex === -1) {
        return undefined;
      }

      // Calculate next player index with wrap-around
      let nextIndex = (currentIndex + 1) % playerSlots.length;
      let nextPlayer = playerSlots[nextIndex];

      // Handle going alone scenario
      if (goingAlone && partnerSittingOut && nextPlayer === partnerSittingOut) {
        nextIndex = (nextIndex + 1) % playerSlots.length;
        nextPlayer = playerSlots[nextIndex];
      }

      return nextPlayer;
    }),
    getPartner: sinon.stub().callsFake((player) => {
      const partners = {
        south: 'north',
        north: 'south',
        east: 'west',
        west: 'east'
      };
      return partners[player] || null;
    }),
    // Add other player utility mocks as needed
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a mock validation object with common validation functions
 * @param {Object} [overrides] - Methods to override the default mocks
 * @returns {Object} Mock validation object
 */
export function createMockValidation(overrides = {}) {
  const defaults = {
    validatePlay: sinon.stub().returns({ valid: true, errors: [] }),
    // Add other validation mocks as needed
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a mock deck utilities object
 * @param {Object} [overrides] - Methods to override the default mocks
 * @returns {Object} Mock deck utilities
 */
export function createMockDeckUtils(overrides = {}) {
  const defaults = {
    getCardRank: sinon.stub().returns(1),
    // Add other deck utility mocks as needed
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a basic game state for testing
 * @param {Object} [overrides] - Properties to override in the default game state
 * @returns {Object} A game state object
 */
export function createMockGameState(overrides = {}) {
  const defaultState = {
    gameId: 'test-game',
    gamePhase: 'PLAYING',
    players: {
      south: { hand: [], teamId: 'NS' },
      west: { hand: [], teamId: 'EW' },
      north: { hand: [], teamId: 'NS' },
      east: { hand: [], teamId: 'EW' }
    },
    currentPlayer: 'south',
    trumpSuit: 'hearts',
    currentTrick: [],
    tricksTaken: { NS: 0, EW: 0 },
    settings: { winningScore: 10 }
  };

  return { ...defaultState, ...overrides };
}

/**
 * Resets all mocks in a sandbox
 * @param {Object} sandbox - Sinon sandbox
 * @param {Object} mocks - Object containing mock objects to reset
 */
export function resetMocks(sandbox, mocks) {
  sandbox.resetHistory();
  
  // Reset all stubs in the mocks
  Object.values(mocks).forEach(mock => {
    if (mock && typeof mock === 'object') {
      Object.values(mock).forEach(value => {
        if (value && typeof value.resetHistory === 'function') {
          value.resetHistory();
        }
      });
    }
  });
}
