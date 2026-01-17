/**
 * @file Unit tests for isValidGoAlone function
 * @module test/game/logic/validation-go-alone
 * @description
 *   Tests for the isValidGoAlone function from validation-core.js.
 *   Covers go-alone validation during the GOING_ALONE_DECISION phase.
 *
 * @see {@link module:src/game/logic/validation-core#isValidGoAlone}
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as validation from '../../../src/game/logic/validation-core.js';
import logger from '../../../src/utils/logger.js';
import {
  createMockLogger,
  createGoAloneGameState,
  GAME_PHASES,
  PLAYER_ROLES,
  ValidationError,
  InvalidPhaseError,
  InvalidGoAloneError,
} from './validation-shared-setup.js';

describe("Validation Logic - isValidGoAlone", () => {
  let isValidGoAlone;
  let mockLogger;
  let baseGoAloneState;
  const playerRole = PLAYER_ROLES[0];

  beforeEach(() => {
    isValidGoAlone = validation.isValidGoAlone;
    mockLogger = createMockLogger();
    
    mock.method(logger, 'info', mockLogger.info);
    mock.method(logger, 'warn', mockLogger.warn);
    mock.method(logger, 'error', mockLogger.error);
    mock.method(logger, 'debug', mockLogger.debug);

    baseGoAloneState = createGoAloneGameState({
      stateOverrides: {
        currentPlayer: playerRole,
        winningBidder: playerRole,
        goAloneDecision: null,
        gameId: "test-go-alone-game",
      }
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  // Argument validation
  it("should throw ValidationError if gameState is missing", () => {
    assert.throws(
      () => isValidGoAlone(null, playerRole, true),
      {
        name: 'ValidationError',
        message: /Missing required argument 'gameState'/
      }
    );
  });

  it("should throw ValidationError if playerRole is missing", () => {
    assert.throws(
      () => isValidGoAlone(baseGoAloneState, null, true),
      {
        name: 'ValidationError',
        message: /Missing required argument 'playerRole'/
      }
    );
  });

  // Note: isValidGoAlone only takes 2 parameters (gameState, playerRole)
  // The goAlone decision is not validated as a parameter

  // Phase validation
  it("should throw InvalidPhaseError if not in GOING_ALONE_DECISION phase", () => {
    const invalidPhaseState = {
      ...baseGoAloneState,
      gamePhase: GAME_PHASES.PLAYING
    };
    
    assert.throws(
      () => isValidGoAlone(invalidPhaseState, playerRole, true),
      {
        name: 'InvalidPhaseError'
      }
    );
  });

  // Player validation - turn order is checked BEFORE winning bidder
  it("should throw NotPlayersTurnError if not current player", () => {
    const nonBidderRole = PLAYER_ROLES[1];
    
    assert.throws(
      () => isValidGoAlone(baseGoAloneState, nonBidderRole),
      {
        name: 'NotPlayersTurnError'
      }
    );
  });

  it("should throw InvalidGoAloneError if player is not the winning bidder", () => {
    const nonWinningBidder = PLAYER_ROLES[1];
    const gameState = {
      ...baseGoAloneState,
      currentPlayer: nonWinningBidder,  // Make it their turn
      winningBidder: playerRole,  // But they're not the winning bidder
    };
    
    assert.throws(
      () => isValidGoAlone(gameState, nonWinningBidder),
      {
        name: 'InvalidGoAloneError',
        message: /Only the winning bidder can declare to go alone/
      }
    );
  });

  // Already decided - stored in player object
  it("should throw InvalidGoAloneError if go-alone decision already made", () => {
    const gameState = {
      ...baseGoAloneState,
      players: {
        [playerRole]: { isGoingAlone: false },  // Decision already made
        [PLAYER_ROLES[1]]: {},
        [PLAYER_ROLES[2]]: {},
        [PLAYER_ROLES[3]]: {},
      }
    };
    
    assert.throws(
      () => isValidGoAlone(gameState, playerRole),
      {
        name: 'InvalidGoAloneError',
        message: /already made their go-alone decision/
      }
    );
  });

  // Valid scenario
  it("should return true for valid go-alone decision", () => {
    const gameState = {
      ...baseGoAloneState,
      players: {
        [playerRole]: {},  // No isGoingAlone property yet
        [PLAYER_ROLES[1]]: {},
        [PLAYER_ROLES[2]]: {},
        [PLAYER_ROLES[3]]: {},
      }
    };
    
    assert.strictEqual(
      isValidGoAlone(gameState, playerRole),
      true
    );
  });
});
