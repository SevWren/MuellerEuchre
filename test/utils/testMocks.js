/**
 * Common test mocks and utilities for unit testing
 * @module testMocks
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
    getNextPlayer: sinon.stub().callsFake((currentPlayer) => {
      const playerOrder = ['south', 'west', 'north', 'east'];
      const currentIndex = playerOrder.indexOf(currentPlayer);
      return playerOrder[(currentIndex + 1) % playerOrder.length];
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
