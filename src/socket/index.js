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
 * Initializes and configures the Socket.IO server, attaching it to the provided HTTP server.
 * It sets up CORS policies and registers a main 'connection' handler that, in turn,
 * registers all game-specific event handlers for each new client socket.
 *
 * @param {import('http').Server} httpServer - The HTTP server instance to attach Socket.IO to.
 * @returns {import('socket.io').Server} The configured Socket.IO server instance.
 */
export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allows all origins for CORS (consider restricting in production)
      methods: ["GET", "POST"],
    },
  });

  /**
   * Handles new client connections to the Socket.IO server.
   * For each new connection:
   * - Emits a 'welcome' message to the connected client.
   * - Calls `handlePlayerConnect` for initial player state setup (note: this function has known limitations for multi-game scenarios).
   * - Registers various game-specific event handlers by calling functions from the `./handlers/` directory.
   * - Sets up listeners for core socket events like 'disconnect', `GAME_EVENTS.RECONNECT`, and a simple 'echo' for testing.
   *
   * @param {import('socket.io').Socket} socket - The socket object representing the newly connected client.
   */
  io.on('connection', (socket) => {
    socket.emit('welcome', {
      message: `Welcome to the Euchre server! Your ID is ${socket.id}`,
      socketId: socket.id,
    });

    // Initial connection handling (with caveats mentioned in playerConnectionHandlers.js)
    handlePlayerConnect(socket, io);

    // Register handlers for different game phases and actions
    registerLobbyHandlers(socket, io);
    registerBiddingHandlers(socket, io);
    registerGoAloneHandlers(socket, io);
    registerPlayingHandlers(socket, io);
    registerGameOverHandlers(socket, io); // For handling 'request_new_game' etc.

    /**
     * Handles the `GAME_EVENTS.RECONNECT` event from a client.
     * This is used when a client attempts to rejoin an ongoing game after a disconnection.
     * It requires `gameId` and `playerId` (which can be a role or unique ID) in the payload.
     * Calls `handleRejoinGame` to process the rejoin attempt.
     *
     * @param {object} data - Payload from the client.
     * @param {string} data.gameId - The ID of the game to rejoin.
     * @param {string} data.playerId - The player's identifier (role or unique ID).
     */
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

    /**
     * Handles the standard 'disconnect' event for a client socket.
     * Logs the disconnection and calls `handlePlayerDisconnect` to update the game state,
     * using `socket.currentGameId` (if set during game join) to identify the affected game.
     *
     * @param {string} reason - The reason for disconnection (e.g., 'client namespace disconnect', 'server namespace disconnect', 'transport error').
     */
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, `Socket disconnected. Current game ID on socket: ${socket.currentGameId || 'N/A'}`);
      // Pass socket.currentGameId which should have been set when player joined a game.
      // handlePlayerDisconnect is async, but it's fine to call it from a sync event handler.
      handlePlayerDisconnect(socket, io, socket.currentGameId);
    });

    /**
     * Handles a simple 'echo' event for testing client-server communication.
     * Responds by sending the received data back to the client, either via a callback (if provided)
     * or by emitting an 'echoResponse' event.
     *
     * @param {any} data - The data payload sent by the client.
     * @param {function} [callback] - Optional acknowledgement callback. If provided, it's called with the received data.
     */
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
