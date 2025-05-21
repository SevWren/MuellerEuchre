import { MongoClient, ObjectId } from 'mongodb';
import { log } from '../utils/logger.js';
import databaseConfig from '../config/database.js';

class GameRepository {
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
            this.collection = this.db.collection('games');
            this.connected = true;
            
            log(1, 'Successfully connected to MongoDB');
            
            // Create indexes
            await this.createIndexes();
            
        } catch (error) {
            log(3, `Failed to connect to MongoDB: ${error.message}`);
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
                { 'gameId': 1 }, 
                { unique: true, name: 'gameId_unique' }
            );
            
            await this.collection.createIndex(
                { 'players.id': 1 },
                { name: 'players.id_index' }
            );
            
            await this.collection.createIndex(
                { 'updatedAt': 1 }, 
                { 
                    expireAfterSeconds: 86400, // 24h TTL
                    name: 'updatedAt_ttl' 
                }
            );
            
            log(1, 'Database indexes created successfully');
            
        } catch (error) {
            log(2, `Error creating database indexes: ${error.message}`);
            throw error;
        }
    }

    /**
     * Saves a game state to the database
     * @param {Object} gameState - The game state to save
     * @returns {Promise<string>} The game ID
     */
    async saveGame(gameState) {
        if (!this.connected) {
            throw new Error('Not connected to database');
        }
        
        try {
            const gameId = gameState.gameId || new ObjectId().toHexString();
            const now = new Date();
            
            // Prepare the game document
            const gameDoc = {
                ...gameState,
                gameId,
                updatedAt: now,
                createdAt: gameState.createdAt || now
            };
            
            // Update or insert the game document
            await this.collection.updateOne(
                { gameId },
                { $set: gameDoc },
                { upsert: true }
            );
            
            log(1, `Game ${gameId} saved successfully`);
            return gameId;
            
        } catch (error) {
            log(3, `Error saving game: ${error.message}`);
            throw error;
        }
    }

    /**
     * Loads a game state from the database
     * @param {string} gameId - The ID of the game to load
     * @returns {Promise<Object>} The loaded game state
     */
    async loadGame(gameId) {
        if (!this.connected) {
            throw new Error('Not connected to database');
        }
        
        try {
            const gameDoc = await this.collection.findOne({ gameId });
            
            if (!gameDoc) {
                throw new Error(`Game ${gameId} not found`);
            }
            
            // Remove MongoDB _id field and return the rest
            const { _id, ...gameState } = gameDoc;
            
            log(1, `Game ${gameId} loaded successfully`);
            return gameState;
            
        } catch (error) {
            log(3, `Error loading game ${gameId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Finds active games for a player
     * @param {string} playerId - The player's ID
     * @returns {Promise<Array>} List of active games for the player
     */
    async findActiveGamesByPlayer(playerId) {
        if (!this.connected) {
            throw new Error('Not connected to database');
        }
        
        try {
            return await this.collection
                .find({ 
                    'players.id': playerId,
                    'gameOver': { $ne: true }
                })
                .sort({ updatedAt: -1 })
                .limit(10)
                .toArray();
                
        } catch (error) {
            log(3, `Error finding games for player ${playerId}: ${error.message}`);
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
            log(1, 'Disconnected from MongoDB');
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
        log(3, `Error during cleanup: ${error.message}`);
        process.exit(1);
    }
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
