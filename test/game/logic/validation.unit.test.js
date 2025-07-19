/**
 * @file Unit tests for the Euchre game validation logic
 * @module test/game/logic/validation.unit.test
 * @description Comprehensive test suite for validating core game rules in Euchre.
 * 
 * Tests use Node's built-in test runner and assertion library.
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

// Simple logger mock implementation using node:test/mock
const loggerCalls = [];

function resetLoggerCalls() {
  loggerCalls.length = 0;
}

function getLoggerCalls(level) {
  return level
    ? loggerCalls.filter(call => call.level === level)
    : [...loggerCalls];
}

// Create logger mock functions with proper context handling
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

// Store the original logger methods
const originalLogger = {
  info: realLogger.logger.info,
  warn: realLogger.logger.warn,
  error: realLogger.logger.error,
  debug: realLogger.logger.debug
};

// Create mock deck utilities
function createMockDeck() {
  return {
    isLeftBower: (card, trumpSuit) => {
      if (!card || card.value !== VALUES.JACK) return false;
      if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) return true;
      if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) return true;
      if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) return true;
      if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS) return true;
      return false;
    },
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

// Setup and teardown for logger mocks
before(() => {
  // Replace the real logger methods with our mocks
  realLogger.logger.info = mockLogger.info;
  realLogger.logger.warn = mockLogger.warn;
  realLogger.logger.error = mockLogger.error;
  realLogger.logger.debug = mockLogger.debug;
});

after(() => {
  // Restore the original logger methods
  realLogger.logger.info = originalLogger.info;
  realLogger.logger.warn = originalLogger.warn;
  realLogger.logger.error = originalLogger.error;
  realLogger.logger.debug = originalLogger.debug;
});

// Reset logger calls before each test
beforeEach(() => {
  mockLogger.reset();
});

// Main test suite
describe('Validation Tests', () => {
  // Replace logger with mock before tests
  before(() => {
    mock.method(logger, 'info', mockLogger.info);
    mock.method(logger, 'warn', mockLogger.warn);
    mock.method(logger, 'error', mockLogger.error);
    mock.method(logger, 'debug', mockLogger.debug);
  });

  // Reset mocks before each test
  beforeEach(() => {
    mock.restoreAll();
    mockLogger.reset();
  });

  // Restore original logger methods after all tests
  after(() => {
    mock.restoreAll();
  });

  describe('Validation Logic - validateBid', () => {
    let validateBid;
    let baseBidGameState;

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

  afterEach(() => {
    // Reset all mocks
    mock.restoreAll();
    mockLogger.info.mock.resetCalls();
    mockLogger.warn.mock.resetCalls();
    mockLogger.error.mock.resetCalls();
    mockLogger.debug.mock.resetCalls();
    resetLoggerCalls();
  });

  it("should throw ValidationError if gameState is missing", () => {
    assert.throws(
      () => validateBid(null, PLAYER_ROLES[0], "pass"),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing required argument \'gameState\' for bid validation.'
      }
    );
  });

  it("should throw ValidationError if playerRole is missing", () => {
    assert.throws(
      () => validateBid(baseBidGameState, null, "pass"),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing required argument \'playerRole\' for bid validation.'
      }
    );
  });

  it("should throw ValidationError if decision is missing", () => {
    assert.throws(
      () => validateBid(baseBidGameState, PLAYER_ROLES[0], null),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing required argument \'decision\' for bid validation.'
      }
    );
  });

  it("should throw ValidationError if playerRole is invalid", () => {
    assert.throws(
      () => validateBid(baseBidGameState, "invalidRole", "pass"),
      {
        name: 'ValidationError',
        message: 'Invalid playerRole \'invalidRole\' for bid validation.'
      }
    );
  });

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

  describe("Round 1 Bidding (ORDER_UP_ROUND1)", () => {
    before(() => {
      baseBidGameState.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;
    });

    it('should allow "orderUp" decision', () => {
      assert.doesNotThrow(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "orderUp")
      );
      assert.strictEqual(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "orderUp"),
        true
      );
    });
    it('should allow "pass" decision', () => {
      assert.doesNotThrow(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")
      );
      assert.strictEqual(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "pass"),
        true
      );
    });
    it('should throw InvalidBidError for "callTrump" decision', () => {
      assert.throws(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump"),
        {
          name: 'InvalidBidError',
          message: `Invalid decision 'callTrump' for ${GAME_PHASES.ORDER_UP_ROUND1}.`
        }
      );
    });
    it("should throw InvalidBidError for other invalid decisions", () => {
      assert.throws(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "invalidDecision"),
        {
          name: 'InvalidBidError',
          message: `Invalid decision 'invalidDecision' for ${GAME_PHASES.ORDER_UP_ROUND1}.`
        }
      );
    });
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

  describe("Round 2 Bidding (ORDER_UP_ROUND2)", () => {
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
    it('should allow "pass" decision (if not stick the dealer)', () => {
      assert.doesNotThrow(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")
      );
      assert.strictEqual(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "pass"),
        true
      );
    });
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

describe("Validation Logic - validateDealerDiscard", () => {
  let validateDealerDiscard;
  let baseDiscardGameState;
  let dealerHand;
  let cardToDiscard;
  const dealerRole = PLAYER_ROLES[0];
  
  // Setup fresh test environment before each test
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
  
  // Clean up after each test
  afterEach(() => {
    mock.restoreAll();
    mockLogger.reset();
  });
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

  afterEach(() => {
    // Reset all mocks
    mock.restoreAll();
    mockLogger.info.mock.resetCalls();
    mockLogger.warn.mock.resetCalls();
    mockLogger.error.mock.resetCalls();
    mockLogger.debug.mock.resetCalls();
    resetLoggerCalls();
  });

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

  it("should throw NotPlayersTurnError if it is not the current player's turn (even if player is dealer)", () => {
    const notPlayersTurnState = {
      ...baseDiscardGameState,
      currentPlayer: PLAYER_ROLES[1], // Different from dealer
    };
    const error = assert.throws(
      () => validation.validateDealerDiscard(notPlayersTurnState, dealerRole, cardToDiscard, dealerHand),
      {
        name: 'NotPlayersTurnError',
        code: 'E_NOT_YOUR_TURN',
        playerRole: dealerRole,
        currentPlayer: notPlayersTurnState.currentPlayer
      }
    );
  });

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

  it("should return true for a valid discard scenario", () => {
    assert.doesNotThrow(
      () => validateDealerDiscard(baseDiscardGameState, dealerRole, cardToDiscard, dealerHand)
    );
  });

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

}); // Close the main test suite
