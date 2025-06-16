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
    registerGameOverHandlers(socket, io); // Add this line

    socket.on('disconnect', (reason) => {
      handlePlayerDisconnect(socket, io);
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
