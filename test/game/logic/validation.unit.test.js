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
import * as validation from '../../../src/game/logic/validation.js';
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
} from '../../../src/game/logic/errors.js';

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

// Create logger mock functions
const mockLogger = {
  info: mock.fn((...args) => loggerCalls.push({ level: 'info', args })),
  warn: mock.fn((...args) => loggerCalls.push({ level: 'warn', args })),
  error: mock.fn((...args) => loggerCalls.push({ level: 'error', args })),
  debug: mock.fn((...args) => loggerCalls.push({ level: 'debug', args })),
  reset: resetLoggerCalls,
  getCalls: getLoggerCalls
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
    if (loggerMock && typeof loggerMock.resetCalls === 'function') {
      loggerMock.resetCalls();
    }
  });

  it("should throw ValidationError if gameState is missing", () => {
    assert.throws(
      () => validateBid(null, PLAYER_ROLES[0], "pass"),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing or invalid data for bid validation.'
      }
    );
  });

  it("should throw ValidationError if playerRole is missing", () => {
    assert.throws(
      () => validateBid(baseBidGameState, null, "pass"),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing or invalid data for bid validation.'
      }
    );
  });

  it("should throw ValidationError if decision is missing", () => {
    assert.throws(
      () => validateBid(baseBidGameState, PLAYER_ROLES[0], null),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing or invalid data for bid validation.'
      }
    );
  });

  it("should throw ValidationError if playerRole is invalid", () => {
    assert.throws(
      () => validateBid(baseBidGameState, "invalidRole", "pass"),
      {
        name: 'ValidationError',
        message: 'Internal error: Missing or invalid data for bid validation.'
      }
    );
  });

  it("should throw NotPlayersTurnError if it is not the current player's turn", () => {
    const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[1] };
    assert.throws(
      () => validateBid(gameState, PLAYER_ROLES[0], "pass"),
      {
        name: 'NotPlayersTurnError',
        message: `Not ${PLAYER_ROLES[0]}'s turn. It is ${PLAYER_ROLES[1]}'s turn.`
      }
    );
  });

  it("should throw InvalidPhaseError if bidding is attempted outside bidding phases", () => {
    const gameState = { ...baseBidGameState, gamePhase: GAME_PHASES.PLAYING };
    assert.throws(
      () => validateBid(gameState, PLAYER_ROLES[0], "pass"),
      {
        name: 'InvalidPhaseError',
        message: `Cannot make bid decision during ${GAME_PHASES.PLAYING} phase.`
      }
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
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "pass"),
      ).to.not.throw();
      expect(validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")).to.equal(
        true,
      );
    });
    it('should throw InvalidBidError for "callTrump" decision', () => {
      expect(() =>
        validateBid(
          baseBidGameState,
          PLAYER_ROLES[0],
          "callTrump",
          SUITS.CLUBS,
        ),
      ).to.throw(
        InvalidBidError,
        `Invalid decision 'callTrump' for ${GAME_PHASES.ORDER_UP_ROUND1}.`,
      );
    });
    it("should throw InvalidBidError for other invalid decisions", () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "invalidDecision"),
      ).to.throw(
        InvalidBidError,
        `Invalid decision 'invalidDecision' for ${GAME_PHASES.ORDER_UP_ROUND1}.`,
      );
    });
    it('should allow dealer to "orderUp" (accept turn card)', () => {
      const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[3] };
      expect(() =>
        validateBid(gameState, PLAYER_ROLES[3], "orderUp"),
      ).to.not.throw();
    });
    it('should allow dealer to "pass"', () => {
      const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[3] };
      expect(() =>
        validateBid(gameState, PLAYER_ROLES[3], "pass"),
      ).to.not.throw();
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
      assert.doesNotThrow(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", SUITS.CLUBS)
      );
      assert.strictEqual(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", SUITS.CLUBS),
        true
      );
    });
    it('should allow "pass" decision (if not stick the dealer)', () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "pass"),
      ).to.not.throw();
      expect(validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")).to.equal(
        true,
      );
    });
    it('should throw InvalidBidError for "orderUp" decision', () => {
      assert.throws(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "orderUp"),
        {
          name: 'InvalidBidError',
          message: `Invalid decision 'orderUp' for ${GAME_PHASES.ORDER_UP_ROUND2}.`
        }
      );
    });
    it('should throw InvalidBidError for "callTrump" with an invalid suit string', () => {
      assert.throws(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", "invalidSuit"),
        {
          name: 'InvalidBidError',
          message: "Invalid suit provided for callTrump decision."
        }
      );
    });
    it('should throw InvalidBidError for "callTrump" with no suit', () => {
      assert.throws(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", null),
        {
          name: 'InvalidBidError',
          message: "Invalid suit provided for callTrump decision."
        }
      );
    });
    it('should throw InvalidBidError for "callTrump" with the turned down suit', () => {
      assert.throws(
        () => validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", SUITS.SPADES),
        {
          name: 'InvalidBidError',
          message: `Cannot call the suit that was turned down (${SUITS.SPADES}).`
        }
      );
    });
  });
});

describe("Validation Logic - validateDealerDiscard", () => {
  let validateDealerDiscard;
  let baseDiscardGameState;
  let dealerHand;
  const dealerRole = PLAYER_ROLES[0];
  const cardToDiscard = { id: "TC", suit: SUITS.CLUBS, value: VALUES.TEN };

  before(() => {
    // Reset mock logger
    Object.values(loggerMock).forEach(fn => fn.mock.resetCalls());
    
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
    if (loggerMock && typeof loggerMock.resetCalls === 'function') {
      loggerMock.resetCalls();
    }
  });

  it("should throw ValidationError if gameState is missing", () => {
    assert.throws(
      () => validation.validateDealerDiscard(null, 'north', { id: 'test' }, []),
      {
        name: 'ValidationError',
        message: "Internal error: Missing required argument 'gameState' for discard validation."
      },
    );
  });

  it("should throw ValidationError if playerRole is missing", () => {
    assert.throws(
      () => validation.validateDealerDiscard(
        baseDiscardGameState,
        null,
        cardToDiscard,
        dealerHand,
      ),
      {
        name: 'ValidationError',
        message: "Internal error: Missing required argument 'playerRole' for discard validation."
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
        message: "Internal error: Missing required argument 'cardToDiscard' for discard validation."
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
        message: "Internal error: Missing required argument 'playerHand' for discard validation."
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
        message: "Internal error: Missing required argument 'cardToDiscard.id' for discard validation."
      },
      'Should throw when cardToDiscard.id is missing'
    );
  });

  it("should throw InvalidPhaseError if not in DEALER_DISCARD phase", () => {
    // Create a copy of the base state with a different phase
    const invalidPhaseState = JSON.parse(JSON.stringify({
      ...baseDiscardGameState,
      gamePhase: GAME_PHASES.BIDDING, // Not DEALER_DISCARD
      currentPlayer: dealerRole,
      dealer: dealerRole,
      dealerDiscard: null,
      currentTrick: []
    }));
    
    // Test that the function throws the expected error
    try {
      validation.validateDealerDiscard(
        invalidPhaseState, 
        dealerRole, 
        cardToDiscard, 
        dealerHand
      );
      assert.fail('Expected validateDealerDiscard to throw InvalidPhaseError');
    } catch (error) {
      // Verify the error type and message
      assert.strictEqual(error.name, 'InvalidPhaseError');
      assert.match(
        error.message, 
        /Cannot discard card during .* phase\./,
        'Should include phase name in error message'
      );
      
      // Verify the phase in the error message matches the actual phase
      assert(
        error.message.includes(GAME_PHASES.BIDDING),
        `Error message should mention '${GAME_PHASES.BIDDING}' phase`
      );
    }
  });

  it("should throw InvalidDiscardError if playerRole is not the dealer", () => {
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
        name: 'InvalidDiscardError',
        message: `Only the dealer (${dealerRole}) can discard. Player ${nonDealerRole} attempted.`,
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
        message: `Not ${dealerRole}'s turn. It is ${notPlayersTurnState.currentPlayer}'s turn.`
      }
    );
  });

  it("should throw CardNotInHandError if cardToDiscard is not in dealerHand", () => {
    const cardNotInHand = { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN };
    assert.throws(
      () => validation.validateDealerDiscard(baseDiscardGameState, dealerRole, cardNotInHand, dealerHand),
      {
        name: 'CardNotInHandError',
        message: `Card ${cardNotInHand.id} is not in dealer's hand to discard.`
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
    const shortHandGameState = JSON.parse(JSON.stringify({
      ...baseDiscardGameState,
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      currentPlayer: dealerRole,
      dealer: dealerRole,
      dealerDiscard: null,
      currentTrick: []
    }));
    
    // Create a hand with only 5 cards
    const shortHand = JSON.parse(JSON.stringify(dealerHand)).slice(0, 5);
    
    // Reset the logger mock before the test
    loggerMock.mock.resetCalls();
    
    // Call the function - should not throw, just log a warning
    const result = validation.validateDealerDiscard(
      shortHandGameState, 
      dealerRole, 
      cardToDiscard, 
      shortHand
    );
    
    // Verify the function returns true (valid discard)
    assert.strictEqual(
      result, 
      true, 
      'Should return true for valid discard even with warning'
    );
    
    // Verify the warning was logged
    assert.strictEqual(
      loggerMock.mock.calls.length, 
      1, 
      'Should log exactly one warning'
    );
    
    // Get the warning call details
    const warningCall = loggerMock.mock.calls[0];
    
    // Verify the warning message
    assert.match(
      warningCall.message || warningCall,
      /Dealer's hand does not have 6 cards at the point of discard validation\./,
      'Should log warning about hand size'
    );
    
    // Verify the metadata
    const meta = warningCall.meta || warningCall[1] || {};
    assert.strictEqual(
      meta.playerRole, 
      dealerRole, 
      'Should include player role in warning metadata'
    );
    assert.strictEqual(
      meta.handSize, 
      5, 
      'Should include actual hand size in warning metadata'
    );
    assert.ok(
      meta.gameId, 
      'Should include game ID in warning metadata'
    );
  });

});

}); // Close the main test suite
