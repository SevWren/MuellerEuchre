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
import { gameRepository } from "./db/gameRepository.js";
import { hydrateGames } from "./game/state.js";

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(express.json()); // For parsing application/json

// Serve static files from the 'public' directory
const publicDirectoryPath = path.join(__dirname, "..", "public");
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

/**
 * Starts the server, including database connection and state hydration.
 */
async function startServer() {
  try {
    // Connect to the database
    await gameRepository.connect();

    // Find all active games and hydrate the in-memory state
    const activeGames = await gameRepository.findAllActiveGames();
    if (activeGames && activeGames.length > 0) {
      hydrateGames(activeGames);
    } else {
      logger.info("No active games found in the database to hydrate.");
    }

    // Start the server
    httpServer.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
      logger.info(`Access the game at http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to start server.");
    process.exit(1);
  }
}

// Graceful shutdown handler
const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`
${signal} received. Shutting down gracefully...`);
    httpServer.close(async () => {
      logger.info("HTTP server closed.");
      await gameRepository.disconnect();
      process.exit(0);
    });
  });
});

startServer();

export default httpServer; // Export for potential testing or programmatic use
