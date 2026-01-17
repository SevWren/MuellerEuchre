// test/socket/handlers/lobbyHandlers.unit.test.js
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { registerLobbyHandlers } from '../../../src/socket/handlers/lobbyHandlers.js';
import { GAME_EVENTS, GAME_PHASES, PLAYER_ROLES } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';
// Mock game state and persistence functions
import * as gameStateModule from '../../../src/game/state.js';
import * as gameRepositoryModule from '../../../src/db/gameRepository.js';
// Mock game logic functions
import * as lobbyPhaseModule from '../../../src/game/phases/lobbyPhase.js';
import * as startNewHandPhaseModule from '../../../src/game/phases/startNewHandPhase.js';
import * as lobbyUtilsModule from '../../../src/utils/lobbyUtils.js';
import * as playersModule from '../../../src/utils/players.js';

// --- Test Setup ---
const setupMocks = () => {
  const mockSocket = {
    id: 'socket1',
    on: mock.fn(),
    emit: mock.fn(),
    join: mock.fn(),
    currentGameId: null,
  };
  const mockIo = {
    to: mock.fn(() => ({
      emit: mock.fn(),
    })),
  };
  const mockEmitToRoom = mockIo.to().emit; // Reference to the emit function in the room

  const mockGameState = {
    gameId: 'testGame1',
    hostId: 'user1',
    players: {
      [PLAYER_ROLES[0]]: { id: 'user1', name: 'Player1', socketId: 'socket1', isConnected: true, isActive: true, teamId: 'TEAM_NS' },
      [PLAYER_ROLES[1]]: { id: 'user2', name: 'Player2', socketId: 'socket2', isConnected: true, isActive: true, teamId: 'TEAM_EW' },
      [PLAYER_ROLES[2]]: { id: 'user3', name: 'Player3', socketId: 'socket3', isConnected: true, isActive: true, teamId: 'TEAM_NS' },
      [PLAYER_ROLES[3]]: { id: 'user4', name: 'Player4', socketId: 'socket4', isConnected: true, isActive: true, teamId: 'TEAM_EW' },
    },
    gamePhase: GAME_PHASES.LOBBY,
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
      Object.assign(mockGameState, newState);
      return newState;
    }
    throw new Error('Game not found for update');
  });

  const mockCreateGameState = mock.fn((hostId) => ({
    gameId: 'newGameId',
    hostId,
    players: {},
    gamePhase: GAME_PHASES.LOBBY,
    gameMessages: [],
  }));

  const mockGameRepository = {
    getGame: mock.fn(async (gameId) => {
      if (gameId === mockGameState.gameId) {
        return { ...mockGameState }; // Return a clone
      }
      return null;
    }),
    updateGame: mock.fn(async (gameId, gameState) => Promise.resolve(gameState)),
  };

  const mockLobbyPhase = {
    attemptToStartGame: mock.fn((state, playerRole) => ({ success: true, updatedGameState: { ...state, gamePhase: GAME_PHASES.DEALING }, message: 'Game starting' })),
  };
  const mockStartNewHand = mock.fn((state) => ({ ...state, gamePhase: GAME_PHASES.ORDER_UP_ROUND1, message: 'Hand dealt' }));

  const mockLobbyUtils = {
    assignRoleToPlayer: mock.fn((state, role, userId, playerName, socketId) => {
      const newState = { ...state, players: { ...state.players, [role]: { id: userId, name: playerName, socketId, isConnected: true, isActive: true, teamId: role.endsWith('SOUTH') || role.endsWith('NORTH') ? 'TEAM_NS' : 'TEAM_EW' } } };
      // Simulate teams object creation/update
      newState.teams = newState.teams || {};
      const teamId = newState.players[role].teamId;
      newState.teams[teamId] = newState.teams[teamId] || { players: [], score: 0 };
      if (!newState.teams[teamId].players.includes(role)) {
        newState.teams[teamId].players.push(role);
      }
      return newState;
    }),
    isLobbyFull: mock.fn((state) => Object.values(state.players).filter(p => p.isConnected && p.isActive).length === PLAYER_ROLES.length),
    getNextAvailableRole: mock.fn((state) => {
      for (const role of PLAYER_ROLES) {
        if (!state.players[role] || !state.players[role].isConnected || !state.players[role].isActive) {
          return role;
        }
      }
      return null;
    }),
  };

  const mockPlayersModule = {
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
    mockCreateGameState,
    mockGameRepository,
    mockLobbyPhase,
    mockStartNewHand,
    mockLobbyUtils,
    mockPlayersModule,
    mockLogger,
  };
};

describe('lobbyHandlers', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    // Dynamically mock the modules to ensure fresh state and apply mocks
    mock.method(gameStateModule, 'createGameState', mocks.mockCreateGameState);
    mock.method(gameStateModule, 'getGameState', mocks.mockGetGameState);
    mock.method(gameStateModule, 'updateGameState', mocks.mockUpdateGameState);
    mock.method(gameRepositoryModule, 'gameRepository', mocks.mockGameRepository);
    mock.method(lobbyPhaseModule, 'attemptToStartGame', mocks.mockLobbyPhase.attemptToStartGame);
    mock.method(startNewHandPhaseModule, 'startNewHand', mocks.mockStartNewHand);
    mock.method(lobbyUtilsModule, 'createLobbyUtils', mock.fn(() => mocks.mockLobbyUtils));
    mock.method(playersModule, 'getRoleBySocketId', mocks.mockPlayersModule.getRoleBySocketId);

    // Register the handlers once per test suite
    registerLobbyHandlers(mocks.mockSocket, mocks.mockIo);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should register request_start_game and JOIN_GAME handlers', () => {
    assert.strictEqual(mocks.mockSocket.on.mock.callCount(), 2);
    assert.strictEqual(mocks.mockSocket.on.mock.calls[0].arguments[0], 'request_start_game');
    assert.strictEqual(mocks.mockSocket.on.mock.calls[1].arguments[0], GAME_EVENTS.JOIN_GAME);
  });

  describe('request_start_game handler', () => {
    let handler;
    let ack;

    beforeEach(() => {
      handler = mocks.mockSocket.on.mock.calls.find(call => call.arguments[0] === 'request_start_game').arguments[1];
      ack = mock.fn();
    });

    it('should process a valid request to start a game', async () => {
      const payload = { gameId: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1); // Initial state check
      assert.strictEqual(mocks.mockPlayersModule.getRoleBySocketId.mock.callCount(), 1);
      assert.strictEqual(mocks.mockLobbyPhase.attemptToStartGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1); // For state.js update transaction
      assert.strictEqual(mocks.mockStartNewHand.mock.callCount(), 1); // Called inside updateGameState
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], null);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[1], { status: 'ok', message: 'Game started.' });
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Game started and hands dealt.')), true);
    });

    it('should hydrate game state from DB if not in memory', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null); // Simulate not in memory
      const payload = { gameId: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(mocks.mockGameRepository.getGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1); // One initial call which returns null
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 2); // One for hydration, one for game logic
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[1], { status: 'ok', message: 'Game started.' });
    });

    it('should return error for invalid payload', async () => {
      const payload = { }; // Missing gameId
      await handler(payload, ack);

      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid request: gameId is required.' });
    });

    it('should return error if game not found in memory or DB', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(() => null);
      const payload = { gameId: 'nonExistentGame' };
      await handler(payload, ack);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'Game not found.' });
    });

    it('should return error if player is not part of the game', async () => {
      mocks.mockPlayersModule.getRoleBySocketId.mock.mockImplementationOnce(() => null);
      const payload = { gameId: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'You are not part of this game.' });
    });

    it('should return error if attemptToStartGame returns failure', async () => {
      mocks.mockLobbyPhase.attemptToStartGame.mock.mockImplementationOnce(() => ({ success: false, message: 'Not enough players' }));
      const payload = { gameId: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'Not enough players' });
    });

    it('should handle errors thrown by attemptToStartGame', async () => {
      mocks.mockLobbyPhase.attemptToStartGame.mock.mockImplementationOnce(() => { throw new Error('Lobby error'); });
      const payload = { gameId: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'Lobby error' });
    });

    it('should handle errors from gameRepository.updateGame', async () => {
      mocks.mockGameRepository.updateGame.mock.mockImplementationOnce(() => { throw new Error('DB error'); });
      const payload = { gameId: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'DB error' });
    });
  });

  describe('JOIN_GAME handler', () => {
    let handler;
    let ack;

    beforeEach(() => {
      handler = mocks.mockSocket.on.mock.calls.find(call => call.arguments[0] === GAME_EVENTS.JOIN_GAME).arguments[1];
      ack = mock.fn();
      mocks.mockSocket.id = 'joiningSocketId'; // Simulate a new socket ID
    });

    it('should create a new game if no gameIdToJoin is provided', async () => {
      const payload = { playerName: 'NewPlayer' };
      mocks.mockCreateGameState.mock.mockImplementationOnce((hostId) => ({
        gameId: 'newGameId',
        hostId,
        players: {},
        gamePhase: GAME_PHASES.LOBBY,
        gameMessages: [],
        teams: {},
      }));

      await handler(payload, ack);

      assert.strictEqual(mocks.mockCreateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockLobbyUtils.assignRoleToPlayer.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockSocket.join.mock.callCount(), 1);
      assert.deepStrictEqual(mocks.mockSocket.join.mock.calls[0].arguments[0], 'newGameId');
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(mocks.mockSocket.emit.mock.callCount(), 1); // ASSIGN_ROLE
      assert.deepStrictEqual(ack.mock.calls[0].arguments[1].gameId, 'newGameId');
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], null);
    });

    it('should join an existing game if gameIdToJoin is provided', async () => {
      const payload = { playerName: 'ExistingPlayer', gameIdToJoin: mocks.mockGameState.gameId };
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null); // Simulate not in memory initially
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(async () => ({ ...mocks.mockGameState, players: {} })); // Simulate empty players for assigning role

      await handler(payload, ack);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.getGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockLobbyUtils.isLobbyFull.mock.callCount(), 1);
      assert.strictEqual(mocks.mockLobbyUtils.getNextAvailableRole.mock.callCount(), 1);
      assert.strictEqual(mocks.mockLobbyUtils.assignRoleToPlayer.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1); // For assigning role
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockSocket.join.mock.callCount(), 1);
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(mocks.mockSocket.emit.mock.callCount(), 1); // ASSIGN_ROLE
      assert.deepStrictEqual(ack.mock.calls[0].arguments[1].gameId, mocks.mockGameState.gameId);
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], null);
    });

    it('should return error for invalid payload', async () => {
      const payload = { gameIdToJoin: mocks.mockGameState.gameId }; // Missing playerName
      await handler(payload, ack);

      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'playerName is required.' });
    });

    it('should return error if gameIdToJoin is provided but game not found', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(() => null);
      const payload = { playerName: 'Player', gameIdToJoin: 'nonExistentGame' };
      await handler(payload, ack);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'Game not found.' });
    });

    it('should return error if game is full', async () => {
      mocks.mockLobbyUtils.isLobbyFull.mock.mockImplementationOnce(() => true);
      const payload = { playerName: 'Player', gameIdToJoin: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'Game is full.' });
    });

    it('should return error if no roles are available', async () => {
      mocks.mockLobbyUtils.isLobbyFull.mock.mockImplementationOnce(() => false); // Not full, but no roles
      mocks.mockLobbyUtils.getNextAvailableRole.mock.mockImplementationOnce(() => null);
      const payload = { playerName: 'Player', gameIdToJoin: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'No roles available.' });
    });

    it('should handle errors thrown by assignRoleToPlayer', async () => {
      mocks.mockLobbyUtils.assignRoleToPlayer.mock.mockImplementationOnce(() => { throw new Error('Assign role error'); });
      const payload = { playerName: 'Player', gameIdToJoin: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'Assign role error' });
    });

    it('should handle errors from gameRepository.updateGame', async () => {
      mocks.mockGameRepository.updateGame.mock.mockImplementationOnce(() => { throw new Error('DB error'); });
      const payload = { playerName: 'Player', gameIdToJoin: mocks.mockGameState.gameId };
      await handler(payload, ack);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(ack.mock.callCount(), 1);
      assert.deepStrictEqual(ack.mock.calls[0].arguments[0], { status: 'error', message: 'DB error' });
    });
  });
});
