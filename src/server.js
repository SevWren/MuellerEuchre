/**
 * Main server entry point for the Euchre game.
 * Initializes Express, HTTP server, and Socket.IO.
 * @module server
 */
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io'; // Renamed to avoid conflict if I import my own Server class later

import logger from './utils/logger.js';
import { initializeSocket } from './socket/index.js';
// import { getGameState, resetFullGame } from './game/state.js'; // Not strictly needed at server init if state.js self-initializes

/**
 * @constant {string} __filename
 * @description The absolute path to the current module file. ES Module equivalent of `__filename`.
 */
// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
/**
 * @constant {string} __dirname
 * @description The directory name of the current module. ES Module equivalent of `__dirname`.
 */
const __dirname = path.dirname(__filename);

/**
 * @constant {number} PORT
 * @description The port number on which the server will listen.
 * Defaults to 3000 if `process.env.PORT` is not set.
 */
const PORT = process.env.PORT || 3000;
/**
 * @constant {object} app
 * @description The Express application instance.
 */
const app = express();
/**
 * @constant {http.Server} httpServer
 * @description The Node.js HTTP server instance, created from the Express app.
 */
const httpServer = http.createServer(app);

/**
 * @description Middleware to parse incoming JSON requests. Populates `req.body`.
 */
// Middleware
app.use(express.json()); // For parsing application/json

/**
 * @description Middleware to serve static files (e.g., HTML, CSS, client-side JavaScript)
 * from the `public` directory, located at the root of the project.
 */
// Serve static files from the 'public' directory
const publicDirectoryPath = path.join(__dirname, '..', 'public'); // Assumes server.js is in src/, public/ is at root
logger.info(`Serving static files from: ${publicDirectoryPath}`);
app.use(express.static(publicDirectoryPath));

/**
 * @name GET /api/status
 * @description Basic API route for health check or server status.
 * Responds with a JSON object containing the server status and current timestamp.
 * @function
 * @memberof module:server
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
// Basic API route for health check / status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @constant {SocketIOServer} io
 * @description The Socket.IO server instance, initialized by `initializeSocket`
 * and attached to the `httpServer`. This instance handles all WebSocket communications.
 * The `initializeSocket` function is expected to configure event handlers for new connections.
 * @see {@link module:socket/index.initializeSocket}
 */
// Initialize Socket.IO and pass the HTTP server
const io = initializeSocket(httpServer);
logger.info('Socket.IO initialized.');

/**
 * @description Starts the HTTP server and makes it listen on the configured `PORT`.
 * Logs server information once listening.
 */
// Start the server
httpServer.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
  logger.info(`Access the game at http://localhost:${PORT}`);
});

/**
 * @description Handles graceful shutdown of the server on SIGINT, SIGTERM, and SIGQUIT signals.
 * It attempts to close the HTTP server and then exits the process.
 * This allows ongoing requests to finish and resources to be potentially cleaned up.
 */
// Graceful shutdown handler (basic)
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach(signal => {
  process.on(signal, () => {
    logger.info(`
${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('HTTP server closed.');
      // io.close(); // Close Socket.IO connections if necessary (Socket.IO v3+ handles this with httpServer.close())
      // Add any other cleanup here (e.g., database connections)
      process.exit(0);
    });
  });
});

/**
 * @description The main HTTP server instance. Exported for potential use in testing
 * or other programmatic scenarios that might require direct access to the server object.
 * @type {http.Server}
 */
export default httpServer; // Export for potential testing or programmatic use
