// test/game/phases/lobbyPhase.unit.test.js

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
} from '../../../src/game/logic/validation-errors.js'; //file was moved for restructuring and merged into validation-errors.js

// Helper to create a base game state for lobby phase tests
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

describe('LobbyPhase Logic', () => {
  let attemptToStartGame;
  let mockLogger;

  beforeEach(async () => {
    // Create mock functions for the logger
    mockLogger = {
      info: mock.fn(),
      warn: mock.fn(),
      error: mock.fn(),
      debug: mock.fn(),
    };
    // Patch the logger module's default export
    mock.method(logger, 'default', mockLogger, { times: Infinity });

    // Dynamically import the module under test to ensure it gets the mocked logger
    const lobbyPhaseModule = await import('../../../src/game/phases/lobbyPhase.js');
    attemptToStartGame = lobbyPhaseModule.attemptToStartGame;
  });

  afterEach(() => {
    // Restore all mocks after each test
    mock.restoreAll();
  });

  // Argument Validation Tests
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

  // Phase and Player Count Validation
  it('should throw InvalidPhaseError if game is not in LOBBY phase', () => {
    const gameState = createLobbyGameState(GAME_PHASES.PLAYING);
    assert.throws(
      () => attemptToStartGame(gameState, PLAYER_ROLES[0]),
      {
        name: 'InvalidPhaseError',
        message: `Game cannot be started from ${GAME_PHASES.PLAYING} phase. Must be in LOBBY phase.`,
      },
    );
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

  // Success Path Test
  it('should return a success object with updated game state if conditions are met', () => {
    const gameState = createLobbyGameState(GAME_PHASES.LOBBY, 4);
    const requestingPlayer = PLAYER_ROLES[0];

    const result = attemptToStartGame(gameState, requestingPlayer);

    // Assertions
    assert.strictEqual(result.success, true, 'Result success should be true');
    assert.ok(result.updatedGameState, 'updatedGameState should exist');
    assert.strictEqual(result.updatedGameState.gamePhase, GAME_PHASES.DEALING, 'Game phase should be DEALING');
    assert.strictEqual(result.updatedGameState.gameMessages.length, 1, 'Should be one new game message');
    assert.match(
      result.updatedGameState.gameMessages[0].text,
      new RegExp(`Game started by ${gameState.players[requestingPlayer].name}`),
      'Message should indicate who started the game',
    );
    assert.strictEqual(result.updatedGameState.gameMessages[0].type, 'system', 'Message type should be system');
    assert.strictEqual(
      result.message,
      'Game successfully transitioned to DEALING phase.',
      'Result message should confirm transition',
    );
  });
});