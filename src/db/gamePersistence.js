/**
 * @file src/db/gamePersistence.js
 * @module db/gamePersistence
 * @description
 * File-based persistence for Euchre Multiplayer game state.
 * This module provides a simple file-based persistence layer for game state,
 * primarily intended for development and testing purposes.
 * 
 * Saturday July 26 - This file is on hold as it is NOT A LAYER 1
 * File, and WE ARE STILL FINISHING LAYER 1 files.
 * 
 * The GamePersistence class implements the same interface as gameRepository.js
 * but uses the local filesystem instead of a database.
 * 
 * @see src/db/gameRepository.js - Implements the same interface
 * @see src/game/state.js - For game state structure
 * 
 * @example
 * // Create a new instance
 * const persistence = new GamePersistence({
 *   fs: require('fs'),
 *   basePath: './saved_games'
 * });
 * 
 * // Save a game
 * await persistence.updateGame('game123', gameState);
 * 
 * // Load a game
 * const loadedState = await persistence.getGame('game123');
 */

/**
 * @typedef {Object} GamePersistenceOptions
 * @property {Object} fs - Filesystem implementation
 * @property {string} [basePath='.'] - Base directory for saved games
 * @property {function(string): boolean} fs.existsSync - Check if file exists
 * @property {function(string, string, string): void} fs.writeFileSync - Write file synchronously
 * @property {function(string, string): string} fs.readFileSync - Read file synchronously
 * @property {function(string): void} [fs.mkdirSync] - Create directory (optional)
 */

/**
 * @typedef {Object} GameState
 * @property {string} id - Unique game identifier
 * @property {Object} players - Game players and their states
 * @property {string} phase - Current game phase
 * @property {Object} [metadata] - Additional game metadata
 */

export class GamePersistence {
  /**
   * Create a new GamePersistence instance
   * @param {GamePersistenceOptions} options - Configuration options
   * @throws {Error} If required options are missing or invalid
   */
  constructor(options = {}) {
    if (!options.fs) {
      throw new Error('fs implementation is required');
    }
    
    const requiredFsMethods = ['writeFileSync', 'readFileSync', 'existsSync'];
    const missingMethods = requiredFsMethods.filter(method => 
      typeof options.fs[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
      throw new Error(
        `fs implementation is missing required methods: ${missingMethods.join(', ')}`
      );
    }
    
    this.fs = options.fs;
    this.basePath = options.basePath || '.';
    
    // Ensure base directory exists if mkdirSync is available
    if (this.fs.mkdirSync && this.basePath !== '.') {
      try {
        this.fs.mkdirSync(this.basePath, { recursive: true });
      } catch (error) {
        console.error(`Failed to create base directory: ${this.basePath}`, error);
        throw new Error('Failed to initialize persistence directory');
      }
    }
  }

  /**
   * No-op connect method to maintain compatibility with gameRepository interface
   * @returns {Promise<void>} Resolves when initialization is complete
   * @see src/db/gameRepository.js - Implements the same interface
   */
  async connect() {
    // No connection needed for file-based persistence
    return Promise.resolve();
  }

  /**
   * Saves game state to a file
   * @param {string} gameId - The ID of the game to save (alphanumeric with hyphens/underscores)
   * @param {GameState} gameState - The game state to save
   * @returns {Promise<string>} The game ID if successful
   * @throws {Error} If gameId is invalid or save operation fails
   * @see src/game/state.js - For expected game state structure
   */
  async updateGame(gameId, gameState) {
    if (!gameId || typeof gameId !== 'string' || !/^[a-zA-Z0-9\-_]+$/.test(gameId)) {
      throw new Error('Invalid game ID. Must be a non-empty string with alphanumeric characters, hyphens, or underscores');
    }
    
    if (!gameState || typeof gameState !== 'object') {
      throw new Error('Invalid game state: must be an object');
    }
    
    const filePath = this.getFilePath(gameId);
    let data;
    
    try {
      data = JSON.stringify(gameState, null, 2);
    } catch (error) {
      throw new Error('Failed to stringify game state: ' + error.message);
    }
    
    try {
      // Ensure directory exists
      if (this.fs.mkdirSync) {
        const dir = filePath.substring(0, filePath.lastIndexOf('/'));
        if (dir && !this.fs.existsSync(dir)) {
          this.fs.mkdirSync(dir, { recursive: true });
        }
      }
      
      this.fs.writeFileSync(filePath, data, { encoding: 'utf8', flag: 'w' });
      return gameId;
    } catch (error) {
      const errorMessage = `Failed to save game ${gameId}: ${error.message}`;
      console.error(errorMessage, { gameId, filePath });
      throw new Error(errorMessage);
    }
  }

  /**
   * Loads game state from a file
   * @param {string} gameId - The ID of the game to load
   * @returns {Promise<GameState|null>} The loaded game state, or null if not found
   * @throws {Error} If gameId is invalid or file is corrupted
   * @see src/game/state.js - For expected game state structure
   */
  async getGame(gameId) {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('Invalid game ID: must be a non-empty string');
    }
    
    const filePath = this.getFilePath(gameId);
    
    try {
      if (!this.fs.existsSync(filePath)) {
        return null;
      }
      
      const data = this.fs.readFileSync(filePath, { encoding: 'utf8' });
      if (!data) {
        throw new Error('Empty game file');
      }
      
      const gameState = JSON.parse(data);
      
      // Basic validation of loaded state
      if (!gameState || typeof gameState !== 'object') {
        throw new Error('Invalid game state format');
      }
      
      return gameState;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File not found is not an error, just return null
      }
      
      const errorMessage = `Failed to load game ${gameId}: ${error.message}`;
      console.error(errorMessage, { gameId, filePath, error });
      throw new Error(errorMessage);
    }
  }

  /**
   * No-op disconnect method to maintain compatibility with gameRepository interface
   * @returns {Promise<void>} Resolves when cleanup is complete
   * @see src/db/gameRepository.js - Implements the same interface
   */
  async disconnect() {
    // No disconnection needed for file-based persistence
    return Promise.resolve();
  }

  /**
   * Generates the file path for a game ID
   * @private
   * @param {string} gameId - The game ID
   * @returns {string} The full file path
   * @throws {Error} If gameId contains invalid characters
   */
  getFilePath(gameId) {
    // Sanitize gameId to prevent directory traversal
    const safeGameId = gameId.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (!safeGameId) {
      throw new Error('Invalid game ID: contains no valid characters');
    }
    
    // Normalize path to prevent directory traversal
    const normalizedBase = this.basePath.replace(/\\/g, '/').replace(/\/\.\.\//g, '/');
    return `${normalizedBase}/${safeGameId}.json`;
  }
}

// Initialize the singleton instance asynchronously
let _gamePersistenceInstance = null;

/**
 * Gets the singleton instance of GamePersistence
 * @returns {Promise<GamePersistence>} The game persistence instance
 * @throws {Error} If initialization fails
 */
export async function getGamePersistence() {
  if (!_gamePersistenceInstance) {
    try {
      // Use dynamic import to support both ESM and CJS
      const fs = await import('node:fs');
      _gamePersistenceInstance = new GamePersistence({ 
        fs,
        basePath: './saved_games'
      });
    } catch (error) {
      console.error('Failed to initialize game persistence:', error);
      throw new Error('Failed to initialize game persistence: ' + error.message);
    }
  }
  return _gamePersistenceInstance;
}

// For backward compatibility, export a promise that resolves to the instance
/**
 * @type {Promise<GamePersistence>}
 * @deprecated Use getGamePersistence() instead
 */
export const gamePersistence = getGamePersistence();
