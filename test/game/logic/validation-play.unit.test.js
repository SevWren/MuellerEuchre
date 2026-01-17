/**
 * @file Unit tests for card play validation functions
 * @module test/game/logic/validation-play
 * @description
 *   Tests for getEffectiveSuit and validatePlay functions from validation-core.js.
 *   Covers suit logic, trump handling, Left/Right Bower mechanics, and follow-suit rules.
 *
 * @see {@link module:src/game/logic/validation-core#getEffectiveSuit}
 * @see {@link module:src/game/logic/validation-core#validatePlay}
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as validation from '../../../src/game/logic/validation-core.js';
import logger from '../../../src/utils/logger.js';
import {
  createMockLogger,
  createPlayGameState,
  createCards,
  getCard,
  GAME_PHASES,
  SUITS,
  VALUES,
  PLAYER_ROLES,
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
} from './validation-shared-setup.js';

describe("Validation Logic - getEffectiveSuit", () => {
  let getEffectiveSuit;
  let mockLogger;

  beforeEach(() => {
    getEffectiveSuit = validation.getEffectiveSuit;
    mockLogger = createMockLogger();
    mock.restoreAll();
    mock.method(logger, 'warn', mockLogger.warn);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("should return null if card is null", () => {
    assert.strictEqual(getEffectiveSuit(null, SUITS.HEARTS), null);
  });

  it("should return card suit for non-bower cards", () => {
    const card = { id: "9H", suit: SUITS.HEARTS, value: "9" };
    assert.strictEqual(getEffectiveSuit(card, SUITS.SPADES), SUITS.HEARTS);
  });

  it("should return trump suit for Right Bower", () => {
    const card = { id: "JH", suit: SUITS.HEARTS, value: "J" };
    assert.strictEqual(getEffectiveSuit(card, SUITS.HEARTS), SUITS.HEARTS);
  });

  it("should return trump suit for Left Bower", () => {
    // Jack of Diamonds is Left Bower when Hearts is trump
    const card = { id: "JD", suit: SUITS.DIAMONDS, value: "J" };
    assert.strictEqual(getEffectiveSuit(card, SUITS.HEARTS), SUITS.HEARTS);
  });
});

describe("Validation Logic - validatePlay", () => {
  let validatePlay;
  let mockLogger;
  let baseGameState;
  const playerRole = PLAYER_ROLES[0];

  beforeEach(() => {
    validatePlay = validation.validatePlay;
    mockLogger = createMockLogger();
    
    mock.method(logger, 'info', mockLogger.info);
    mock.method(logger, 'warn', mockLogger.warn);
    mock.method(logger, 'error', mockLogger.error);
    mock.method(logger, 'debug', mockLogger.debug);

    baseGameState = createPlayGameState({
      stateOverrides: {
        currentPlayer: playerRole,
        trumpSuit: SUITS.HEARTS,
        currentTrick: [],
      }
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  // Argument validation tests
  it("should throw ValidationError if gameState is missing", () => {
    const hand = createCards("9H,10H");
    const cardToPlay = getCard("9H");
    
    assert.throws(
      () => validatePlay(null, hand, cardToPlay, playerRole),
      {
        name: 'ValidationError',
        message: 'gameState is required'
      }
    );
  });

  it("should throw ValidationError if playerHand is missing", () => {
    const cardToPlay = getCard("9H");
    
    assert.throws(
      () => validatePlay(baseGameState, null, cardToPlay, playerRole),
      {
        name: 'ValidationError',
        message: 'playerHand must be an array'
      }
    );
  });

  it("should throw ValidationError if cardToPlay is missing", () => {
    const hand = createCards("9H,10H");
    
    assert.throws(
      () => validatePlay(baseGameState, hand, null, playerRole),
      {
        name: 'ValidationError',
        message: 'cardToPlay is required'
      }
    );
  });

  it("should throw ValidationError if playerRole is missing", () => {
    const hand = createCards("9H,10H");
    const cardToPlay = getCard("9H");
    
    assert.throws(
      () => validatePlay(baseGameState, hand, cardToPlay, null),
      {
        name: 'ValidationError',
        message: 'playerRole is required'
      }
    );
  });

  it("should throw ValidationError if cardToPlay.id is missing", () => {
    const hand = createCards("9H,10H");
    const cardToPlay = { suit: SUITS.HEARTS, value: "9" }; // Missing id
    
    assert.throws(
      () => validatePlay(baseGameState, hand, cardToPlay, playerRole),
      {
        name: 'ValidationError',
        message: 'cardToPlay.id is required'
      }
    );
  });

  // Phase validation
  it("should throw InvalidPhaseError if not in PLAYING phase", () => {
    const gameState = {
      ...baseGameState,
      gamePhase: GAME_PHASES.ORDER_UP_ROUND1
    };
    const hand = createCards("9H,10H");
    const cardToPlay = getCard("9H");
    
    assert.throws(
      () => validatePlay(gameState, hand, cardToPlay, playerRole),
      {
        name: 'InvalidPhaseError'
      }
    );
  });

  // Turn validation
  it("should throw NotPlayersTurnError if not player's turn", () => {
    const gameState = {
      ...baseGameState,
      currentPlayer: PLAYER_ROLES[1]
    };
    const hand = createCards("9H,10H");
    const cardToPlay = getCard("9H");
    
    assert.throws(
      () => validatePlay(gameState, hand, cardToPlay, playerRole),
      {
        name: 'NotPlayersTurnError'
      }
    );
  });

  // Card in hand validation
  it("should throw CardNotInHandError if card not in hand", () => {
    const hand = createCards("9H,10H");
    const cardToPlay = getCard("AS"); // Not in hand
    
    assert.throws(
      () => validatePlay(baseGameState, hand, cardToPlay, playerRole),
      {
        name: 'CardNotInHandError'
      }
    );
  });

  // Valid play scenarios
  it("should return true for valid play when leading (first card)", () => {
    const hand = createCards("9H,10H,AS");
    const cardToPlay = getCard("9H");
    
    assert.strictEqual(
      validatePlay(baseGameState, hand, cardToPlay, playerRole),
      true
    );
  });

  it("should return true for valid play following suit", () => {
    const gameState = {
      ...baseGameState,
      currentTrick: [
        { playedBy: PLAYER_ROLES[1], card: getCard("QH") }
      ]
    };
    const hand = createCards("9H,10H,AS");
    const cardToPlay = getCard("9H"); // Following hearts
    
    assert.strictEqual(
      validatePlay(gameState, hand, cardToPlay, playerRole),
      true
    );
  });

  it("should return true when throwing off (no cards of led suit)", () => {
    const gameState = {
      ...baseGameState,
      currentTrick: [
        { playedBy: PLAYER_ROLES[1], card: getCard("QC") }
      ]
    };
    const hand = createCards("9H,10H,AS"); // No clubs
    const cardToPlay = getCard("AS"); // Throw off with spade
    
    assert.strictEqual(
      validatePlay(gameState, hand, cardToPlay, playerRole),
      true
    );
  });

  // Follow suit enforcement
  it("should throw MustFollowSuitError when not following suit", () => {
    const gameState = {
      ...baseGameState,
      currentTrick: [
        { playedBy: PLAYER_ROLES[1], card: getCard("QC") }
      ]
    };
    const hand = createCards("9C,10H,AS"); // Has a club
    const cardToPlay = getCard("AS"); // Not following suit
    
    assert.throws(
      () => validatePlay(gameState, hand, cardToPlay, playerRole),
      {
        name: 'MustFollowSuitError'
      }
    );
  });

  // Left Bower scenarios
  it("should treat Left Bower as trump when led", () => {
    const gameState = {
      ...baseGameState,
      trumpSuit: SUITS.HEARTS,
      currentTrick: [
        { playedBy: PLAYER_ROLES[1], card: getCard("JD") } // Left Bower (when hearts is trump)
      ]
    };
    const hand = createCards("9H,AS,KC"); // Has a heart (trump)
    const cardToPlay = getCard("9H"); // Playing trump to follow Left Bower
    
    assert.strictEqual(
      validatePlay(gameState, hand, cardToPlay, playerRole),
      true
    );
  });

  it("should enforce following trump when Left Bower is led", () => {
    const gameState = {
      ...baseGameState,
      trumpSuit: SUITS.HEARTS,
      currentTrick: [
        { playedBy: PLAYER_ROLES[1], card: getCard("JD") } // Left Bower
      ]
    };
    const hand = createCards("9H,AS,KC"); // Has a heart (trump)
    const cardToPlay = getCard("AS"); // Not following trump
    
    assert.throws(
      () => validatePlay(gameState, hand, cardToPlay, playerRole),
      {
        name: 'MustFollowSuitError',
        message: /Must play a trump card when the Left Bower is led/
      }
    );
  });
});
