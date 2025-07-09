// filepath: src/db/gameRepository.js
/**
 * @file src/db/gameRepository.js
 * @module db/gameRepository
 * @description
 * WIP: This file may be out of date and should note
 * be considered a reliable source of information
 * that represents the current state of the project  
 *   MongoDB persistence layer for Euchre Multiplayer game state.
 *   This module is responsible for connecting to the database, saving, loading,
 *   and querying game state for active games. It is designed to be used by the
 *   state management and network layers (Layer 2 and Layer 3) and must not
 *   contain any game logic or state mutation outside of persistence operations.
 *
 *   Current State:
 *     - Implements a singleton GameRepository class for MongoDB.
 *     - Provides async connect, updateGame (upsert), getGame, and disconnect methods.
 *     - Handles TTL index for automatic cleanup of stale games.
 *     - Used by socket handlers and phase logic for persistence after key state transitions.
 *     - All code is ES Module and uses async/await.
 *     - Logging is performed via the async logger (see src/utils/logger.js).
 *
 *   Limitations / TODOs for Full Production Readiness:
 *     - No support for multi-game concurrency or sharding (single collection).
 *     - No transactional guarantees for multi-step updates (atomic per game only).
 *     - No schema validation at the DB layer (relies on application-level validation).
 *     - No support for player/user persistence (only game state).
 *     - No automated backup/restore or migration logic.
 *     - No explicit error codes for client consumption (errors are logged and thrown).
 *     - No integration with Redis or other caching for performance.
 *
 *   This file is architected to support a fully working 4-person multiplayer online Euchre game,
 *   but assumes that all state management, validation, and game logic are handled in other layers.
 *   It should be reviewed and extended as the codebase approaches production and as new persistence
 *   requirements (e.g., player stats, audit logs, game history) are identified.
 */

import { MongoClient, ObjectId } from "mongodb";
import logger from "../utils/logger.js"; // Import the default logger instance
import databaseConfig from "../config/database.js";

export class GameRepository {
  // Added export to the class
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.connected = false;
  }

  /**
   * Connects to the MongoDB database
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connected) return;

    try {
      const { host, port, database, options } = databaseConfig.mongodb;
      const connectionString = `mongodb://${host}:${port}`;

      this.client = new MongoClient(connectionString, options);

      await this.client.connect();
      this.db = this.client.db(database);
      this.collection = this.db.collection("games");
      this.connected = true;

      logger.info("Successfully connected to MongoDB");

      // Create indexes
      await this.createIndexes();
    } catch (error) {
      logger.error(
        { err: error },
        `Failed to connect to MongoDB: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Creates necessary indexes for the games collection
   * @private
   */
  async createIndexes() {
    try {
      await this.collection.createIndex(
        { gameId: 1 },
        { unique: true, name: "gameId_unique" },
      );

      await this.collection.createIndex(
        { "players.id": 1 },
        { name: "players.id_index" },
      );

      await this.collection.createIndex(
        { updatedAt: 1 },
        {
          expireAfterSeconds: 86400, // 24h TTL
          name: "updatedAt_ttl",
        },
      );

      logger.info("Database indexes created successfully");
    } catch (error) {
      logger.error(
        { err: error },
        `Error creating database indexes: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Saves a game state to the database
   * @param {Object} gameState - The game state to save
   * @returns {Promise<string>} The game ID
   */
  /**
   * Updates an existing game state or creates it if it doesn't exist (upsert).
   * Renamed from saveGame for clarity based on task requirements.
   * @param {string} gameId - The ID of the game to update.
   * @param {Object} gameState - The full game state to save.
   * @returns {Promise<string>} The game ID.
   */
  async updateGame(gameId, gameState) {
    if (!this.connected) {
      // Consider await this.connect() here if auto-connect is desired, or ensure connect is called externally.
      throw new Error("Not connected to database. Call connect() first.");
    }
    if (!gameId) {
      logger.error("updateGame called without gameId."); // This is a validation error, not a DB error, keep as string
      throw new Error("gameId must be provided to updateGame.");
    }

    try {
      const now = new Date();

      // Prepare the game document
      const gameDoc = {
        ...gameState, // gameState should ideally already contain its gameId
        gameId: gameId, // Ensure the key being queried is explicitly set
        updatedAt: now,
        // createdAt should ideally be set only on creation,
        // but upsert makes this tricky without a separate create method.
        // For simplicity, if gameState doesn't have createdAt, $setOnInsert will set it.
      };

      // Update or insert the game document
      const result = await this.collection.updateOne(
        { gameId }, // Query by the provided gameId
        {
          $set: gameDoc,
          $setOnInsert: { createdAt: gameState.createdAt || now }, // Set createdAt only on insert
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        logger.info(`Game ${gameId} created successfully.`);
      } else if (result.matchedCount > 0) {
        logger.info(`Game ${gameId} updated successfully.`);
      } else {
        logger.warn(
          `Game ${gameId} was neither updated nor inserted. This might indicate an issue.`,
        );
      }
      return gameId;
    } catch (error) {
      logger.error(
        { err: error, gameId },
        `Error updating game ${gameId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves a game state from the database.
   * Renamed from loadGame for clarity.
   * @param {string} gameId - The ID of the game to retrieve.
   * @returns {Promise<Object|null>} The loaded game state, or null if not found.
   */
  async getGame(gameId) {
    if (!this.connected) {
      throw new Error("Not connected to database. Call connect() first.");
    }
    if (!gameId) {
      logger.warn("getGame called without gameId.");
      return null;
    }

    try {
      const gameDoc = await this.collection.findOne({ gameId });

      if (!gameDoc) {
        logger.info(`Game ${gameId} not found in database.`);
        return null; // Return null if not found, as per typical repository pattern
      }

      // Remove MongoDB _id field and return the rest
      const { _id, ...gameState } = gameDoc;

      logger.info(`Game ${gameId} loaded successfully.`);
      return gameState;
    } catch (error) {
      // Log error but still return null or rethrow based on desired error handling
      logger.error(
        { err: error, gameId },
        `Error loading game ${gameId}: ${error.message}`,
      );
      // Depending on policy, you might rethrow or return null to indicate failure
      // For robustness, returning null on error (like not found) might be better for callers.
      return null;
    }
  }

  /**
   * Finds active games for a player
   * @param {string} playerId - The player's ID
   * @returns {Promise<Array>} List of active games for the player
   */
  async findActiveGamesByPlayer(playerId) {
    if (!this.connected) {
      throw new Error("Not connected to database");
    }

    try {
      return await this.collection
        .find({
          "players.id": playerId,
          gameOver: { $ne: true },
        })
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray();
    } catch (error) {
      logger.error(
        { err: error, playerId },
        `Error finding games for player ${playerId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Closes the database connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.connected = false;
      logger.info("Disconnected from MongoDB");
    }
  }
}

// Export a singleton instance
export const gameRepository = new GameRepository();

// Handle process termination
const cleanup = async () => {
  try {
    await gameRepository.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, `Error during cleanup: ${error.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
