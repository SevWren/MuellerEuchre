// test/socket/handlers/playingHandlers.unit.test.js
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { registerPlayingHandlers } from '../../../src/socket/handlers/playingHandlers.js';
import { GAME_EVENTS, GAME_PHASES } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';
// Mock game state and persistence functions
import * as gameStateModule from '../../../src/game/state.js';
import * as gameRepositoryModule from '../../../src/db/gameRepository.js';
// Mock game logic functions
import * as playingPhaseModule from '../../../src/game/phases/playingPhase.js';
import * as validationCoreModule from '../../../src/game/logic/validation-core.js';
import * as playersModule from '../../../src/utils/players.js';


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
      player1: { id: 'user1', name: 'Player1', socketId: 'socket1', teamId: 'TEAM_NS', hand: [{ id: 'card1', suit: 'HEARTS', value: 'ACE' }] },
      player2: { id: 'user2', name: 'Player2', socketId: 'socket2', teamId: 'TEAM_EW', hand: [] },
    },
    currentPlayer: 'player1',
    gamePhase: GAME_PHASES.PLAYING,
    gameMessages: [],
    currentTrick: [],
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

  const mockPlayingPhase = {
    handlePlayCard: mock.fn((state, playerRole, card) => ({ ...state, currentTrick: [...state.currentTrick, { card, playedBy: playerRole }], message: 'Card played' })),
  };

  const mockValidationCore = {
    getCardRank: mock.fn(),
    getEffectiveSuit: mock.fn(),
    validatePlay: mock.fn(() => true),
  };
  const mockPlayersModule = {
    getNextPlayer: mock.fn(),
  }

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
    mockPlayingPhase,
    mockValidationCore,
    mockPlayersModule,
    mockLogger,
  };
};

describe('playingHandlers', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    // Dynamically mock the modules to ensure fresh state and apply mocks
    mock.method(gameStateModule, 'getGameState', mocks.mockGetGameState);
    mock.method(gameStateModule, 'updateGameState', mocks.mockUpdateGameState);
    mock.method(gameRepositoryModule, 'gameRepository', mocks.mockGameRepository);
    mock.method(playingPhaseModule, 'handlePlayCard', mocks.mockPlayingPhase.handlePlayCard);
    
    // Mocks for handlePlayCard injection
    mock.method(validationCoreModule, 'getCardRank', mocks.mockValidationCore.getCardRank);
    mock.method(validationCoreModule, 'getEffectiveSuit', mocks.mockValidationCore.getEffectiveSuit);
    mock.method(validationCoreModule, 'validatePlay', mocks.mockValidationCore.validatePlay);
    mock.method(playersModule, 'getNextPlayer', mocks.mockPlayersModule.getNextPlayer);


    // Register the handlers once per test suite
    registerPlayingHandlers(mocks.mockSocket, mocks.mockIo);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should register ACTION_PLAY_CARD handler', () => {
    assert.strictEqual(mocks.mockSocket.on.mock.callCount(), 1);
    assert.strictEqual(mocks.mockSocket.on.mock.calls[0].arguments[0], GAME_EVENTS.ACTION_PLAY_CARD);
  });

  describe('ACTION_PLAY_CARD handler', () => {
    let handler;
    let callback;

    beforeEach(() => {
      handler = mocks.mockSocket.on.mock.calls.find(call => call.arguments[0] === GAME_EVENTS.ACTION_PLAY_CARD).arguments[1];
      callback = mock.fn();
    });

    it('should process a valid card play', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', card: { id: 'card1', suit: 'HEARTS', value: 'ACE' } };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockPlayingPhase.handlePlayCard.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Received ACTION_PLAY_CARD')), true);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Emitted GAME_EVENT_STATE_UPDATE')), true);
    });

    it('should hydrate game state from DB if not in memory', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null); // Simulate not in memory
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', card: { id: 'card1', suit: 'HEARTS', value: 'ACE' } };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGameRepository.getGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 2); // One for hydration, one for game logic
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should return error for invalid payload', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', card: { id: 'card1' } }; // Missing suit/value
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.warn.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid payload for ACTION_PLAY_CARD' });
    });

    it('should return error if game not found in memory or DB', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(() => null);
      const payload = { gameId: 'nonExistentGame', playerRole: 'player1', card: { id: 'card1', suit: 'HEARTS', value: 'ACE' } };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Game not found.' });
    });

    it('should handle errors from playing phase logic', async () => {
      mocks.mockPlayingPhase.handlePlayCard.mock.mockImplementation(() => {
        throw new Error('Invalid play card');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', card: { id: 'card1', suit: 'HEARTS', value: 'ACE' } };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid play card' });
    });

    it('should handle errors from gameRepository.updateGame', async () => {
      mocks.mockGameRepository.updateGame.mock.mockImplementation(() => {
        throw new Error('DB update failed');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', card: { id: 'card1', suit: 'HEARTS', value: 'ACE' } };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'DB update failed' });
    });
  });
});
