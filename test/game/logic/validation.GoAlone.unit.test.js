/**
 * @file Unit tests for the isValidGoAlone validation function
 * @module test/game/logic/validation.GoAlone.unit.test
 * @description Tests for validating go-alone declarations in Euchre.
 *
 * This test suite verifies the following validation logic:
 * - Valid go-alone declarations
 * - Invalid player roles
 * - Incorrect game phases
 * - Turn order enforcement
 * - Winning bidder validation
 * - Player data validation
 * - Edge cases and error conditions
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// First, import the mock logger utility and create a mock logger
import { createMockLogger } from '../../test-utils/mock-logger.js';

// Create a mock logger instance
const mockLogger = createMockLogger();

// Mock the logger module before importing the module under test
import logger from '../../../src/utils/logger.js';

// Replace logger methods with our mocks
Object.defineProperties(logger, {
  info: { value: mockLogger.info, configurable: true },
  warn: { value: mockLogger.warn, configurable: true },
  error: { value: mockLogger.error, configurable: true },
  debug: { value: mockLogger.debug, configurable: true }
});

// Now import the module under test
const validation = await import('../../../src/game/logic/validation.js');
const { isValidGoAlone } = validation;

// Import constants and errors
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS } from '../../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  InvalidGoAloneError
} from '../../../src/game/logic/errors.js';

describe('Validation Logic - isValidGoAlone', () => {
  let baseGameState;
  
  beforeEach(() => {
    // Reset all mocks
    mock.reset();
    
    // Reset the mock logger by creating a new instance
    const freshMock = createMockLogger();
    
    // Update the logger methods with fresh mocks
    Object.defineProperties(logger, {
      info: { value: freshMock.info, configurable: true },
      warn: { value: freshMock.warn, configurable: true },
      error: { value: freshMock.error, configurable: true },
      debug: { value: freshMock.debug, configurable: true }
    });
    
    // Setup base game state for valid go-alone scenario
    baseGameState = {
      gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
      currentPlayer: PLAYER_ROLES[0],
      winningBidder: PLAYER_ROLES[0],
      players: {
        [PLAYER_ROLES[0]]: { name: 'Player 1', isGoingAlone: undefined },
        [PLAYER_ROLES[1]]: { name: 'Player 2', isGoingAlone: undefined },
        [PLAYER_ROLES[2]]: { name: 'Player 3', isGoingAlone: undefined },
        [PLAYER_ROLES[3]]: { name: 'Player 4', isGoingAlone: undefined }
      },
      round: 1,
      trickCount: 0,
      currentTrick: { cards: {}, leader: PLAYER_ROLES[0] },
      deck: [],
      trumpSuit: SUITS.HEARTS,
      leader: PLAYER_ROLES[0],
      winningTeam: null,
      scores: { [TEAMS.NS]: 0, [TEAMS.EW]: 0 },
      gameHistory: []
    };
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should return true for a valid go-alone declaration', () => {
    const result = isValidGoAlone(baseGameState, PLAYER_ROLES[0]);
    assert.strictEqual(result, true);
  });

  it('should throw ValidationError for invalid player role', () => {
    assert.throws(
      () => isValidGoAlone(baseGameState, "invalid_role"),
      {
        name: 'ValidationError',
        message: /Invalid arguments for go-alone validation/
      },
      'Expected ValidationError to be thrown for invalid player role'
    );
  });

  it('should throw ValidationError for missing game state', () => {
    assert.throws(
      () => isValidGoAlone(null, PLAYER_ROLES[0]),
      {
        name: 'ValidationError',
        message: /Internal error: Missing required argument 'gameState' for go-alone validation/
      },
      'Expected ValidationError to be thrown for missing game state'
    );
  });

  it('should throw InvalidPhaseError when not in GO_ALONE_DECISION phase', () => {
    const invalidPhaseState = { ...baseGameState, gamePhase: GAME_PHASES.PLAYING };
    assert.throws(
      () => isValidGoAlone(invalidPhaseState, PLAYER_ROLES[0]),
      {
        name: 'InvalidPhaseError',
        message: /Cannot go alone in the current phase/
      },
      'Expected InvalidPhaseError to be thrown for wrong game phase'
    );
  });

  it('should throw NotPlayersTurnError when not the current player\'s turn', () => {
    const notPlayersTurnState = { ...baseGameState, currentPlayer: PLAYER_ROLES[1] };
    assert.throws(
      () => isValidGoAlone(notPlayersTurnState, PLAYER_ROLES[0]),
      {
        name: 'NotPlayersTurnError',
        message: new RegExp(`Not ${PLAYER_ROLES[0]}'s turn`)
      },
      'Expected NotPlayersTurnError to be thrown when not player\'s turn'
    );
  });

  it('should throw InvalidGoAloneError when player is not the winning bidder', () => {
    const notBidderState = { ...baseGameState, winningBidder: PLAYER_ROLES[1] };
    assert.throws(
      () => isValidGoAlone(notBidderState, PLAYER_ROLES[0]),
      {
        name: 'InvalidGoAloneError',
        message: 'Only the winning bidder can declare to go alone'
      },
      'Expected InvalidGoAloneError when player is not the winning bidder'
    );
  });

  it('should throw InvalidGoAloneError when player data is missing', () => {
    const missingPlayerState = {
      ...baseGameState,
      players: { ...baseGameState.players, [PLAYER_ROLES[0]]: undefined },
    };
    assert.throws(
      () => isValidGoAlone(missingPlayerState, PLAYER_ROLES[0]),
      {
        name: 'InvalidGoAloneError',
        message: new RegExp(`Player ${PLAYER_ROLES[0]} not found in game state`)
      },
      'Expected InvalidGoAloneError when player data is missing'
    );
  });

  it('should throw InvalidGoAloneError when go-alone decision was already made', () => {
    const alreadyDecidedState = {
      ...baseGameState,
      players: {
        ...baseGameState.players,
        [PLAYER_ROLES[0]]: { ...baseGameState.players[PLAYER_ROLES[0]], isGoingAlone: true },
      },
    };
    assert.throws(
      () => isValidGoAlone(alreadyDecidedState, PLAYER_ROLES[0]),
      {
        name: 'InvalidGoAloneError',
        message: new RegExp(`Player ${PLAYER_ROLES[0]} has already made their go-alone decision`)
      },
      'Expected InvalidGoAloneError when go-alone decision was already made'
    );
  });

  it('should handle edge case with minimal valid game state', () => {
    const minimalState = {
      gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
      currentPlayer: PLAYER_ROLES[2],
      winningBidder: PLAYER_ROLES[2],
      players: {
        [PLAYER_ROLES[2]]: { name: "Minimal Player" },
      },
    };
    const result = isValidGoAlone(minimalState, PLAYER_ROLES[2]);
    assert.strictEqual(result, true, 'Expected valid go-alone with minimal state');
  });

  it('should log debug information for successful validation', () => {
    // Ensure the game state is in the correct phase
    const testState = {
      ...baseGameState,
      gamePhase: GAME_PHASES.GOING_ALONE_DECISION
    };
    
    // Call the function
    const result = isValidGoAlone(testState, PLAYER_ROLES[0]);
    
    // Verify the result
    assert.strictEqual(result, true, 'Expected validation to pass');
    
    // Verify debug was called once
    assert.strictEqual(
      logger.debug.mock.callCount(), 
      1, 
      'Expected debug to be called once'
    );
    
    // Get the first call's arguments
    const [firstCall] = logger.debug.mock.calls;
    const [firstArg, secondArg] = firstCall.arguments;
    
    // Verify debug call arguments
    assert.strictEqual(
      firstArg, 
      'Go-alone validation successful', 
      'Expected debug message to match'
    );
    assert.strictEqual(
      secondArg.playerRole, 
      PLAYER_ROLES[0], 
      'Expected playerRole in debug info'
    );
    assert.strictEqual(
      secondArg.gamePhase, 
      GAME_PHASES.GOING_ALONE_DECISION, 
      'Expected gamePhase in debug info'
    );
  });

  it('should log error when validation fails', () => {
    // Create a state with an invalid phase for going alone
    const invalidState = { 
      ...baseGameState, 
      gamePhase: GAME_PHASES.PLAYING 
    };
    
    // Get the actual phase name from the constants
    const phaseName = GAME_PHASES.PLAYING;
    const expectedMessage = `Cannot go alone in the current phase: ${phaseName}`;
    
    // Test that it throws the expected error
    assert.throws(
      () => isValidGoAlone(invalidState, PLAYER_ROLES[0]),
      {
        name: 'InvalidPhaseError',
        message: new RegExp(expectedMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      },
      'Expected InvalidPhaseError to be thrown for wrong game phase'
    );
    
    // Verify error was called once
    assert.strictEqual(
      logger.error.mock.callCount(),
      1,
      'Expected error to be logged once'
    );
    
    // Get the first call's arguments
    const [firstCall] = logger.error.mock.calls;
    const [firstArg, secondArg] = firstCall.arguments;
    
    // Verify error call arguments
    assert.strictEqual(
      firstArg,
      'Invalid phase for go-alone',
      'Expected error message to match'
    );
    assert.strictEqual(
      secondArg.playerRole,
      PLAYER_ROLES[0],
      'Expected playerRole in error info'
    );
    assert.strictEqual(
      secondArg.gamePhase,
      GAME_PHASES.PLAYING,
      'Expected gamePhase in error info'
    );
    assert.strictEqual(
      secondArg.expectedPhase,
      'GO_ALONE_DECISION',
      'Expected expectedPhase in error info'
    );
  });
});
