/**
 * Unit tests for the Lobby Phase game logic.
 * @module test/game/phases/lobbyPhase.unit.test
 * @see {@link module:src/game/phases/lobbyPhase} for the implementation being tested
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Statically import dependencies that will be mocked
import * as logger from '../../../src/utils/logger.js';

// Import constants and errors directly
import { GAME_PHASES, PLAYER_ROLES } from '../../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  PhaseLogicError,
} from '../../../src/game/logic/validation-errors.js';

/**
 * Creates a mock game state for testing the lobby phase.
 *
 * @param {string} [phase=GAME_PHASES.LOBBY] - The game phase to set.
 * @param {number} [connectedPlayerCount=4] - Number of connected players to simulate.
 * @returns {Object} A mock game state object with the specified phase and players.
 * @property {string} gameId - The game identifier.
 * @property {string} gamePhase - The current game phase.
 * @property {Object} players - Object mapping player roles to player objects.
 * @property {Array} gameMessages - Array of game messages.
 * @property {string} dealer - The dealer's player role.
 * @see {@link module:src/config/constants} for GAME_PHASES and PLAYER_ROLES
 */
const createLobbyGameState = (
  phase = GAME_PHASES.LOBBY,
  connectedPlayerCount = 4,
) => {
  const gameState = {
    gameId: 'lobbyTestGame',
    gamePhase: phase,
    players: {},
    gameMessages: [],
    dealer: PLAYER_ROLES[0], // Default dealer
  };

  for (let i = 0; i < PLAYER_ROLES.length; i++) {
    const role = PLAYER_ROLES[i];
    gameState.players[role] = {
      id: role,
      name: `Player ${i + 1}`,
      isConnected: i < connectedPlayerCount,
      isActive: i < connectedPlayerCount,
      teamId: i % 2 === 0 ? 'NS' : 'EW',
    };
  }
  return gameState;
};

/**
 * Test suite for the Lobby Phase logic.
 * @see {@link module:src/game/phases/lobbyPhase}
 */
describe('LobbyPhase Logic', () => {
  let attemptToStartGame;
  
  /**
   * Setup before each test case.
   * - Mocks the logger methods
   * - Dynamically imports the module under test
   * @see {@link module:node:test} for mocking utilities
   */
  beforeEach(async () => {
    // Mock the logger methods
    mock.method(logger.default, 'info');
    mock.method(logger.default, 'warn');
    mock.method(logger.default, 'error');
    mock.method(logger.default, 'debug');
    
    // Dynamically import the module under test after setting up mocks
    const lobbyPhaseModule = await import('../../../src/game/phases/lobbyPhase.js');
    attemptToStartGame = lobbyPhaseModule.attemptToStartGame;
  });

  /**
   * Cleanup after each test case.
   * Restores all mocks to their original state.
   */
  afterEach(() => {
    // Restore all mocks
    mock.restoreAll();
  });

  /**
   * Test validation of input arguments.
   * @see {@link module:src/game/logic/validation-errors.ValidationError}
   */
  describe('Input Validation', () => {
    it('should throw ValidationError if currentGameState is null', () => {
      assert.throws(
        () => attemptToStartGame(null, PLAYER_ROLES[0]),
        {
          name: 'ValidationError',
          message: 'Internal error: Missing currentGameState or requestingPlayerRole to start game.',
        },
      );
    });

    it('should throw ValidationError if requestingPlayerRole is missing', () => {
      const gameState = createLobbyGameState();
      assert.throws(
        () => attemptToStartGame(gameState, null),
        {
          name: 'ValidationError',
          message: 'Internal error: Missing currentGameState or requestingPlayerRole to start game.',
        },
      );
    });
  });

  /**
   * Test phase and player count validation.
   * @see {@link module:src/game/logic/validation-errors.InvalidPhaseError}
   */
  describe('Phase and Player Validation', () => {
    it('should throw InvalidPhaseError if game is not in LOBBY phase', () => {
      const gameState = createLobbyGameState(GAME_PHASES.PLAYING, 4);

      // We'll use a try-catch to verify the error since the error message is being modified
      try {
        attemptToStartGame(gameState, PLAYER_ROLES[0]);
        assert.fail('Expected InvalidPhaseError to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'InvalidPhaseError');
        assert.match(error.message, /Cannot Game cannot be started from GAME_PHASE_PLAYING phase/);
      }
    });

    it('should throw PhaseLogicError if not enough players are connected', () => {
      const gameState = createLobbyGameState(GAME_PHASES.LOBBY, 3); // Only 3 players connected
      assert.throws(
        () => attemptToStartGame(gameState, PLAYER_ROLES[0]),
        {
          name: 'PhaseLogicError',
          message: 'Not enough players to start. Need 4, have 3.',
        },
      );
    });
  });

  /**
   * Test successful game start scenarios.
   * @see {@link module:src/game/phases/lobbyPhase.attemptToStartGame}
   */
  describe('Success Paths', () => {
    it('should successfully transition to DEALING phase with 4 connected players', () => {
      const gameState = createLobbyGameState(GAME_PHASES.LOBBY, 4);
      const requestingPlayer = PLAYER_ROLES[0];

      const result = attemptToStartGame(gameState, requestingPlayer);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.updatedGameState.gamePhase, GAME_PHASES.DEALING);
      assert.strictEqual(result.message, 'Game successfully transitioned to DEALING phase.');
      assert.strictEqual(result.updatedGameState.gameMessages.length, 1);
      assert.match(result.updatedGameState.gameMessages[0].text, /Game started by Player 1/);
    });
  });
});