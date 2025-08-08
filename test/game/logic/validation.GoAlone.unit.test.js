/**
 * @file test/game/logic/validation.GoAlone.unit.test.js
 * @module test/game/logic/validation.GoAlone.unit.test
 * @description
 *   Comprehensive unit tests for the `isValidGoAlone` validation function in Euchre.
 *   This file verifies the validation logic for go-alone declarations in the Euchre game.
 *
 * ## Test Coverage
 * - Valid go-alone declarations under correct conditions
 * - Error handling for invalid scenarios:
 *   - Invalid or missing player roles
 *   - Incorrect game phase (not GOING_ALONE_DECISION)
 *   - Turn order violations
 *   - Non-winning bidder attempting to go alone
 *   - Missing or invalid player data
 *   - Duplicate go-alone declarations
 * - Edge cases and boundary conditions
 * - Logging behavior for both success and error cases
 *
 * ## Test Setup
 * - Uses a mock logger to verify logging behavior
 * - Sets up a base game state for valid go-alone scenarios
 * - Tests both positive and negative test cases
 * - Verifies proper error types and messages
 *
 * @see {@link module:src/game/logic/validation-core} For the implementation being tested
 * @see {@link module:src/game/logic/validation-errors} For custom error types
 * @see {@link module:src/config/constants} For game constants and enums
 * @see {@link .windsurf/rules/jsdoc.md} For JSDoc standards
 *
 * @example
 * // Example of a valid go-alone test case
 * it('should return true for a valid go-alone declaration', () => {
 *   const result = isValidGoAlone(baseGameState, PLAYER_ROLES[0]);
 *   assert.strictEqual(result, true);
 * });
 *
 * @example
 * // Example of an invalid go-alone test case
 * it('should throw InvalidPhaseError when not in GO_ALONE_DECISION phase', () => {
 *   const invalidPhaseState = { ...baseGameState, gamePhase: GAME_PHASES.PLAYING };
 *   assert.throws(
 *     () => isValidGoAlone(invalidPhaseState, PLAYER_ROLES[0]),
 *     { name: 'InvalidPhaseError' }
 *   );
 * });
 *
 */

/**
 * Node.js test runner and assertion library imports.
 * @see {@link https://nodejs.org/api/test.html} Node.js test runner documentation
 * @see {@link https://nodejs.org/api/assert.html} Node.js assert module documentation
 */
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Test utilities and mock logger setup.
 * @see {@link module:test/test-utils/mock-logger} For mock logger implementation
 */
import { createMockLogger } from '../../test-utils/mock-logger.js';

/**
 * Mock logger instance used to verify logging behavior in tests.
 * @type {Object}
 * @property {Function} info - Mock function for info level logs
 * @property {Function} warn - Mock function for warn level logs
 * @property {Function} error - Mock function for error level logs
 * @property {Function} debug - Mock function for debug level logs
 */
const mockLogger = createMockLogger();

/**
 * Application logger module that will be mocked for testing.
 * @see {@link module:src/utils/logger} For the actual logger implementation
 */
import logger from '../../../src/utils/logger.js';

// Replace logger methods with our mocks
Object.defineProperties(logger, {
  info: { value: mockLogger.info, configurable: true },
  warn: { value: mockLogger.warn, configurable: true },
  error: { value: mockLogger.error, configurable: true },
  debug: { value: mockLogger.debug, configurable: true }
});

/**
 * Dynamically import the validation module to ensure proper mocking of dependencies.
 * @see {@link module:src/game/logic/validation-core} For the implementation being tested
 */
const validation = await import('../../../src/game/logic/validation-core.js');
const { isValidGoAlone } = validation;

/**
 * Game constants and error types used in tests.
 * @see {@link module:src/config/constants} For game constants
 * @see {@link module:src/game/logic/validation-errors} For custom error types
 */
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS } from '../../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  InvalidGoAloneError
} from '../../../src/game/logic/validation-errors.js';

/**
 * Test suite for the `isValidGoAlone` validation function.
 * @see {@link module:src/game/logic/validation-core.isValidGoAlone}
 */
describe('Validation Logic - isValidGoAlone', () => {
  /**
   * Base game state used for testing go-alone validation.
   * @type {Object}
   * @property {string} gamePhase - Current game phase
   * @property {string} currentPlayer - Current player's role
   * @property {string} winningBidder - Role of the winning bidder
   * @property {Object} players - Map of player roles to player objects
   * @property {number} round - Current round number
   * @property {number} trickCount - Number of tricks completed
   * @property {Object} currentTrick - Current trick information
   * @property {Array} deck - Game deck
   * @property {string} trumpSuit - Current trump suit
   * @property {string} leader - Current trick leader
   * @property {string|null} winningTeam - Currently winning team
   * @property {Object} scores - Team scores
   * @property {Array} gameHistory - History of game actions
   */
  let baseGameState;
  
  /**
   * Setup function that runs before each test case.
   * Resets all mocks and initializes a fresh game state.
   */
  beforeEach(() => {
    // Reset all mocks to ensure test isolation
    mock.reset();
    
    // Create a fresh mock logger instance to ensure clean state
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

  /**
   * Cleanup function that runs after each test case.
   * Restores all mocks to their original state.
   */
  afterEach(() => {
    mock.restoreAll();
  });

  /**
   * Tests that a valid go-alone declaration returns true.
   * Verifies that when all conditions are met (correct phase, player's turn,
   * winning bidder, etc.), the validation passes.
   */
  it('should return true for a valid go-alone declaration', () => {
    const result = isValidGoAlone(baseGameState, PLAYER_ROLES[0]);
    assert.strictEqual(result, true);
  });

  /**
   * Tests that an invalid player role throws a ValidationError.
   * Verifies proper error handling when an unrecognized player role is provided.
   */
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

  /**
   * Tests that a missing game state throws a ValidationError.
   * Verifies proper error handling when the game state is null or undefined.
   */
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

  /**
   * Tests that an InvalidPhaseError is thrown when not in the GO_ALONE_DECISION phase.
   * Verifies that the validation enforces the correct game phase for go-alone declarations.
   */
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

  /**
   * Tests that a NotPlayersTurnError is thrown when it's not the player's turn.
   * Verifies that only the current player can declare to go alone.
   */
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

  /**
   * Tests that an InvalidGoAloneError is thrown when a non-winning bidder attempts to go alone.
   * Verifies that only the winning bidder can declare to go alone.
   */
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

  /**
   * Tests that an InvalidGoAloneError is thrown when player data is missing from the game state.
   * Verifies proper error handling for invalid or missing player data.
   */
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

  /**
   * Tests that an InvalidGoAloneError is thrown when a player attempts to go alone again.
   * Verifies that a player cannot make multiple go-alone declarations.
   */
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

  /**
   * Tests that the validation works with a minimal valid game state.
   * Verifies that only the essential properties are required for a valid go-alone declaration.
   */
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

  /**
   * Tests that successful validation logs appropriate debug information.
   * Verifies both the content and structure of debug logs for successful validations.
   */
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

  /**
   * Tests that validation failures log appropriate error information.
   * Verifies both the content and structure of error logs for failed validations.
   */
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
