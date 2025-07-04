/**
 * Main server entry point for the Euchre game.
 * Initializes Express, HTTP server, and Socket.IO.
 * @module server
 */
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { Server as SocketIOServer } from "socket.io"; // Renamed to avoid conflict if I import my own Server class later

import logger from "./utils/logger.js";
import { initializeSocket } from "./socket/index.js";
// import { getGameState, resetFullGame } from './game/state.js'; // Not strictly needed at server init if state.js self-initializes

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(express.json()); // For parsing application/json

// Serve static files from the 'public' directory
const publicDirectoryPath = path.join(__dirname, "..", "public"); // Assumes server.js is in src/, public/ is at root
logger.info(`Serving static files from: ${publicDirectoryPath}`);
app.use(express.static(publicDirectoryPath));

// Basic API route for health check / status
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Initialize Socket.IO and pass the HTTP server
const io = initializeSocket(httpServer);
logger.info("Socket.IO initialized.");

// Start the server
httpServer.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
  logger.info(`Access the game at http://localhost:${PORT}`);
});

// Graceful shutdown handler (basic)
const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
signals.forEach((signal) => {
  process.on(signal, () => {
    logger.info(`
${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      logger.info("HTTP server closed.");
      // io.close(); // Close Socket.IO connections if necessary (Socket.IO v3+ handles this with httpServer.close())
      // Add any other cleanup here (e.g., database connections)
      process.exit(0);
    });
  });
});

export default httpServer; // Export for potential testing or programmatic use
