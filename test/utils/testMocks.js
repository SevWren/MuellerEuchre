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

/**
 * @file Test mocks and utilities for Euchre game unit testing
 * @module testMocks
 * @description Provides reusable mock objects and utilities for testing Euchre game logic.
 * This module includes mock implementations of common game components like loggers, player utilities,
 * validation functions, and game state management to facilitate isolated unit testing.
 * Mocking of specific methods should be done in individual test files using `node:test`'s `context.mock.method()`.
 *
 * @example
 * // Basic usage in a test file using node:test
 * import { test } from 'node:test';
 * import assert from 'node:assert';
 * import { createMockLogger, createMockGameState, createMockPlayerUtils } from '@test/utils/testMocks';
 * import * as moduleUnderTest from 'src/game/phases/somePhase'; // Example module under test
 *
 * test('should handle player turns with mocked logger', async (context) => {
 *   const mockLogger = createMockLogger();
 *   const mockPlayerUtils = createMockPlayerUtils();
 *
 *   // Mock a specific method using node:test's mock API
 *   const infoMock = context.mock.method(mockLogger, 'info', () => {});
 *   const getNextPlayerMock = context.mock.method(mockPlayerUtils, 'getNextPlayer', () => 'east');
 *
 *   const gameState = createMockGameState({
 *     gamePhase: 'BIDDING',
 *     currentPlayer: 'south'
 *   });
 *
 *   // Assuming moduleUnderTest takes dependencies as arguments or they are resolved via import maps
 *   // For direct dependency injection:
 *   // moduleUnderTest.someFunction(gameState, mockLogger, mockPlayerUtils);
 *
 *   // Assertions on mock calls
 *   assert.strictEqual(infoMock.callCount(), 1);
 *   assert.strictEqual(getNextPlayerMock.callCount(), 1);
 *
 *   // Assertions on game state changes
 *   // assert.deepStrictEqual(updatedGameState, expectedState);
 * });
 */

/**
 * Creates a mock logger with no-op functions for all logging methods.
 * Individual test cases can mock these methods using `context.mock.method()`.
 * @returns {Object} Mock logger object with default no-op methods.
 */
function createMockLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    log: () => {},
  };
}

/**
 * Creates a mock player utilities object with default implementations for player-related functions.
 * These functions provide basic logic that can be overridden or mocked in specific tests.
 * @param {Object} [overrides] - Methods to override the default implementations.
 * @returns {Object} Mock player utilities.
 */
function createMockPlayerUtils(overrides = {}) {
  const defaults = {
    /**
     * Default mock implementation of getNextPlayer.
     * @param {string} currentPlayerRole - The current player's role.
     * @param {Array<string>} [playerSlots=['south', 'west', 'north', 'east']] - Ordered array of player roles.
     * @param {boolean} [goingAlone=false] - Whether a player is "going alone".
     * @param {string} [partnerSittingOut=null] - Role of the partner who is sitting out.
     * @returns {string|undefined} Next player's role or undefined if inputs are invalid.
     */
    getNextPlayer: (currentPlayerRole, playerSlots = ['south', 'west', 'north', 'east'], goingAlone = false, partnerSittingOut = null) => {
      if (!currentPlayerRole || !playerSlots || playerSlots.length !== 4) {
        return undefined;
      }

      const currentIndex = playerSlots.indexOf(currentPlayerRole);
      if (currentIndex === -1) {
        return undefined;
      }

      let nextIndex = (currentIndex + 1) % playerSlots.length;
      let nextPlayer = playerSlots[nextIndex];

      if (goingAlone && partnerSittingOut && nextPlayer === partnerSittingOut) {
        nextIndex = (nextIndex + 1) % playerSlots.length;
        nextPlayer = playerSlots[nextIndex];
      }

      return nextPlayer;
    },
    /**
     * Default mock implementation of getPartner.
     * @param {string} player - The player's role.
     * @returns {string|null} The partner's role or null if not found.
     */
    getPartner: (player) => {
      const partners = {
        south: 'north',
        north: 'south',
        east: 'west',
        west: 'east'
      };
      return partners[player] || null;
    },
    // Add other player utility mocks as needed
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a mock validation object with default implementations.
 * @param {Object} [overrides] - Methods to override the default implementations.
 * @returns {Object} Mock validation object.
 */
function createMockValidation(overrides = {}) {
  const defaults = {
    validatePlay: () => ({ valid: true, errors: [] }),
    // Add other validation mocks as needed
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a mock deck utilities object with default implementations.
 * @param {Object} [overrides] - Methods to override the default implementations.
 * @returns {Object} Mock deck utilities.
 */
function createMockDeckUtils(overrides = {}) {
  const defaults = {
    getCardRank: () => 1,
    // Add other deck utility mocks as needed
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a basic game state object for testing.
 * @param {Object} [overrides] - Properties to override in the default game state.
 * @returns {Object} A game state object.
 */
function createMockGameState(overrides = {}) {
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

// Export all mock creation functions
export {
  createMockLogger,
  createMockPlayerUtils,
  createMockValidation,
  createMockDeckUtils,
  createMockGameState,
};
