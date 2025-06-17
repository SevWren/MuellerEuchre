/**
 * Handles player connection and disconnection events for Socket.IO.
 * @module socket/handlers/playerConnectionHandlers
 */
import logger from '../../utils/logger.js';
// Removed getGameState, updateGameState from '../../game/state.js' as they are part of the deprecated global state model.
import { PLAYER_ROLES, GAME_PHASES, GAME_EVENTS } from '../../config/constants.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { gameRepository } from '../../db/gameRepository.js';

// Helper to create standardized error objects
const createErrorObject = (action, errorType, message, details) => ({
  action,
  errorType,
  message,
  details,
});

/**
 * Handles a new client connection.
 * This function is largely deprecated in a multi-game model and should not assign players to games.
 * It serves as a basic connection acknowledgement. Specific game joining is handled by lobbyHandlers.
 * @param {object} socket - The Socket.IO socket object for the connected client.
 * @param {object} io - The Socket.IO server instance.
 */
export function handlePlayerConnect(socket, io) {
  const action = 'INITIAL_CONNECTION_ERROR'; // Action for errors specific to this initial, non-game-specific connection
  logger.info({ socketId: socket.id }, 'New client connection received.');

  // This function is largely a stub now.
  // It previously tried to assign players to a global/default game, which is not
  // compatible with the multi-game, repository-based model.
  // Player assignment and game joining are now handled by lobbyHandlers.js (JOIN_GAME event).
  // This function's primary role is to acknowledge the connection.
  // If there was a concept of a "default lobby" visible before joining a specific game,
  // this might emit some initial state for that. Otherwise, it's minimal.

  // Explicitly null, as global state is deprecated for game instances.
  // const currentGameState = null; // Placeholder representing the removed global state logic.

  const message = 'Connection acknowledged. Please use JOIN_GAME with a gameId to join a game, or send JOIN_GAME without a gameId to create a new one.';
  logger.warn({ socketId: socket.id, action: 'PLAYER_CONNECT_INFO', message }, 'handlePlayerConnect is likely deprecated for game assignment and needs review for removal or refactor to a simple ack/info emitter.');

  // Inform client about how to proceed (e.g., join a game)
  // This error emit is for the case where this handler was expected to do more.
  const error = createErrorObject(action, 'DEPRECATED_FUNCTIONALITY', message, {
    details: 'This connection handler does not automatically assign players to games. Use JOIN_GAME event.'
  });
  socket.emit(GAME_EVENTS.ERROR, error);
  // No game state to update or broadcast from here.
}

/**
 * Handles a player's attempt to rejoin an existing game.
 * @param {object} socket - The Socket.IO socket object for the connected client.
 * @param {object} io - The Socket.IO server instance.
 * @param {string} gameId - The ID of the game the player wants to rejoin. (Received from client)
 * @param {string} playerId - The ID or role of the player attempting to rejoin. (Received from client)
 */
export async function handleRejoinGame(socket, io, gameId, playerId) {
  const action = GAME_EVENTS.RECONNECT; // Assuming RECONNECT is the client-side event that triggers this
  logger.info({ socketId: socket.id, gameId, playerId, action }, `Player attempting to rejoin game.`);

  if (typeof gameId !== 'string' || !gameId.trim() || typeof playerId !== 'string' || !playerId.trim()) {
    const error = createErrorObject(action, 'VALIDATION_ERROR', 'Game ID and Player ID (non-empty strings) are required to rejoin.', { gameId, playerId });
    logger.warn({ socketId: socket.id, error, gameId, playerId }, `Validation failed for ${action}.`);
    socket.emit(GAME_EVENTS.ERROR, error);
    return;
  }

  try {
    const existingGameState = await gameRepository.getGame(gameId);

    if (!existingGameState) {
      const error = createErrorObject(action, 'NOT_FOUND_ERROR', 'Game not found. Cannot rejoin.', { gameId });
      logger.warn({ socketId: socket.id, error, gameId, playerId }, `${action}: Game not found.`);
      socket.emit(GAME_EVENTS.ERROR, error);
      return;
    }

    if (existingGameState.gamePhase === GAME_PHASES.GAME_OVER) {
      const error = createErrorObject(action, 'GAME_LOGIC_ERROR', 'Cannot rejoin: Game is already over.', { gameId, gamePhase: existingGameState.gamePhase });
      logger.warn({ socketId: socket.id, error, gameId, playerId }, `${action}: Attempt to rejoin game that is over.`);
      socket.emit(GAME_EVENTS.ERROR, error);
      return;
    }

    let playerRoleToRejoin = null;
    if (PLAYER_ROLES.includes(playerId) && existingGameState.players[playerId]) {
      playerRoleToRejoin = playerId;
    } else {
      for (const role of PLAYER_ROLES) {
        if (existingGameState.players[role]?.id === playerId) {
          playerRoleToRejoin = role;
          break;
        }
      }
    }

    if (playerRoleToRejoin && existingGameState.players[playerRoleToRejoin]) {
      if (existingGameState.players[playerRoleToRejoin].isConnected) {
        const error = createErrorObject(action, 'GAME_LOGIC_ERROR', `Player ${playerRoleToRejoin} is already connected to this game.`, { gameId, playerRole: playerRoleToRejoin });
        logger.warn({ socketId: socket.id, error, gameId, role: playerRoleToRejoin }, `${action}: Role ${playerRoleToRejoin} is already connected.`);
        socket.emit(GAME_EVENTS.ERROR, error);
        return;
      }

      existingGameState.players[playerRoleToRejoin].socketId = socket.id;
      existingGameState.players[playerRoleToRejoin].isConnected = true;

      await gameRepository.updateGame(gameId, existingGameState);
      logger.info({ socketId: socket.id, gameId, role: playerRoleToRejoin, action }, `Player ${playerRoleToRejoin} reconnected.`);

      socket.join(gameId);
      socket.currentGameId = gameId; // Store gameId on socket for disconnect handling

      socket.emit(GAME_EVENTS.GAME_STATE_UPDATE, existingGameState); // Send full state to rejoining player

      // TODO: Define PLAYER_RECONNECTED_SUCCESS in GAME_EVENTS constants file.
      const playerReconnectedEvent = 'PLAYER_RECONNECTED_SUCCESS';
      socket.to(gameId).emit(playerReconnectedEvent, {
        gameId,
        role: playerRoleToRejoin,
        name: existingGameState.players[playerRoleToRejoin].name,
        message: `Player ${existingGameState.players[playerRoleToRejoin].name || playerRoleToRejoin} has reconnected.`
      });
      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, existingGameState); // Also update everyone else

    } else {
      const error = createErrorObject(action, 'AUTHORIZATION_ERROR', 'Player not found in this game or slot unavailable for rejoin.', { gameId, playerId });
      logger.warn({ socketId: socket.id, error, gameId, playerId }, `${action}: Player ${playerId} not found or slot not available.`);
      socket.emit(GAME_EVENTS.ERROR, error);
    }
  } catch (e) {
    const error = createErrorObject(action, 'SERVER_ERROR', 'Server error while trying to rejoin game.', { gameId, playerId, stack: e.stack });
    logger.error({ err: e, socketId: socket.id, error, gameId, playerId }, `Error during ${action} attempt.`);
    socket.emit(GAME_EVENTS.ERROR, error);
  }
}

/**
 * Handles a client disconnection.
 * @param {object} socket - The Socket.IO socket object for the disconnected client.
 * @param {object} io - The Socket.IO server instance.
 * @param {string} gameId_param - Optional: The gameId the socket was explicitly associated with.
 */
export async function handlePlayerDisconnect(socket, io, gameId_param = null) {
  const action = GAME_EVENTS.PLAYER_DISCONNECTED; // Using this as the action context for errors/logging

  // Validate gameId_param if provided
  if (gameId_param && (typeof gameId_param !== 'string' || !gameId_param.trim())) {
    // This error is primarily for server-side logging, as the client has disconnected.
    logger.error({ socketId: socket.id, action: 'DISCONNECT_VALIDATION', gameId_param }, 'Invalid gameId_param provided to handlePlayerDisconnect.');
    // Cannot reliably emit to a disconnected socket.
    return;
  }

  const gameIdToUpdate = gameId_param || socket.currentGameId; // Prefer explicit param, fallback to stored ID on socket

  if (!gameIdToUpdate) {
    logger.warn({ socketId: socket.id, action }, 'Disconnected socket had no gameId associated (neither passed as param nor found on socket.currentGameId). Cannot update specific game state.');
    return;
  }

  try {
    const gameStateToUpdate = await gameRepository.getGame(gameIdToUpdate);

    if (!gameStateToUpdate) {
      logger.warn({ socketId: socket.id, gameId: gameIdToUpdate, action }, `Player disconnected from game ${gameIdToUpdate}, but game not found in repository.`);
      return; // No game state to update
    }

    const playerRoleDisconnected = getRoleBySocketId(gameStateToUpdate, socket.id);

    if (playerRoleDisconnected) {
      logger.info({ socketId: socket.id, role: playerRoleDisconnected, gameId: gameIdToUpdate, action }, 'Player disconnected.');

      gameStateToUpdate.players[playerRoleDisconnected].isConnected = false;
      // Do not nullify socketId immediately if you want to allow rejoining based on socketId comparison or history.
      // However, for finding by socketId, it must be nulled for a new connection by same player to not be confused.
      // For this implementation, we assume getRoleBySocketId correctly handles finding the role.
      // If a player fully leaves and rejoins (new socket), their old socketId would be different.
      // If they simply disconnect and reconnect with the same socket instance (less common across full disconnects),
      // then this is fine. Typically, socket.id changes on full reconnect.
      // For now, nullifying seems correct to make the slot available and reflect true state.
      // gameStateToUpdate.players[playerRoleDisconnected].socketId = null; // This might be too aggressive if rejoin logic depends on it.
                                                                      // However, rejoining usually relies on playerId/role, not old socketId.

      await gameRepository.updateGame(gameIdToUpdate, gameStateToUpdate);
      logger.info({ socketId: socket.id, role: playerRoleDisconnected, gameId: gameIdToUpdate, action }, 'Updated game state after disconnect.');

      io.to(gameIdToUpdate).emit(GAME_EVENTS.PLAYER_DISCONNECTED, {
        gameId: gameIdToUpdate,
        role: playerRoleDisconnected,
        name: gameStateToUpdate.players[playerRoleDisconnected]?.name || playerRoleDisconnected, // Add name
        message: `Player ${gameStateToUpdate.players[playerRoleDisconnected]?.name || playerRoleDisconnected} disconnected.`
      });
      io.to(gameIdToUpdate).emit(GAME_EVENTS.GAME_STATE_UPDATE, gameStateToUpdate);
    } else {
      logger.warn({ socketId: socket.id, gameId: gameIdToUpdate, action }, 'Disconnected socket had no assigned player role in the identified game.');
    }
  } catch (e) {
    // This error is primarily for server-side logging.
    const error = createErrorObject(action, 'SERVER_ERROR', `Server error processing disconnect for game ${gameIdToUpdate}.`, { gameId: gameIdToUpdate, stack: e.stack });
    logger.error({ err: e, socketId: socket.id, error, gameId: gameIdToUpdate }, `Error processing ${action}.`);
  }
}

// Example of how these handlers might be registered in the main socket setup file:
// io.on('connection', (socket) => {
//   socket.on('rejoin_game_request', ({ gameId, playerId }) => {
//     handleRejoinGame(socket, io, gameId, playerId);
//   });
//   socket.on('disconnect', () => {
//     // Need to know which gameId this socket was associated with.
//     // This might be stored on the socket object upon join, e.g., socket.currentGameId = gameId;
//     handlePlayerDisconnect(socket, io, socket.currentGameId);
//   });
// });


// It's assumed that the main socket index.js would register 'reconnect' and 'disconnect' events
// and call these handlers. E.g.:
// import { handleRejoinGame, handlePlayerDisconnect } from './playerConnectionHandlers.js';
// io.on('connection', (socket) => {
//   socket.on(GAME_EVENTS.RECONNECT, (data) => handleRejoinGame(socket, io, data.gameId, data.playerId));
//   socket.on('disconnect', () => handlePlayerDisconnect(socket, io, socket.currentGameId)); // Assuming gameId stored on socket
// });


// --- Conceptual Unit Tests for playerConnectionHandlers ---

// describe('handleRejoinGame', () => {
//   let mockSocket, mockIo, mockGetGame, mockUpdateGame;
//   const gameId = 'testGame123';
//   const playerId = 'player1'; // This could be a role like 'south' or a unique ID
//   const socketId = 'newSocketId123';

//   beforeEach(() => {
//     mockSocket = { id: socketId, emit: sinon.spy(), join: sinon.spy(), to: sinon.stub().returns({ emit: sinon.spy() }) };
//     mockIo = { to: sinon.stub().returns({ emit: sinon.spy() }) }; // For broadcasts to room
//     mockGetGame = sinon.stub(gameRepository, 'getGame');
//     mockUpdateGame = sinon.stub(gameRepository, 'updateGame');
//   });

//   afterEach(() => {
//     sinon.restore();
//   });

//   it('should allow a disconnected player to rejoin an active game', async () => {
//     const mockGameState = {
//       gameId,
//       gamePhase: GAME_PHASES.PLAYING,
//       players: {
//         [playerId]: { id: playerId, name: 'Player One', socketId: 'oldSocketId', isConnected: false, hand: [] },
//         player2: { id: 'player2', name: 'Player Two', socketId: 'socket2', isConnected: true, hand: [] },
//       }
//     };
//     mockGetGame.withArgs(gameId).resolves(mockGameState);
//     mockUpdateGame.resolves();

//     await handleRejoinGame(mockSocket, mockIo, gameId, playerId);

//     expect(mockGetGame).to.have.been.calledOnceWith(gameId);
//     expect(mockGameState.players[playerId].socketId).to.equal(socketId);
//     expect(mockGameState.players[playerId].isConnected).to.be.true;
//     expect(mockUpdateGame).to.have.been.calledOnceWith(gameId, mockGameState);
//     expect(mockSocket.join).to.have.been.calledOnceWith(gameId);
//     expect(mockSocket.emit).to.have.been.calledWith(GAME_EVENTS.GAME_STATE_UPDATE, mockGameState);
//     expect(mockIo.to(gameId).emit).to.have.been.calledWith(GAME_EVENTS.PLAYER_RECONNECTED, sinon.match.object);
//     // The second io.to().emit is for GAME_STATE_UPDATE to the room
//     expect(mockIo.to(gameId).emit).to.have.been.calledWith(GAME_EVENTS.GAME_STATE_UPDATE, mockGameState);
//   });

//   it('should fail if game not found', async () => {
//     mockGetGame.withArgs(gameId).resolves(null);
//     await handleRejoinGame(mockSocket, mockIo, gameId, playerId);
//     expect(mockSocket.emit).to.have.been.calledWith(GAME_EVENTS.ERROR, { message: 'Game not found. Cannot rejoin.' });
//     expect(mockUpdateGame).to.not.have.been.called;
//   });

//   it('should fail if player not found in game', async () => {
//     const mockGameState = { gameId, gamePhase: GAME_PHASES.PLAYING, players: {} };
//     mockGetGame.withArgs(gameId).resolves(mockGameState);
//     await handleRejoinGame(mockSocket, mockIo, gameId, 'nonExistentPlayer');
//     expect(mockSocket.emit).to.have.been.calledWith(GAME_EVENTS.ERROR, { message: 'Player not found in this game or slot unavailable.' });
//   });

//   it('should fail if player is already connected', async () => {
//     const mockGameState = {
//       gameId,
//       gamePhase: GAME_PHASES.PLAYING,
//       players: { [playerId]: { id: playerId, socketId: 'otherSocket123', isConnected: true } }
//     };
//     mockGetGame.withArgs(gameId).resolves(mockGameState);
//     await handleRejoinGame(mockSocket, mockIo, gameId, playerId);
//     expect(mockSocket.emit).to.have.been.calledWith(GAME_EVENTS.ERROR, sinon.match({ message: `Player ${playerId} is already connected to this game.`}));
//   });

//   it('should fail if game is already over', async () => {
//     const mockGameState = {
//       gameId,
//       gamePhase: GAME_PHASES.GAME_OVER, // Game is over
//       players: { [playerId]: { id: playerId, socketId: 'oldSocketId', isConnected: false } }
//     };
//     mockGetGame.withArgs(gameId).resolves(mockGameState);
//     await handleRejoinGame(mockSocket, mockIo, gameId, playerId);
//     expect(mockSocket.emit).to.have.been.calledWith(GAME_EVENTS.ERROR, { message: 'Cannot rejoin: Game is already over.' });
//   });
// });


// describe('handlePlayerDisconnect', () => {
//   let mockSocket, mockIo, mockGetGame, mockUpdateGame;
//   const gameId = 'testGameDisconnect';
//   const playerRole = 'south';
//   const socketId = 'socketToDisconnect';

//   beforeEach(() => {
//     mockSocket = { id: socketId };
//     mockIo = { to: sinon.stub().returns({ emit: sinon.spy() }) };
//     // Ensure gameRepository is stubbed if these tests are in a separate file
//     // If in the same file as above, sinon.restore() in afterEach handles it.
//     if (!gameRepository.getGame.isSinonProxy) mockGetGame = sinon.stub(gameRepository, 'getGame');
//     else mockGetGame = gameRepository.getGame;

//     if (!gameRepository.updateGame.isSinonProxy) mockUpdateGame = sinon.stub(gameRepository, 'updateGame');
//     else mockUpdateGame = gameRepository.updateGame;
//   });

//   afterEach(() => {
//     sinon.restore();
//   });

//   it('should mark player as disconnected, save state, and notify room', async () => {
//     const mockGameState = {
//       gameId,
//       players: {
//         [playerRole]: { name: 'South Player', socketId: socketId, isConnected: true },
//         north: { name: 'North Player', socketId: 'otherSocket', isConnected: true }
//       }
//     };
//     mockGetGame.withArgs(gameId).resolves(mockGameState);
//     mockUpdateGame.resolves();

//     await handlePlayerDisconnect(mockSocket, mockIo, gameId);

//     expect(mockGetGame).to.have.been.calledOnceWith(gameId);
//     expect(mockGameState.players[playerRole].isConnected).to.be.false;
//     expect(mockGameState.players[playerRole].socketId).to.be.null;
//     expect(mockUpdateGame).to.have.been.calledOnceWith(gameId, mockGameState);
//     expect(mockIo.to(gameId).emit).to.have.been.calledWith(GAME_EVENTS.PLAYER_DISCONNECTED, sinon.match.object);
//     expect(mockIo.to(gameId).emit).to.have.been.calledWith(GAME_EVENTS.GAME_STATE_UPDATE, mockGameState);
//     // Conceptual: Add check for timer comment
//     // const sourceCode = handlePlayerDisconnect.toString();
//     // expect(sourceCode).to.include('// TODO: Implement a timer here.');
//   });

//   it('should not proceed if game not found for disconnect', async () => {
//     mockGetGame.withArgs(gameId).resolves(null);
//     await handlePlayerDisconnect(mockSocket, mockIo, gameId);
//     expect(mockUpdateGame).to.not.have.been.called;
//   });
// });
