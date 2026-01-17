// test/socket/handlers/goAloneHandlers.unit.test.js
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { registerGoAloneHandlers } from '../../../src/socket/handlers/goAloneHandlers.js';
import { GAME_EVENTS, GAME_PHASES } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';
// Mock game state and persistence functions
import * as gameStateModule from '../../../src/game/state.js';
import * as gameRepositoryModule from '../../../src/db/gameRepository.js';
// Mock game logic functions
import * as goAlonePhaseModule from '../../../src/game/phases/goAlonePhase.js';
import * as validationCoreModule from '../../../src/game/logic/validation-core.js';


// --- Test Setup ---
const setupMocks = () => {
  const mockSocket = {
    id: 'socket1',
    on: mock.fn(),
    emit: mock.fn(),
  };
  const mockIo = {
    to: mock.fn(() => ({
      emit: mock.fn(),
    })),
  };
  const mockEmitToRoom = mockIo.to().emit; // Reference to the emit function in the room

  const mockGameState = {
    gameId: 'testGame1',
    players: {
      player1: { id: 'user1', name: 'Player1', socketId: 'socket1', teamId: 'TEAM_NS' },
      player2: { id: 'user2', name: 'Player2', socketId: 'socket2', teamId: 'TEAM_EW' },
    },
    currentPlayer: 'player1',
    gamePhase: GAME_PHASES.GAME_PHASE_GOING_ALONE_DECISION, // Default for this handler
    playerWhoOrderedUp: 'player1', // Player1 is the trump maker
    gameMessages: [],
  };

  const mockGetGameState = mock.fn((gameId) => {
    if (gameId === mockGameState.gameId) {
      return { ...mockGameState }; // Return a clone
    }
    return null;
  });
  const mockUpdateGameState = mock.fn((gameId, updateFn) => {
    if (gameId === mockGameState.gameId) {
      const currentState = mockGetGameState(gameId);
      return updateFn(currentState);
    }
    throw new Error('Game not found for update');
  });

  const mockGameRepository = {
    getGame: mock.fn(async (gameId) => {
      if (gameId === mockGameState.gameId) {
        return { ...mockGameState }; // Return a clone
      }
      return null;
    }),
    updateGame: mock.fn(async (gameId, gameState) => Promise.resolve(gameState)),
  };

  const mockGoAlonePhase = {
    handleGoAloneDecision: mock.fn((state, playerRole, wantsToGoAlone) => ({ ...state, goingAlone: wantsToGoAlone, message: 'Go alone decision made' })),
  };

  const mockValidationCore = {
    isValidGoAlone: mock.fn(() => true),
  };

  // Mock logger methods
  const mockLogger = {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
  };
  mock.method(logger, 'info', mockLogger.info);
  mock.method(logger, 'warn', mockLogger.warn);
  mock.method(logger, 'error', mockLogger.error);


  return {
    mockSocket,
    mockIo,
    mockEmitToRoom,
    mockGameState,
    mockGetGameState,
    mockUpdateGameState,
    mockGameRepository,
    mockGoAlonePhase,
    mockValidationCore,
    mockLogger,
  };
};

describe('goAloneHandlers', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    // Dynamically mock the modules to ensure fresh state and apply mocks
    mock.method(gameStateModule, 'getGameState', mocks.mockGetGameState);
    mock.method(gameStateModule, 'updateGameState', mocks.mockUpdateGameState);
    mock.method(gameRepositoryModule, 'gameRepository', mocks.mockGameRepository);
    mock.method(goAlonePhaseModule, 'handleGoAloneDecision', mocks.mockGoAlonePhase.handleGoAloneDecision);
    mock.method(validationCoreModule, 'isValidGoAlone', mocks.mockValidationCore.isValidGoAlone);

    // Register the handlers once per test suite
    registerGoAloneHandlers(mocks.mockSocket, mocks.mockIo);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should register ACTION_GO_ALONE_DECISION handler', () => {
    assert.strictEqual(mocks.mockSocket.on.mock.callCount(), 1);
    assert.strictEqual(mocks.mockSocket.on.mock.calls[0].arguments[0], GAME_EVENTS.ACTION_GO_ALONE_DECISION);
  });

  describe('ACTION_GO_ALONE_DECISION handler', () => {
    let handler;
    let callback;

    beforeEach(() => {
      handler = mocks.mockSocket.on.mock.calls.find(call => call.arguments[0] === GAME_EVENTS.ACTION_GO_ALONE_DECISION).arguments[1];
      callback = mock.fn();
    });

    it('should process a valid go alone decision', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', goingAlone: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1); // Initial call
      assert.strictEqual(mocks.mockValidationCore.isValidGoAlone.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGoAlonePhase.handleGoAloneDecision.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Received ACTION_GO_ALONE_DECISION')), true);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Emitted GAME_EVENT_STATE_UPDATE')), true);
    });

    it('should hydrate game state from DB if not in memory', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null); // Simulate not in memory
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', goingAlone: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGameRepository.getGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 2); // One for hydration, one for game logic
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should return error for invalid payload', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1' }; // Missing goingAlone
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.warn.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid payload for ACTION_GO_ALONE_DECISION' });
    });

    it('should return error if game not found in memory or DB', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(() => null);
      const payload = { gameId: 'nonExistentGame', playerRole: 'player1', goingAlone: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Game not found.' });
    });

    it('should handle errors from isValidGoAlone logic', async () => {
      mocks.mockValidationCore.isValidGoAlone.mock.mockImplementation(() => {
        throw new Error('Invalid go alone validation');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', goingAlone: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid go alone validation' });
    });

    it('should handle errors from handleGoAloneDecision logic', async () => {
      mocks.mockGoAlonePhase.handleGoAloneDecision.mock.mockImplementation(() => {
        throw new Error('Failed to handle go alone decision');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', goingAlone: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Failed to handle go alone decision' });
    });

    it('should handle errors from gameRepository.updateGame', async () => {
      mocks.mockGameRepository.updateGame.mock.mockImplementation(() => {
        throw new Error('DB update failed');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', goingAlone: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'DB update failed' });
    });
  });
});
