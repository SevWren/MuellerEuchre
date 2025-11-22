/**
 * @file Unit tests for validateBid function
 * @module test/game/logic/validation-bid
 * @description
 *   Tests for the validateBid function from validation-core.js.
 *   Covers both Round 1 (ORDER_UP_ROUND1) and Round 2 (ORDER_UP_ROUND2) bidding scenarios.
 *
 * @see {@link module:src/game/logic/validation-core#validateBid}
 */

import { describe, it, before, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as validation from '../../../src/game/logic/validation-core.js';
import logger from '../../../src/utils/logger.js';
import {
  createMockLogger,
  GAME_PHASES,
  SUITS,
  VALUES,
  PLAYER_ROLES,
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  InvalidBidError,
} from './validation-shared-setup.js';

describe('Validation Logic - validateBid', () => {
  let validateBid;
  let baseBidGameState;
  let mockLogger;

  beforeEach(() => {
    validateBid = validation.validateBid;
    mockLogger = createMockLogger();
    
    // Mock logger methods
    mock.method(logger, 'info', mockLogger.info);
    mock.method(logger, 'warn', mockLogger.warn);
    mock.method(logger, 'error', mockLogger.error);
    mock.method(logger, 'debug', mockLogger.debug);

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
    mock.restoreAll();
  });

  // Argument validation tests
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

  // Turn order validation
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

  // Phase validation
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

  // Round 1 Bidding Tests
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

  // Round 2 Bidding Tests
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
