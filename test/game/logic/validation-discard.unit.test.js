/**
 * @file Unit tests for validateDealerDiscard function
 * @module test/game/logic/validation-discard
 * @description
 *   Tests for the validateDealerDiscard function from validation-core.js.
 *   Covers dealer discard validation during the DEALER_DISCARD phase.
 *
 * @see {@link module:src/game/logic/validation-core#validateDealerDiscard}
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as validation from '../../../src/game/logic/validation-core.js';
import logger from '../../../src/utils/logger.js';
//
import {
  createMockLogger,
  createDiscardGameState,
  createCards,
  GAME_PHASES,
  SUITS,
  VALUES,
  PLAYER_ROLES,
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  InvalidDiscardError,
} from './validation-shared-setup.js';

/**
 * Test suite for the `validateDealerDiscard` function.
 * @namespace ValidationLogic_validateDealerDiscard
 */
describe("Validation Logic - validateDealerDiscard", () => {
  let validateDealerDiscard;
  let mockLogger;
  let baseDiscardGameState;
  let dealerHand;
  let cardToDiscard;
  const dealerRole = PLAYER_ROLES[0];
  
  // Track logger calls for specific assertions
  const loggerCalls = [];
  function resetLoggerCalls() {
    loggerCalls.length = 0;
  }

  beforeEach(() => {
    validateDealerDiscard = validation.validateDealerDiscard;
    mockLogger = createMockLogger();
    resetLoggerCalls();
    
    // Create custom logger tracking
    const trackingLogger = {
      info: mock.fn((...args) => {
        const context = args.length > 1 ? args[0] : {};
        const message = args.length > 1 ? args[1] : args[0];
        loggerCalls.push({ level: 'info', context, message, args: [...args] });
      }),
      warn: mock.fn((...args) => {
        const context = args.length > 1 ? args[0] : {};
        const message = args.length > 1 ? args[1] : args[0];
        loggerCalls.push({ level: 'warn', context, message, args: [...args] });
      }),
      error: mock.fn((...args) => {
        const context = args.length > 1 ? args[0] : {};
        const message = args.length > 1 ? args[1] : args[0];
        loggerCalls.push({ level: 'error', context, message, args: [...args] });
      }),
      debug: mock.fn((...args) => {
        const context = args.length > 1 ? args[0] : {};
        const message = args.length > 1 ? args[1] : args[0];
        loggerCalls.push({ level: 'debug', context, message, args: [...args] });
      })
    };

    mock.method(logger, 'info', trackingLogger.info);
    mock.method(logger, 'warn', trackingLogger.warn);
    mock.method(logger, 'error', trackingLogger.error);
    mock.method(logger, 'debug', trackingLogger.debug);

    // Setup base game state
    baseDiscardGameState = createDiscardGameState({
      stateOverrides: {
        currentPlayer: dealerRole,
        dealer: dealerRole,
        dealerDiscard: null,
        currentTrick: [],
        gameId: "test-discard-game",
      }
    });

    dealerHand = createCards("AH,KH,QH,JH,10H,9H");
    cardToDiscard = { id: '9H', suit: SUITS.HEARTS, value: '9' };
  });

  afterEach(() => {
    mock.restoreAll();
    resetLoggerCalls();
  });

  // Argument validation tests
  it("should throw ValidationError if gameState is missing", () => {
    assert.throws(
      () => validateDealerDiscard(null, dealerRole, { id: 'test' }, []),
      {
        name: 'ValidationError',
        message: "Internal error: Missing required argument 'gameState' for discard validation."
      }
    );
  });

  it("should throw ValidationError if playerRole is missing", () => {
    assert.throws(
      () => validateDealerDiscard(baseDiscardGameState, null, cardToDiscard, dealerHand),
      {
        name: 'ValidationError',
        code: 'GENERIC_VALIDATION_ERROR'
      }
    );
  });

  it("should throw ValidationError if cardToDiscard is missing", () => {
    assert.throws(
      () => validation.validateDealerDiscard(baseDiscardGameState, dealerRole, null, dealerHand),
      {
        name: 'ValidationError',
        code: 'GENERIC_VALIDATION_ERROR'
      }
    );
  });

  it("should throw ValidationError if dealerHand is missing", () => {
    assert.throws(
      () => validation.validateDealerDiscard(baseDiscardGameState, dealerRole, cardToDiscard, null),
      {
        name: 'ValidationError',
        code: 'GENERIC_VALIDATION_ERROR'
      }
    );
  });

  it("should throw ValidationError if cardToDiscard.id is missing", () => {
    assert.throws(
      () => validation.validateDealerDiscard(baseDiscardGameState, dealerRole, {}, dealerHand),
      {
        name: 'ValidationError',
        code: 'GENERIC_VALIDATION_ERROR'
      }
    );
  });

  // Phase validation
  it("should throw InvalidPhaseError if not in DEALER_DISCARD phase", () => {
    const invalidPhaseState = {
      ...baseDiscardGameState,
      gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
      currentPlayer: dealerRole,
      dealer: dealerRole,
      dealerDiscard: null,
      currentTrick: [],
      gameId: 'test-invalid-phase'
    };

    assert.throws(
      () => validateDealerDiscard(invalidPhaseState, dealerRole, cardToDiscard, dealerHand),
      {
        name: 'InvalidPhaseError',
        code: 'E_INVALID_PHASE',
        action: 'discard card',
        currentPhase: GAME_PHASES.ORDER_UP_ROUND1,
        expectedPhase: GAME_PHASES.DEALER_DISCARD
      }
    );
  });

  // Turn validation
  it("should throw NotPlayersTurnError if playerRole is not the dealer", () => {
    const nonDealerRole = PLAYER_ROLES[1];
    const gameState = {
      ...baseDiscardGameState,
      dealer: dealerRole,
      currentPlayer: nonDealerRole,
    };
    
    assert.throws(
      () => validation.validateDealerDiscard(gameState, nonDealerRole, cardToDiscard, dealerHand),
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
      currentPlayer: PLAYER_ROLES[1],
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

  // Card validation
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

  // Valid discard
  it("should return true for a valid discard scenario", () => {
    assert.doesNotThrow(
      () => validateDealerDiscard(baseDiscardGameState, dealerRole, cardToDiscard, dealerHand)
    );
  });

  // Logging test
  it("should log a warning if dealer's hand does not have 6 cards", () => {
    const shortHandGameState = {
      ...baseDiscardGameState,
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      currentPlayer: dealerRole,
      dealer: dealerRole,
      dealerDiscard: null,
      currentTrick: [],
      gameId: 'test-game-id'
    };

    const shortHand = createCards("AH,KH,QH,JH,10H");
    const cardInShortHand = { id: 'AH' };

    const result = validateDealerDiscard(shortHandGameState, dealerRole, cardInShortHand, shortHand);

    assert.strictEqual(result, true, 'Should return true for valid discard even with warning');

    // Verify warning was logged
    const warnCalls = loggerCalls.filter(call => call.level === 'warn');
    assert.strictEqual(warnCalls.length, 1, 'Should log exactly one warning');

    const warning = warnCalls[0];
    assert.ok(warning.context, 'Context should be defined');
    assert.strictEqual(warning.context.playerRole, dealerRole, 'Context should include playerRole');
    assert.strictEqual(warning.context.handSize, 5, 'Context should include handSize');
    assert.match(warning.message, /Dealer's hand does not have 6 cards/, 'Should log the correct warning message');
  });

  // Turn card validation
  it("should throw InvalidDiscardError if dealer tries to discard the turn card", () => {
    const turnCard = { id: "9H", suit: SUITS.HEARTS, value: "9" };
    const gameStateWithTurnCard = {
      ...baseDiscardGameState,
      turnCard: turnCard,
    };
    
    const dealerHandWithTurnCard = [...dealerHand, turnCard];

    assert.throws(
      () => validateDealerDiscard(gameStateWithTurnCard, dealerRole, turnCard, dealerHandWithTurnCard),
      {
        name: 'InvalidDiscardError',
        message: 'Cannot discard the turn card (upcard).'
      }
    );
  });
});
