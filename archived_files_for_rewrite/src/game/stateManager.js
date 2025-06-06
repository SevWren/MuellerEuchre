import { gameRepository } from '../db/gameRepository.js';
import { log } from '../utils/logger.js';
import { GAME_EVENTS } from '../config/constants.js';

/**
 * GameStateManager handles the persistence and retrieval of game states
 */
class GameStateManager {
    constructor() {
        this.games = new Map(); // In-memory cache of active games
    }

    /**
     * Initializes the game state manager
     */
    async initialize() {
        try {
            await gameRepository.connect();
            log(1, 'GameStateManager initialized');
        } catch (error) {
            log(3, `Failed to initialize GameStateManager: ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates a new game with the given initial state
     * @param {Object} initialState - The initial game state
     * @returns {Promise<string>} The game ID
     */
    async createGame(initialState) {
        try {
            const gameId = await gameRepository.saveGame(initialState);
            this.games.set(gameId, initialState);
            log(1, `Created new game: ${gameId}`);
            return gameId;
        } catch (error) {
            log(3, `Error creating game: ${error.message}`);
            throw error;
        }
    }

    /**
     * Loads a game state by ID
     * @param {string} gameId - The ID of the game to load
     * @returns {Promise<Object>} The loaded game state
     */
    async loadGame(gameId) {
        // Check in-memory cache first
        if (this.games.has(gameId)) {
            return this.games.get(gameId);
        }

        try {
            const gameState = await gameRepository.loadGame(gameId);
            this.games.set(gameId, gameState);
            log(1, `Loaded game from database: ${gameId}`);
            return gameState;
        } catch (error) {
            log(3, `Error loading game ${gameId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Saves the current state of a game
     * @param {string} gameId - The ID of the game to save
     * @param {Object} gameState - The game state to save
     * @returns {Promise<void>}
     */
    async saveGame(gameId, gameState) {
        try {
            // Update in-memory cache
            this.games.set(gameId, gameState);
            
            // Persist to database
            await gameRepository.saveGame({
                ...gameState,
                gameId,
                updatedAt: new Date()
            });
            
            log(2, `Game state saved: ${gameId}`);
        } catch (error) {
            log(3, `Error saving game ${gameId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates a game state and persists it
     * @param {string} gameId - The ID of the game to update
     * @param {Function} updateFn - Function that takes the current state and returns the new state
     * @returns {Promise<Object>} The updated game state
     */
    async updateGame(gameId, updateFn) {
        try {
            // Load current state
            const currentState = await this.loadGame(gameId);
            
            // Apply updates
            const updatedState = updateFn(currentState);
            
            // Save updated state
            await this.saveGame(gameId, updatedState);
            
            return updatedState;
        } catch (error) {
            log(3, `Error updating game ${gameId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Finds active games for a player
     * @param {string} playerId - The player's ID
     * @returns {Promise<Array>} List of active games for the player
     */
    async findActiveGamesByPlayer(playerId) {
        try {
            // First check in-memory cache
            const activeGames = Array.from(this.games.entries())
                .filter(([_, game]) => 
                    game.players.some(p => p.id === playerId) && 
                    !game.gameOver
                )
                .map(([gameId, game]) => ({
                    gameId,
                    ...game,
                    fromCache: true
                }));

            // If we found games in cache, return them
            if (activeGames.length > 0) {
                return activeGames;
            }

            // Otherwise, check the database
            const dbGames = await gameRepository.findActiveGamesByPlayer(playerId);
            
            // Cache the games from the database
            dbGames.forEach(game => {
                if (game.gameId) {
                    this.games.set(game.gameId, game);
                }
            });
            
            return dbGames;
        } catch (error) {
            log(3, `Error finding games for player ${playerId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cleans up resources
     */
    async cleanup() {
        try {
            await gameRepository.disconnect();
            this.games.clear();
            log(1, 'GameStateManager cleaned up');
        } catch (error) {
            log(3, `Error during cleanup: ${error.message}`);
            throw error;
        }
    }
}

// Export a singleton instance
export const gameStateManager = new GameStateManager();

// Handle process termination
const cleanup = async () => {
    try {
        await gameStateManager.cleanup();
        process.exit(0);
    } catch (error) {
        log(3, `Error during cleanup: ${error.message}`);
        process.exit(1);
    }
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
