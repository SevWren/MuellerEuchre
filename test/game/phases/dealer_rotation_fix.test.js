/**
 * @file test/game/phases/startNewHandPhase.unit.test.js
 * @module test/game/phases/startNewHandPhase.unit
 * @description Unit tests for the start new hand phase logic in Euchre Multiplayer game.
 * Tests validate Layer 1 core logic for deck creation, card dealing, dealer rotation, and error handling.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import path from 'path';
import { fileURLToPath } from 'url';

// =============================================
// PATH CONSTANTS (Pattern C from esmock_fix_and_prevention_plan.md)
// =============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts a relative path to an absolute path with POSIX separators
 * @param {string} relativePath - Path relative to the test file
 * @returns {string} Absolute path with POSIX separators
 */
const toPosixPath = (relativePath) => {
  return path.resolve(__dirname, relativePath).replace(/\\/g, '/');
};

// Define all module paths as constants at the top of the file
const PATHS = {
  // Source files - use relative paths from the test file
  START_NEW_HAND: toPosixPath('../../../src/game/phases/startNewHandPhase.js'),
  DECK_UTILS: toPosixPath('../../../src/utils/deck.js'),
  PLAYER_UTILS: toPosixPath('../../../src/utils/players.js'),
  LOGGER: toPosixPath('../../../src/utils/logger.js'),
  CONSTANTS: toPosixPath('../../../src/config/constants.js'),
  ERRORS: toPosixPath('../../../src/game/logic/errors.js'),
};

// Import using path constants to ensure consistency
import { GAME_PHASES, PLAYER_ROLES, TEAMS } from '../../../src/config/constants.js';

// Mock dependencies
const mockDeckUtils = {
  createDeck: sinon.stub(),
  shuffleDeck: sinon.stub().callsFake(deck => [...deck].sort(() => Math.random() - 0.5)),
};

const mockPlayerUtils = {
  getNextPlayer: sinon.stub(),
};

// Mock errors
class MockValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class MockInvalidPhaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidPhaseError';
  }
}

class MockPhaseLogicError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PhaseLogicError';
  }
}

// Mock logger
const mockLogger = {
  debug: sinon.stub(),
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
};

// Import the module under test with mocks
const { startNewHand } = await esmock(
  PATHS.START_NEW_HAND,
  {
    [PATHS.DECK_UTILS]: mockDeckUtils,
    [PATHS.PLAYER_UTILS]: mockPlayerUtils,
    [PATHS.LOGGER]: mockLogger,
  },
  {
    [PATHS.ERRORS]: {
      ValidationError: MockValidationError,
      InvalidPhaseError: MockInvalidPhaseError,
      PhaseLogicError: MockPhaseLogicError,
    },
  }
);

// Test setup
const resetMocks = () => {
  mockDeckUtils.createDeck.resetHistory();
  mockDeckUtils.shuffleDeck.resetHistory();
  mockPlayerUtils.getNextPlayer.reset();
  mockLogger.debug.resetHistory();
  mockLogger.info.resetHistory();
  mockLogger.warn.resetHistory();
  mockLogger.error.resetHistory();
};

// Helper function to create a base game state
const createBaseGameState = (phase = GAME_PHASES.LOBBY, dealer = PLAYER_ROLES[0]) => ({
  gameId: 'test-game-123',
  gamePhase: phase,
  dealer,
  scores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  players: {
    [PLAYER_ROLES[0]]: { hand: [], team: TEAMS.TEAM_NS, isConnected: true, isActive: true },
    [PLAYER_ROLES[1]]: { hand: [], team: TEAMS.TEAM_EW, isConnected: true, isActive: true },
    [PLAYER_ROLES[2]]: { hand: [], team: TEAMS.TEAM_NS, isConnected: true, isActive: true },
    [PLAYER_ROLES[3]]: { hand: [], team: TEAMS.TEAM_EW, isConnected: true, isActive: true },
  },
  kitty: [],
  turnCard: null,
  currentPlayer: null,
  orderUpTurn: null,
  message: '',
});

// Helper function to create a mock deck
const createMockDeck = (numCards = 24) => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  for (let i = 0; i < numCards; i++) {
    const suit = suits[Math.floor(i / 6) % 4];
    const value = values[i % 6];
    deck.push({
      id: `${value}_of_${suit}_${i}`,
      suit,
      value,
      rank: values.indexOf(value) + 1,
    });
  }
  
  return deck;
};

describe('Dealer Rotation', () => {
  // Reset mocks before each test
  beforeEach(resetMocks);

  afterEach(() => {
    sinon.restore();
  });

  it('should rotate dealer to next player after each hand', () => {
    // Test dealer rotation through all player positions
    for (let i = 0; i < PLAYER_ROLES.length; i++) {
      // Arrange
      const currentDealer = PLAYER_ROLES[i];
      const expectedNextDealer = PLAYER_ROLES[(i + 1) % PLAYER_ROLES.length];
      const expectedFirstBidder = PLAYER_ROLES[(i + 2) % PLAYER_ROLES.length];
      
      const gameState = createBaseGameState(GAME_PHASES.SCORING, currentDealer);
      
      // Create a full deck
      const fullDeck = createMockDeck();
      mockDeckUtils.createDeck.returns([...fullDeck]);
      
      // Mock the next player (left of new dealer)
      // First call - get next dealer
      mockPlayerUtils.getNextPlayer
        .withArgs(currentDealer, PLAYER_ROLES)
        .onFirstCall()
        .returns(expectedNextDealer);
      
      // Second call - get first bidder (left of new dealer)
      mockPlayerUtils.getNextPlayer
        .withArgs(expectedNextDealer, PLAYER_ROLES)
        .onSecondCall()
        .returns(expectedFirstBidder);

      // Act
      const result = startNewHand(gameState);

      // Assert - verify dealer rotation and game phase
      expect(result.dealer).to.equal(
        expectedNextDealer,
        `Expected dealer to rotate from ${currentDealer} to ${expectedNextDealer}`
      );
      expect(result.currentPlayer).to.equal(
        expectedFirstBidder,
        `Expected first bidder to be ${expectedFirstBidder} (left of ${expectedNextDealer})`
      );
      expect(result.orderUpTurn).to.equal(expectedFirstBidder);
      expect(result.gamePhase).to.equal('ORDER_UP_ROUND1');
      
      // Reset mocks for next iteration
      resetMocks();
    }
  });
});
