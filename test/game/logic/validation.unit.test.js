/**
 * @file Unit tests for the Euchre game validation logic
 * @module test/game/logic/validation.unit.test
 * @description Comprehensive test suite for validating core game rules in Euchre.
 *
 * 7-22-25 100% Passing
 *
 * Tests use Node's built-in test runner and assertion library.
 *
 * @see https://nodejs.org/docs/latest/api/test.html
 * @see https://nodejs.org/docs/latest/api/assert.html
 * @see jsdoc.md
 * @see js-doc-see.md
 */

import { describe, it, before, after, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_PHASES, PLAYER_POSITIONS } from '../../../src/config/constants.js';
import * as validation from '../../../src/game/logic/validation-core.js';
import logger from '../../../src/utils/logger.js';

// Import constants and errors first
import {
  CARD_SUITS as SUITS,
  CARD_VALUES as VALUES,
  PLAYER_ROLES,
} from '../../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
} from '../../../src/game/logic/validation-errors.js';

// Import the real logger so we can restore it later
import * as realLogger from '../../../src/utils/logger.js';

/**
 * Stores calls made to the mock logger functions.
 * @type {Array<object>}
 * @see test/game/logic/validation.unit.test.js:mockLogger
 */
const loggerCalls = [];

/**
 * Resets the `loggerCalls` array, clearing all logged calls.
 * @returns {void}
 * @see test/game/logic/validation.unit.test.js:loggerCalls
 */
function resetLoggerCalls() {
  loggerCalls.length = 0;
}

/**
 * Retrieves logged calls, optionally filtered by log level.
 * @param {string} [level] - The log level to filter by (e.g., 'info', 'warn', 'error', 'debug').
 * @returns {Array<object>} An array of logged call objects.
 * @see test/game/logic/validation.unit.test.js:loggerCalls
 */
function getLoggerCalls(level) {
  return level
    ? loggerCalls.filter(call => call.level === level)
    : [...loggerCalls];
}

/**
 * A mock logger object that captures log calls for testing purposes.
 * Each logging method (`info`, `warn`, `error`, `debug`) is a `mock.fn` that records its arguments.
 * @property {function} info - Mock function for info level logging.
 * @property {function} warn - Mock function for warn level logging.
 * @property {function} error - Mock function for error level logging.
 * @property {function} debug - Mock function for debug level logging.
 * @property {function(): void} reset - Resets all captured log calls.
 * @property {function(string): Array<object>} getCalls - Retrieves captured log calls, optionally filtered by level.
 * @see src/utils/logger.js
 * @see test/game/logic/validation.unit.test.js:loggerCalls
 */
const mockLogger = {
  info: mock.fn((...args) => {
    const context = args.length > 1 ? args[0] : {};
    const message = args.length > 1 ? args[1] : args[0];
    loggerCalls.push({
      level: 'info',
      context,
      message,
      args: [...args] // Keep original args for backward compatibility
    });
  }),
  warn: mock.fn((...args) => {
    const context = args.length > 1 ? args[0] : {};
    const message = args.length > 1 ? args[1] : args[0];
    loggerCalls.push({
      level: 'warn',
      context,
      message,
      args: [...args] // Keep original args for backward compatibility
    });
  }),
  error: mock.fn((...args) => {
    const context = args.length > 1 ? args[0] : {};
    const message = args.length > 1 ? args[1] : args[0];
    loggerCalls.push({
      level: 'error',
      context,
      message,
      args: [...args] // Keep original args for backward compatibility
    });
  }),
  debug: mock.fn((...args) => {
    const context = args.length > 1 ? args[0] : {};
    const message = args.length > 1 ? args[1] : args[0];
    loggerCalls.push({
      level: 'debug',
      context,
      message,
      args: [...args] // Keep original args for backward compatibility
    });
  }),
  reset: resetLoggerCalls,
  getCalls: getLoggerCalls
};

/**
 * Stores the original logger methods to be restored after tests.
 * @type {object}
 * @property {function} info - Original info method.
 * @property {function} warn - Original warn method.
 * @property {function} error - Original error method.
 * @property {function} debug - Original debug method.
 * @see src/utils/logger.js
 */
const originalLogger = {
  info: realLogger.logger.info,
  warn: realLogger.logger.warn,
  error: realLogger.logger.error,
  debug: realLogger.logger.debug
};

/**
 * Creates a mock deck utility object with specific card-related functions.
 * This mock is used to control the behavior of `isLeftBower` and `areSameColor`
 * within tests without relying on the actual `deck.js` implementation.
 * @returns {object} A mock object containing `isLeftBower` and `areSameColor` functions.
 * @see src/game/logic/deck.js
 */
function createMockDeck() {
  return {
    /**
     * Mocks the `isLeftBower` function.
     * @param {object} card - The card object to check.
     * @param {string} trumpSuit - The current trump suit.
     * @returns {boolean} True if the card is the left bower for the given trump suit, false otherwise.
     * @see src/game/logic/deck.js:isLeftBower
     */
    isLeftBower: (card, trumpSuit) => {
      if (!card || card.value !== VALUES.JACK) return false;
      if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) return true;
      if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) return true;
      if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) return true;
      if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS) return true;
      return false;
    },
    /**
     * Mocks the `areSameColor` function.
     * @param {string} suit1 - The first suit.
     * @param {string} suit2 - The second suit.
     * @returns {boolean} True if the two suits are of the same color (red/black), false otherwise.
     * @see src/game/logic/deck.js:areSameColor
     */
    areSameColor: (suit1, suit2) => {
      const colors = {
        [SUITS.SPADES]: 'black',
        [SUITS.CLUBS]: 'black',
        [SUITS.HEARTS]: 'red',
        [SUITS.DIAMONDS]: 'red',
      };
      return colors[suit1] === colors[suit2];
    }
  };
}

// Create and initialize mocks
const mockDeck = createMockDeck();

/**
 * Setup hook to replace the real logger methods with mock logger methods before all tests in this file.
 * @see https://nodejs.org/docs/latest/api/test.html#beforefn-options
 * @see src/utils/logger.js
 * @see test/game/logic/validation.unit.test.js:mockLogger
 * @see test/game/logic/validation.unit.test.js:originalLogger
 */
before(() => {
  // Replace the real logger methods with our mocks
  realLogger.logger.info = mockLogger.info;
  realLogger.logger.warn = mockLogger.warn;
  realLogger.logger.error = mockLogger.error;
  realLogger.logger.debug = mockLogger.debug;
});

/**
 * Teardown hook to restore the original logger methods after all tests in this file have completed.
 * @see https://nodejs.org/docs/latest/api/test.html#afterfn-options
 * @see src/utils/logger.js
 * @see test/game/logic/validation.unit.test.js:originalLogger
 */
after(() => {
  // Restore the original logger methods
  realLogger.logger.info = originalLogger.info;
  realLogger.logger.warn = originalLogger.warn;
  realLogger.logger.error = originalLogger.error;
  realLogger.logger.debug = originalLogger.debug;
});

/**
 * Hook to reset logger calls before each individual test.
 * @see https://nodejs.org/docs/latest/api/test.html#beforeeachfn-options
 * @see test/game/logic/validation.unit.test.js:mockLogger
 */
beforeEach(() => {
  mockLogger.reset();
});

/**
 * Main test suite for validation logic.
 * @see https://nodejs.org/docs/latest/api/test.html#describename-fn-options
 * @see src/game/logic/validation-core.js
 */
describe('Validation Tests', () => {
  /**
   * Setup hook to mock the logger methods within this test suite's scope.
   * @see https://nodejs.org/docs/latest/api/test.html#beforefn-options
   * @see src/utils/logger.js
   * @see test/game/logic/validation.unit.test.js:mockLogger
   */
  before(() => {
    mock.method(logger, 'info', mockLogger.info);
    mock.method(logger, 'warn', mockLogger.warn);
    mock.method(logger, 'error', mockLogger.error);
    mock.method(logger, 'debug', mockLogger.debug);
  });

  /**
   * Hook to reset all mocks and logger calls before each test within this suite.
   * @see https://nodejs.org/docs/latest/api/test.html#beforeeachfn-options
   * @see test/game/logic/validation.unit.test.js:mockLogger
   */
  beforeEach(() => {
    mock.restoreAll();
    mockLogger.reset();
  });

  /**
   * Teardown hook to restore all mocks after all tests in this suite have completed.
   * @see https://nodejs.org/docs/latest/api/test.html#afterfn-options
   */
  after(() => {
    mock.restoreAll();
  });

  /**
   * Test suite for `validateBid` function.
   * @see https://nodejs.org/docs/latest/api/test.html#describename-fn-options
   * @see src/game/logic/validation-core.js:validateBid
   */
  describe('Validation Logic - validateBid', () => {
    /**
     * Reference to the `validateBid` function under test.
     * @type {function}
     * @see src/game/logic/validation-core.js:validateBid
     */
    let validateBid;
    /**
     * Base game state object for bid validation tests.
     * @type {object}
     */
    let baseBidGameState;

    /**
     * Setup hook to initialize `validateBid` and `baseBidGameState` before each test in this suite.
     * @see https://nodejs.org/docs/latest/api/test.html#beforeeachfn-options
     * @see src/game/logic/validation-core.js:validateBid
     */
    beforeEach(() => {
      validateBid = validation.validateBid;

    // Setup base game state
    baseBidGameState = {
      gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
      currentPlayer: PLAYER_ROLES[0],
      dealer: PLAYER_ROLES[3],
      turnCard: { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE },
      bids: [],
      gameId: "test-bid-game",
    };
  });

  /**
   * Teardown hook to reset all mocks and logger calls after each test in this suite.
   * @see https://nodejs.org/docs/latest/api/test.html#aftereachfn-options
   * @see test/game/logic/validation.unit.test.js:mockLogger
   */
  afterEach(() => {
    // Reset all mocks
    mock.restoreAll();
    mockLogger.info.mock.resetCalls();
    mockLogger.warn.mock.resetCalls();
    mockLogger.error.mock.resetCalls();
    mockLogger.debug.mock.resetCalls();
    resetLoggerCalls();
  });

  /**
   * Test case: Should throw ValidationError if `gameState` is missing.
   * @see src/game/logic/validation-core.js:validateBid
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if gameState is missing", () => {
    assert.throws(
      () => validateBid(null, PLAYER_ROLES[0], "pass"),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing required argument \'gameState\' for bid validation.'
      }
    );
  });

  /**
   * Test case: Should throw ValidationError if `playerRole` is missing.
   * @see src/game/logic/validation-core.js:validateBid
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if playerRole is missing", () => {
    assert.throws(
      () => validateBid(baseBidGameState, null, "pass"),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing required argument \'playerRole\' for bid validation.'
      }
    );
  });

  /**
   * Test case: Should throw ValidationError if `decision` is missing.
   * @see src/game/logic/validation-core.js:validateBid
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if decision is missing", () => {
    assert.throws(
      () => validateBid(baseBidGameState, PLAYER_ROLES[0], null),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing required argument \'decision\' for bid validation.'
      }
    );
  });

  /**
   * Test case: Should throw ValidationError if `playerRole` is invalid.
   * @see src/game/logic/validation-core.js:validateBid
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if playerRole is invalid", () => {
    assert.throws(
      () => validateBid(baseBidGameState, "invalidRole", "pass"),
      {
        name: 'ValidationError',
        message: 'Invalid playerRole \'invalidRole\' for bid validation.'
      }
    );
  });

  /**
   * Test case: Should throw NotPlayersTurnError if it is not the current player's turn.
   * @see src/game/logic/validation-core.js:validateBid
   * @see src/game/logic/validation-errors.js:NotPlayersTurnError
   */
  it("should throw NotPlayersTurnError if it is not the current player's turn", () => {
    const gameState = {
      ...baseBidGameState,
      currentPlayer: PLAYER_ROLES[1]
    };

    assert.throws(
      () => validateBid(gameState, PLAYER_ROLES[0], "pass"),
      {
        name: 'NotPlayersTurnError',
        message: `Not ${PLAYER_ROLES[0]}'s turn. It is ${PLAYER_ROLES[1]}'s turn.`
      }
    );
  });

  /**
   * Test case: Should throw InvalidPhaseError if bidding is attempted outside bidding phases
   * @see src/game/logic/validation-core.js:validateBid
   * @see src/game/logic/validation-errors.js:InvalidPhaseError
   */
  it("should throw InvalidPhaseError if bidding is attempted outside bidding phases", () => {
    const gameState = {
      ...baseBidGameState,
      gamePhase: GAME_PHASES.PLAYING
    };

    const expectedPhases = [GAME_PHASES.ORDER_UP_ROUND1, GAME_PHASES.ORDER_UP_ROUND2];
    const expectedMessage = `Cannot make bid decision during the ${GAME_PHASES.PLAYING} phase. Expected ${expectedPhases.join(' or ')}.`;

    assert.throws(
      () => validateBid(gameState, PLAYER_ROLES[0], "pass"),
      {
        name: 'InvalidPhaseError',
        message: expectedMessage
      },
      'Should throw InvalidPhaseError when not in a bidding phase'
    );
  });

  /**
   * Test suite for Round 1 Bidding (`ORDER_UP_ROUND1`) scenarios.
   * @see https://nodejs.org/docs/latest/api/test.html#describename-fn-options
   */
  describe("Round 1 Bidding (ORDER_UP_ROUND1)", () => {
    /**
     * Setup hook to set the game phase to `ORDER_UP_ROUND1` before all tests in this suite.
     * @see https://nodejs.org/docs/latest/api/test.html#beforefn-options
     */
    before(() => {
      baseBidGameState.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;
    });

    /**
     * Test case: Should allow "orderUp" decision in Round 1.
     * @see src/game/logic/validation-core.js:validateBid
     */
    it('should allow "orderUp" decision', () => {
      assert.doesNotThrow(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "orderUp")
      );
      assert.strictEqual(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "orderUp"),
        true
      );
    });

    /**
     * Test case: Should allow "pass" decision in Round 1.
     * @see src/game/logic/validation-core.js:validateBid
     */
    it('should allow "pass" decision', () => {
      assert.doesNotThrow(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")
      );
      assert.strictEqual(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "pass"),
        true
      );
    });

    /**
     * Test case: Should throw InvalidBidError for "callTrump" decision in Round 1.
     * @see src/game/logic/validation-core.js:validateBid
     * @see src/game/logic/validation-errors.js:InvalidBidError
     */
    it('should throw InvalidBidError for "callTrump" decision', () => {
      assert.throws(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump"),
        {
          name: 'InvalidBidError',
          message: `Invalid decision 'callTrump' for ${GAME_PHASES.ORDER_UP_ROUND1}.`
        }
      );
    });

    /**
     * Test case: Should throw InvalidBidError for other invalid decisions in Round 1.
     * @see src/game/logic/validation-core.js:validateBid
     * @see src/game/logic/validation-errors.js:InvalidBidError
     */
    it("should throw InvalidBidError for other invalid decisions", () => {
      assert.throws(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "invalidDecision"),
        {
          name: 'InvalidBidError',
          message: `Invalid decision 'invalidDecision' for ${GAME_PHASES.ORDER_UP_ROUND1}.`
        }
      );
    });

    /**
     * Test case: Should allow dealer to "orderUp" (accept turn card) in Round 1.
     * @see src/game/logic/validation-core.js:validateBid
     */
    it('should allow dealer to "orderUp" (accept turn card)', () => {
      const dealerGameState = {
        ...baseBidGameState,
        dealer: PLAYER_ROLES[0],
      };
      assert.strictEqual(
        validateBid(dealerGameState, PLAYER_ROLES[0], "orderUp"),
        true
      );
    });

    /**
     * Test case: Should allow dealer to "pass" in Round 1.
     * @see src/game/logic/validation-core.js:validateBid
     */
    it('should allow dealer to "pass"', () => {
      const dealerGameState = {
        ...baseBidGameState,
        dealer: PLAYER_ROLES[0],
      };
      assert.strictEqual(
        validateBid(dealerGameState, PLAYER_ROLES[0], "pass"),
        true
      );
    });
  });

  /**
   * Test suite for Round 2 Bidding (`ORDER_UP_ROUND2`) scenarios.
   * @see https://nodejs.org/docs/latest/api/test.html#describename-fn-options
   */
  describe("Round 2 Bidding (ORDER_UP_ROUND2)", () => {
    /**
     * Setup hook to configure `baseBidGameState` for `ORDER_UP_ROUND2` before all tests in this suite.
     * @see https://nodejs.org/docs/latest/api/test.html#beforefn-options
     */
    before(() => {
      baseBidGameState.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
      baseBidGameState.turnCard = {
        id: "AS",
        suit: SUITS.SPADES,
        value: VALUES.ACE,
      };
      baseBidGameState.bids = [
        { player: PLAYER_ROLES[0], decision: "pass", round: 1 },
        { player: PLAYER_ROLES[1], decision: "pass", round: 1 },
        { player: PLAYER_ROLES[2], decision: "pass", round: 1 },
        { player: PLAYER_ROLES[3], decision: "pass", round: 1 },
      ];
    });

    /**
     * Test case: Should allow "callTrump" decision with a valid suit (not the turned down suit) in Round 2.  
     * @see src/game/logic/validation-core.js:validateBid
     */
    it('should allow "callTrump" decision with a valid suit (not the turned down suit)', () => {
      // Create a test-specific game state to ensure clean setup
      const testGameState = {
        ...baseBidGameState,
        gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
        turnCard: { suit: SUITS.SPADES },
        bids: [
          { player: PLAYER_ROLES[0], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[1], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[2], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[3], decision: "pass", round: 1 },
        ]
      };

      // Test with a valid suit that's not the turned down suit
      const validSuit = SUITS.CLUBS; // Different from turnCard.suit (SPADES)

      assert.doesNotThrow(
        () => validateBid(testGameState, PLAYER_ROLES[0], "callTrump", validSuit)
      );

      assert.strictEqual(
        validateBid(testGameState, PLAYER_ROLES[0], "callTrump", validSuit),
        true
      );
    });

    /**
     * Test case: Should allow "pass" decision (if not stick the dealer) in Round 2.
     * @see src/game/logic/validation-core.js:validateBid
     */
    it('should allow "pass" decision (if not stick the dealer)', () => {
      assert.doesNotThrow(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")
      );
      assert.strictEqual(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "pass"),
        true
      );
    });

    /**
     * Test case: Should throw InvalidBidError for "orderUp" decision in Round 2.
     * @see src/game/logic/validation-core.js:validateBid
     * @see src/game/logic/validation-errors.js:InvalidBidError
     */
    it('should throw InvalidBidError for "orderUp" decision in ORDER_UP_ROUND2', () => {
      // Create a test-specific game state for ORDER_UP_ROUND2
      const testGameState = {
        ...baseBidGameState,
        gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
        turnCard: { suit: SUITS.SPADES },
        bids: [
          { player: PLAYER_ROLES[0], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[1], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[2], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[3], decision: "pass", round: 1 },
        ]
      };

      assert.throws(
        () => validateBid(testGameState, PLAYER_ROLES[0], "orderUp"),
        {
          name: 'InvalidBidError',
          message: `Invalid decision 'orderUp' for ${GAME_PHASES.ORDER_UP_ROUND2}.`
        },
        'Should throw InvalidBidError when orderUp is used in ORDER_UP_ROUND2 phase'
      );
    });

    /**
     * Test case: Should throw InvalidBidError for "callTrump" with an invalid suit string in Round 2.
  
     * @see src/game/logic/validation-core.js:validateBid
     * @see src/game/logic/validation-errors.js:InvalidBidError
     */
    it('should throw InvalidBidError for "callTrump" with an invalid suit string', () => {
      // Create a test-specific game state to ensure clean setup
      const testGameState = {
        ...baseBidGameState,
        gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
        turnCard: { suit: SUITS.SPADES },
        bids: [
          { player: PLAYER_ROLES[0], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[1], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[2], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[3], decision: "pass", round: 1 },
        ]
      };

      assert.throws(
        () => validateBid(testGameState, PLAYER_ROLES[0], "callTrump", "invalidSuit"),
        {
          name: 'InvalidBidError',
          message: 'Invalid suit provided for callTrump decision.'
        },
        'Should throw InvalidBidError with correct message for invalid suit in callTrump'
      );
    });

    /**
     * Test case: Should throw InvalidBidError for "callTrump" with no suit in Round 1 (as it's not allowed).
     * @see src/game/logic/validation-core.js:validateBid
     * @see src/game/logic/validation-errors.js:InvalidBidError
     */
    it('should throw InvalidBidError for "callTrump" with no suit', () => {
      // Create a test-specific game state for ORDER_UP_ROUND1
      const testGameState = {
        ...baseBidGameState,
        gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
        bids: []
      };

      assert.throws(
        () => validateBid(testGameState, PLAYER_ROLES[0], "callTrump", null),
        {
          name: 'InvalidBidError',
          message: `Invalid decision 'callTrump' for ${GAME_PHASES.ORDER_UP_ROUND1}.`
        },
        'Should throw InvalidBidError with correct message for callTrump in ORDER_UP_ROUND1'
      );
    });

    /**
     * Test case: Should throw InvalidBidError for "callTrump" with the turned down suit in Round 2.
     * @see src/game/logic/validation-core.js:validateBid
     * @see src/game/logic/validation-errors.js:InvalidBidError
     */
    it('should throw InvalidBidError for "callTrump" with the turned down suit', () => {
      // Create a new game state with ORDER_UP_ROUND2 phase for this specific test
      const round2GameState = {
        ...baseBidGameState,
        gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
        bids: [
          { player: PLAYER_ROLES[0], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[1], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[2], decision: "pass", round: 1 },
          { player: PLAYER_ROLES[3], decision: "pass", round: 1 },
        ]
      };

      assert.throws(
        () => validateBid(
          round2GameState,
          PLAYER_ROLES[0],
          "callTrump",
          round2GameState.turnCard.suit
        ),
        {
          name: 'InvalidBidError',
          message: `Cannot call the suit that was turned down (${round2GameState.turnCard.suit}).`
        }
      );
    });
  });
});

/**
 * Test suite for `validateDealerDiscard` function.
 * @see https://nodejs.org/docs/latest/api/test.html#describename-fn-options
 * @see src/game/logic/validation-core.js:validateDealerDiscard
 */
describe("Validation Logic - validateDealerDiscard", () => {
  /**
   * Reference to the `validateDealerDiscard` function under test.
   * @type {function}
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   */
  let validateDealerDiscard;
  /**
   * Base game state object for dealer discard validation tests.
   * @type {object}
   */
  let baseDiscardGameState;
  /**
   * The dealer's hand for testing.
   * @type {Array<object>}
   */
  let dealerHand;
  /**
   * The card intended to be discarded by the dealer.
   * @type {object}
   */
  let cardToDiscard;
  /**
   * The player role of the dealer.
   * @type {string}
   */
  const dealerRole = PLAYER_ROLES[0];

  /**
   * Setup hook to initialize test environment before each test in this suite.
   * Resets mocks, re-applies mock logger, and sets up fresh test data.
   * @see https://nodejs.org/docs/latest/api/test.html#beforeeachfn-options
   * @see test/game/logic/validation.unit.test.js:mockLogger
   */
  beforeEach(() => {
    // Reset all mocks before each test
    mock.restoreAll();
    mockLogger.reset();

    // Re-apply the mock logger methods
    mock.method(logger, 'info', mockLogger.info);
    mock.method(logger, 'warn', mockLogger.warn);
    mock.method(logger, 'error', mockLogger.error);
    mock.method(logger, 'debug', mockLogger.debug);

    // Reset the validateDealerDiscard reference
    validateDealerDiscard = validation.validateDealerDiscard;

    // Setup fresh test data
    baseDiscardGameState = {
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      currentPlayer: dealerRole,
      dealer: dealerRole,
      dealerDiscard: null,
      currentTrick: [],
      gameId: "test-discard-game",
    };

    dealerHand = [
      { id: 'AH', suit: 'HEARTS', value: 'ACE' },
      { id: 'KH', suit: 'HEARTS', value: 'KING' },
      { id: 'QH', suit: 'HEARTS', value: 'QUEEN' },
      { id: 'JH', suit: 'HEARTS', value: 'JACK' },
      { id: '10H', suit: 'HEARTS', value: '10' },
      { id: '9H', suit: 'HEARTS', value: '9' },
    ];

    cardToDiscard = { id: '9H' };
  });

  /**
   * Teardown hook to clean up after each test in this suite.
   * @see https://nodejs.org/docs/latest/api/test.html#aftereachfn-options
   * @see test/game/logic/validation.unit.test.js:mockLogger
   */
  afterEach(() => {
    mock.restoreAll();
    mockLogger.reset();
  });

  /**
   * Setup hook to reset mock logger and initialize `validateDealerDiscard` and test data before all tests in this suite.
   * Note: This `before` block seems to duplicate some setup from `beforeEach`.
   * It's generally better to use `beforeEach` for test data setup to ensure isolation.
   * @see https://nodejs.org/docs/latest/api/test.html#beforefn-options
   * @see test/game/logic/validation.unit.test.js:mockLogger
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   */
  before(() => {
    // Reset mock logger
    resetLoggerCalls();
    mockLogger.info.mock.resetCalls();
    mockLogger.warn.mock.resetCalls();
    mockLogger.error.mock.resetCalls();
    mockLogger.debug.mock.resetCalls();

    // Get the validateDealerDiscard function
    validateDealerDiscard = validation.validateDealerDiscard;

    dealerHand = [
      { id: "AC", suit: SUITS.CLUBS, value: VALUES.ACE },
      { id: "KC", suit: SUITS.CLUBS, value: VALUES.KING },
      cardToDiscard,
      { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE },
      { id: "KS", suit: SUITS.SPADES, value: VALUES.KING },
      { id: "JD", suit: SUITS.DIAMONDS, value: VALUES.JACK },
    ];

    baseDiscardGameState = {
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      dealer: dealerRole,
      currentPlayer: dealerRole,
      gameId: "test-discard-game",
    };
  });

  /**
   * Teardown hook to reset all mocks and logger calls after each test in this suite.
   * @see https://nodejs.org/docs/latest/api/test.html#aftereachfn-options
   * @see test/game/logic/validation.unit.test.js:mockLogger
   */
  afterEach(() => {
    // Reset all mocks
    mock.restoreAll();
    mockLogger.info.mock.resetCalls();
    mockLogger.warn.mock.resetCalls();
    mockLogger.error.mock.resetCalls();
    mockLogger.debug.mock.resetCalls();
    resetLoggerCalls();
  });

  /**
   * Test case: Should throw ValidationError if `gameState` is missing for dealer discard validation.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if gameState is missing", () => {
    assert.throws(
      () => validateDealerDiscard(null, 'north', { id: 'test' }, []),
      {
        name: 'ValidationError',
        message: "Internal error: Missing required argument 'gameState' for discard validation."
      },
      'Should throw when gameState is missing'
    );
  });

  /**
   * Test case: Should throw ValidationError if `playerRole` is missing for dealer discard validation.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if playerRole is missing", () => {
    assert.throws(
      () => validateDealerDiscard(
        baseDiscardGameState,
        null,
        cardToDiscard,
        dealerHand,
      ),
      {
        name: 'ValidationError',
        code: 'GENERIC_VALIDATION_ERROR'
      },
      'Should throw when playerRole is missing'
    );
  });

  /**
   * Test case: Should throw ValidationError if `cardToDiscard` is missing for dealer discard validation.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if cardToDiscard is missing", () => {
    assert.throws(
      () => validation.validateDealerDiscard(
        baseDiscardGameState,
        dealerRole,
        null,
        dealerHand,
      ),
      {
        name: 'ValidationError',
        code: 'GENERIC_VALIDATION_ERROR'
      },
      'Should throw when cardToDiscard is missing'
    );
  });

  /**
   * Test case: Should throw ValidationError if `dealerHand` is missing for dealer discard validation.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if dealerHand is missing", () => {
    assert.throws(
      () => validation.validateDealerDiscard(
        baseDiscardGameState,
        dealerRole,
        cardToDiscard,
        null,
      ),
      {
        name: 'ValidationError',
        code: 'GENERIC_VALIDATION_ERROR'
      },
      'Should throw when dealerHand is missing'
    );
  });

  /**
   * Test case: Should throw ValidationError if `cardToDiscard.id` is missing for dealer discard validation.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:ValidationError
   */
  it("should throw ValidationError if cardToDiscard.id is missing", () => {
    assert.throws(
      () => validation.validateDealerDiscard(
        baseDiscardGameState,
        dealerRole,
        {},
        dealerHand,
      ),
      {
        name: 'ValidationError',
        code: 'GENERIC_VALIDATION_ERROR'
      },
      'Should throw when cardToDiscard.id is missing'
    );
  });

  /**
   * Test case: Should throw InvalidPhaseError if not in `DEALER_DISCARD` phase.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:InvalidPhaseError
   */
  it("should throw InvalidPhaseError if not in DEALER_DISCARD phase", () => {
    // Create a test-specific game state with a valid phase that's not DEALER_DISCARD
    const invalidPhaseState = {
      ...baseDiscardGameState, // Start with base state to ensure all required fields are present
      gamePhase: GAME_PHASES.ORDER_UP_ROUND1, // Using a valid phase that's not DEALER_DISCARD
      currentPlayer: dealerRole,
      dealer: dealerRole,
      dealerDiscard: null,
      currentTrick: [],
      gameId: 'test-invalid-phase'
    };

    // Test that the function throws the expected error
    assert.throws(
      () => validateDealerDiscard(
        invalidPhaseState,
        dealerRole,
        cardToDiscard,
        dealerHand
      ),
      {
        name: 'InvalidPhaseError',
        code: 'E_INVALID_PHASE',
        action: 'discard card',
        currentPhase: GAME_PHASES.ORDER_UP_ROUND1,
        expectedPhase: GAME_PHASES.DEALER_DISCARD
      },
      'Should throw InvalidPhaseError when not in DEALER_DISCARD phase'
    );
  });

  /**
   * Test case: Should throw NotPlayersTurnError if `playerRole` is not the dealer.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:NotPlayersTurnError
   */
  it("should throw NotPlayersTurnError if playerRole is not the dealer", () => {
    const nonDealerRole = PLAYER_ROLES[1];
    const gameState = {
      ...baseDiscardGameState,
      dealer: dealerRole,
      currentPlayer: nonDealerRole,
    };
    assert.throws(
      () => validation.validateDealerDiscard(
        gameState,
        nonDealerRole,
        cardToDiscard,
        dealerHand,
      ),
      {
        name: 'NotPlayersTurnError',
        code: 'E_NOT_YOUR_TURN',
        playerRole: nonDealerRole,
        currentPlayer: dealerRole
      }
    );
  });

  /**
   * Test case: Should throw NotPlayersTurnError if it is not the current player's turn (even if player is dealer).
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:NotPlayersTurnError
   */
  it("should throw NotPlayersTurnError if it is not the current player's turn (even if player is dealer)", () => {
    const notPlayersTurnState = {
      ...baseDiscardGameState,
      currentPlayer: PLAYER_ROLES[1], // Different from dealer
    };
    assert.throws(
      () => validation.validateDealerDiscard(notPlayersTurnState, dealerRole, cardToDiscard, dealerHand),
      {
        name: 'NotPlayersTurnError',
        code: 'E_NOT_YOUR_TURN',
        playerRole: dealerRole,
        currentPlayer: notPlayersTurnState.currentPlayer
      }
    );
  });

  /**
   * Test case: Should throw CardNotInHandError if `cardToDiscard` is not in `dealerHand`.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/game/logic/validation-errors.js:CardNotInHandError
   */
  it("should throw CardNotInHandError if cardToDiscard is not in dealerHand", () => {
    const cardNotInHand = { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN };
    assert.throws(
      () => validation.validateDealerDiscard(baseDiscardGameState, dealerRole, cardNotInHand, dealerHand),
      {
        name: 'CardNotInHandError',
        code: 'E_CARD_NOT_IN_HAND',
        cardId: cardNotInHand.id,
        playerHandIds: dealerHand.map(card => card.id)
      }
    );
  });

  /**
   * Test case: Should return true for a valid discard scenario.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   */
  it("should return true for a valid discard scenario", () => {
    assert.doesNotThrow(
      () => validateDealerDiscard(baseDiscardGameState, dealerRole, cardToDiscard, dealerHand)
    );
  });

  /**
   * Test case: Should log a warning if dealer's hand does not have 6 cards.
   * @see src/game/logic/validation-core.js:validateDealerDiscard
   * @see src/utils/logger.js
   */
  it("should log a warning if dealer's hand does not have 6 cards", () => {
    // Create a deep copy of the game state to avoid modifying the original
    const shortHandGameState = {
      ...baseDiscardGameState,
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      currentPlayer: dealerRole,
      dealer: dealerRole,
      dealerDiscard: null,
      currentTrick: [],
      gameId: 'test-game-id' // Ensure gameId is set for the test
    };

    // Create a hand with only 5 cards
    const shortHand = [
      { id: 'AH', suit: 'HEARTS', value: 'ACE' },
      { id: 'KH', suit: 'HEARTS', value: 'KING' },
      { id: 'QH', suit: 'HEARTS', value: 'QUEEN' },
      { id: 'JH', suit: 'HEARTS', value: 'JACK' },
      { id: '10H', suit: 'HEARTS', value: '10' }
    ];

    // Use a card that exists in the shortened hand
    const cardInShortHand = { id: 'AH' }; // This card is in the shortHand

    // Reset the logger mock before the test
    mockLogger.warn.mock.resetCalls();

    // Call the function - should not throw, just log a warning
    const result = validateDealerDiscard(
      shortHandGameState,
      dealerRole,
      cardInShortHand,
      shortHand
    );

    // Verify the function returns true (valid discard)
    assert.strictEqual(
      result,
      true,
      'Should return true for valid discard even with warning'
    );

    // Verify the warning was logged using the mock logger's assertion
    assert.strictEqual(
      mockLogger.warn.mock.calls.length,
      1,
      'Should log exactly one warning'
    );

    // Get the first warning call
    const warnCalls = loggerCalls.filter(call => call.level === 'warn');
    assert.strictEqual(warnCalls.length, 1, 'Should log exactly one warning');

    const warning = warnCalls[0];

    // Verify the context has the expected properties
    assert.ok(warning.context, 'Context should be defined');
    assert.strictEqual(typeof warning.context, 'object', 'Context should be an object');
    assert.strictEqual(warning.context.playerRole, dealerRole, 'Context should include playerRole');
    assert.strictEqual(warning.context.handSize, 5, 'Context should include handSize');
    assert.strictEqual(warning.context.gameId, shortHandGameState.gameId, 'Context should include gameId');

    // Verify the warning message
    assert.match(
      warning.message,
      /Dealer's hand does not have 6 cards at the point of discard validation\./,
      'Should log the correct warning message'
    );
  });
});
});