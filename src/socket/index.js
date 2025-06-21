/**
 * Socket.IO server initialization and basic connection handling.
 * @module socket/index
 */
import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import { handlePlayerConnect, handlePlayerDisconnect } from './handlers/playerConnectionHandlers.js';
import { registerLobbyHandlers } from './handlers/lobbyHandlers.js';
import { registerBiddingHandlers } from './handlers/biddingHandlers.js';
import { registerGoAloneHandlers } from './handlers/goAloneHandlers.js';
import { registerPlayingHandlers } from './handlers/playingHandlers.js';
import { registerGameOverHandlers } from './handlers/gameOverHandlers.js'; // Add this import

/**
 * Initializes and configures the Socket.IO server.
 * @param {http.Server} httpServer - The HTTP server instance to attach Socket.IO to.
 * @returns {Server} The configured Socket.IO server instance.
 */
export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on('connection', (socket) => {
    socket.emit('welcome', {
      message: `Welcome to the Euchre server! Your ID is ${socket.id}`,
      socketId: socket.id,
    });

    handlePlayerConnect(socket, io);
    registerLobbyHandlers(socket, io);
    registerBiddingHandlers(socket, io);
    registerGoAloneHandlers(socket, io);
    registerPlayingHandlers(socket, io);
    registerGameOverHandlers(socket, io);

    // Player Reconnection Handler
    // Client should emit GAME_EVENTS.RECONNECT with { gameId, playerId (role or uniqueId) }
    socket.on(GAME_EVENTS.RECONNECT, (data) => {
      if (data && data.gameId && data.playerId) {
        logger.info({ socketId: socket.id, gameId: data.gameId, playerId: data.playerId }, `Received ${GAME_EVENTS.RECONNECT} request.`);
        // playerConnectionHandlers.handleRejoinGame is async, but socket.on handlers are typically not async.
        // The async operations within handleRejoinGame will complete, and responses (emits) will be sent when ready.
        handleRejoinGame(socket, io, data.gameId, data.playerId);
      } else {
        logger.warn({ socketId: socket.id, dataReceived: data }, `Invalid data for ${GAME_EVENTS.RECONNECT}. 'gameId' and 'playerId' are required.`);
        socket.emit(GAME_EVENTS.ERROR, { message: "Rejoin request failed: 'gameId' and 'playerId' are required." });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, `Socket disconnected. Current game ID on socket: ${socket.currentGameId || 'N/A'}`);
      // Pass socket.currentGameId which should have been set when player joined a game.
      // handlePlayerDisconnect is async, but it's fine to call it from a sync event handler.
      handlePlayerDisconnect(socket, io, socket.currentGameId);
    });

    socket.on('echo', (data, callback) => {
        logger.info({ socketId: socket.id, data }, 'Received echo event');
        if (callback && typeof callback === 'function') {
            callback(data);
        } else {
            socket.emit('echoResponse', data);
        }
    });
  });

  logger.info('Socket.IO server initialized and all event handlers registered.'); // Updated log message
  return io;
}
