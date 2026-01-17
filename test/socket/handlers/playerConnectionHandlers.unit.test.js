// test/socket/handlers/playerConnectionHandlers.unit.test.js
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { registerPlayerConnectionHandlers, handlePlayerDisconnect } from '../../../src/socket/handlers/playerConnectionHandlers.js';
import { GAME_EVENTS, PLAYER_ROLES } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';
// Mock game state and persistence functions
import * as gameStateModule from '../../../src/game/state.js';
import * as gameRepositoryModule from '../../../src/db/gameRepository.js';
// Mock player utility functions
import * as playersModule from '../../../src/utils/players.js';

// --- Test Setup ---
const setupMocks = () => {
  const mockSocket = {
    id: 'socket1',
    on: mock.fn(),
    emit: mock.fn(),
    join: mock.fn(),
    currentGameId: null, // Will be set by handler
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
      [PLAYER_ROLES[0]]: { id: 'user1', name: 'Player1', socketId: 'socket1', isConnected: true, teamId: 'TEAM_NS' },
      [PLAYER_ROLES[1]]: { id: 'user2', name: 'Player2', socketId: 'socket2', isConnected: false, teamId: 'TEAM_EW' },
    },
    gamePhase: 'LOBBY',
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
      const newState = updateFn(currentState);
      // Simulate actually updating the in-memory state for subsequent calls in the same test
      Object.assign(mockGameState, newState); // Mutate mockGameState for successive calls
      return newState;
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

  const mockPlayers = {
    getRoleBySocketId: mock.fn((state, socketId) => {
      for (const role in state.players) {
        if (state.players[role].socketId === socketId) {
          return role;
        }
      }
      return null;
    }),
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
    mockPlayers,
    mockLogger,
  };
};

describe('playerConnectionHandlers', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    // Dynamically mock the modules to ensure fresh state and apply mocks
    mock.method(gameStateModule, 'getGameState', mocks.mockGetGameState);
    mock.method(gameStateModule, 'updateGameState', mocks.mockUpdateGameState);
    mock.method(gameRepositoryModule, 'gameRepository', mocks.mockGameRepository);
    mock.method(playersModule, 'getRoleBySocketId', mocks.mockPlayers.getRoleBySocketId);

    // Register the handlers once per test suite
    registerPlayerConnectionHandlers(mocks.mockSocket, mocks.mockIo);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should register ACTION_REJOIN_GAME handler', () => {
    assert.strictEqual(mocks.mockSocket.on.mock.callCount(), 1);
    assert.strictEqual(mocks.mockSocket.on.mock.calls[0].arguments[0], GAME_EVENTS.ACTION_REJOIN_GAME);
  });

  describe('ACTION_REJOIN_GAME handler', () => {
    let handler;
    let callback;

    beforeEach(() => {
      handler = mocks.mockSocket.on.mock.calls.find(call => call.arguments[0] === GAME_EVENTS.ACTION_REJOIN_GAME).arguments[1];
      callback = mock.fn();
      // Ensure the player is initially disconnected for rejoin test
      mocks.mockGameState.players[PLAYER_ROLES[0]].isConnected = false;
      mocks.mockGameState.players[PLAYER_ROLES[0]].socketId = null;
    });

    it('should successfully rejoin a disconnected player by player ID', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerId: mocks.mockGameState.players[PLAYER_ROLES[0]].id };
      mocks.mockSocket.id = 'newSocketForPlayer1'; // Simulate new socket ID for reconnection
      mocks.mockPlayers.getRoleBySocketId.mock.mockImplementation(() => null); // Ensure it's not found by old socketId

      await handler(payload, callback);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockSocket.join.mock.callCount(), 1);
      assert.deepStrictEqual(mocks.mockSocket.join.mock.calls[0].arguments[0], mocks.mockGameState.gameId);
      assert.strictEqual(mocks.mockSocket.emit.mock.callCount(), 1); // STATE_UPDATE to self
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1); // STATE_UPDATE to room
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Received ACTION_REJOIN_GAME')), true);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Player player1 has rejoined.')), true);
      assert.strictEqual(mocks.mockGameState.players[PLAYER_ROLES[0]].isConnected, true);
      assert.strictEqual(mocks.mockGameState.players[PLAYER_ROLES[0]].socketId, 'newSocketForPlayer1');
    });

    it('should successfully rejoin a disconnected player by player Role', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerId: PLAYER_ROLES[0] }; // Use player role directly
      mocks.mockSocket.id = 'newSocketForPlayer1'; 

      await handler(payload, callback);

      assert.strictEqual(mocks.mockGameState.players[PLAYER_ROLES[0]].isConnected, true);
      assert.strictEqual(mocks.mockGameState.players[PLAYER_ROLES[0]].socketId, 'newSocketForPlayer1');
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should hydrate game state from DB if not in memory', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null); // Simulate not in memory
      const payload = { gameId: mocks.mockGameState.gameId, playerId: mocks.mockGameState.players[PLAYER_ROLES[0]].id };
      mocks.mockSocket.id = 'newSocketForPlayer1'; 
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGameRepository.getGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 2); // One for hydration, one for game logic
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should return error for invalid payload', async () => {
      const payload = { gameId: mocks.mockGameState.gameId }; // Missing playerId
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.warn.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid payload for ACTION_REJOIN_GAME' });
    });

    it('should return error if game not found in memory or DB', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(() => null);
      const payload = { gameId: 'nonExistentGame', playerId: 'player1' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Game not found.' });
    });

    it('should return error if player not found in game', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerId: 'nonExistentPlayer' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.warn.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Player nonExistentPlayer not found in game.' });
    });

    it('should return error if player is already connected', async () => {
      mocks.mockGameState.players[PLAYER_ROLES[0]].isConnected = true; // Set to connected
      mocks.mockGameState.players[PLAYER_ROLES[0]].socketId = 'anotherSocket'; // Set to connected
      const payload = { gameId: mocks.mockGameState.gameId, playerId: mocks.mockGameState.players[PLAYER_ROLES[0]].id };
      mocks.mockSocket.id = 'newSocketForPlayer1'; // Still simulate new socket ID
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.warn.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Player player1 is already connected.' });
    });

    it('should handle errors from gameRepository.updateGame', async () => {
      mocks.mockGameRepository.updateGame.mock.mockImplementation(() => {
        throw new Error('DB update failed');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerId: mocks.mockGameState.players[PLAYER_ROLES[0]].id };
      mocks.mockSocket.id = 'newSocketForPlayer1'; 
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'DB update failed' });
    });
  });

  describe('handlePlayerDisconnect()', () => {
    let mockSocket;
    let mockIo;
    let mockEmitToRoom;

    beforeEach(() => {
      mockSocket = {
        id: 'socket1',
        currentGameId: mocks.mockGameState.gameId, // Simulate game ID being set
      };
      mockIo = mocks.mockIo;
      mockEmitToRoom = mocks.mockEmitToRoom;
    });

    it('should mark a player as disconnected and update state', async () => {
      // Ensure player is connected initially
      mocks.mockGameState.players[PLAYER_ROLES[0]].isConnected = true;
      mocks.mockGameState.players[PLAYER_ROLES[0]].socketId = mockSocket.id;

      await handlePlayerDisconnect(mockSocket, mockIo);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockPlayers.getRoleBySocketId.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameState.players[PLAYER_ROLES[0]].isConnected, false);
      assert.strictEqual(mocks.mockGameState.players[PLAYER_ROLES[0]].socketId, null);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Player player1 disconnected.')), true);
    });

    it('should do nothing if socket.currentGameId is null', async () => {
      mockSocket.currentGameId = null;
      await handlePlayerDisconnect(mockSocket, mockIo);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 0);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 0);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 0);
      assert.strictEqual(mockIo.to.mock.callCount(), 0);
    });

    it('should do nothing if game state is not found', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      await handlePlayerDisconnect(mockSocket, mockIo);

      assert.strictEqual(mocks.mockPlayers.getRoleBySocketId.mock.callCount(), 0);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 0);
    });

    it('should do nothing if player role is not found for socket ID', async () => {
      mocks.mockPlayers.getRoleBySocketId.mock.mockImplementationOnce(() => null);
      await handlePlayerDisconnect(mockSocket, mockIo);

      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 0);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 0);
    });

    it('should log error if updateGameState throws', async () => {
      mocks.mockUpdateGameState.mock.mockImplementation(() => {
        throw new Error('State update failed');
      });
      await handlePlayerDisconnect(mockSocket, mockIo);

      assert.strictEqual(mocks.mockLogger.error.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 0); // Should not proceed to DB update
    });

    it('should log error if gameRepository.updateGame throws', async () => {
      mocks.mockGameRepository.updateGame.mock.mockImplementation(() => {
        throw new Error('DB update failed');
      });
      await handlePlayerDisconnect(mockSocket, mockIo);

      assert.strictEqual(mocks.mockLogger.error.callCount(), 1);
    });
  });
});
