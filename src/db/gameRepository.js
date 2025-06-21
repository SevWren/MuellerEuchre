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
            throw new Error('Not connected to database. Call connect() first.');
        }
        if (!gameId) {
            log(3, 'updateGame called without gameId.');
            throw new Error('gameId must be provided to updateGame.');
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
                  $setOnInsert: { createdAt: gameState.createdAt || now } // Set createdAt only on insert
                },
                { upsert: true }
            );
            
            if (result.upsertedCount > 0) {
                log(1, `Game ${gameId} created successfully.`);
            } else if (result.matchedCount > 0) {
                log(1, `Game ${gameId} updated successfully.`);
            } else {
                log(2, `Game ${gameId} was neither updated nor inserted. This might indicate an issue.`);
            }
            return gameId;
            
        } catch (error) {
            log(3, `Error updating game ${gameId}: ${error.message}`);
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
            throw new Error('Not connected to database. Call connect() first.');
        }
        if (!gameId) {
            log(2, 'getGame called without gameId.');
            return null;
        }
        
        try {
            const gameDoc = await this.collection.findOne({ gameId });
            
            if (!gameDoc) {
                log(1, `Game ${gameId} not found in database.`);
                return null; // Return null if not found, as per typical repository pattern
            }
            
            // Remove MongoDB _id field and return the rest
            const { _id, ...gameState } = gameDoc;
            
            log(1, `Game ${gameId} loaded successfully.`);
            return gameState;
            
        } catch (error) {
            // Log error but still return null or rethrow based on desired error handling
            log(3, `Error loading game ${gameId}: ${error.message}`);
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

// Conceptual Unit Tests for gameRepository.js

// describe('GameRepository', () => {
//   let repository;
//   let mockCollection;

//   beforeEach(async () => {
//     // repository = new GameRepository(); // Create a new instance for each test
//     // For testing, we'd likely inject a mock MongoDB client/collection
//     // This is a simplified setup assuming we could mock `this.collection`
//     mockCollection = {
//       updateOne: sinon.spy(async () => ({ matchedCount: 1, upsertedCount: 0 })),
//       findOne: sinon.spy(async (query) => {
//         if (query.gameId === 'existingGame') {
//           return { _id: 'mongoObjectId', gameId: 'existingGame', phase: 'PLAYING', players: [] };
//         }
//         return null;
//       }),
//       createIndex: sinon.spy(async () => true), // Mock createIndex
//     };

//     // Mock the connect method to avoid actual DB connection during unit tests
//     // and directly set up the mock collection.
//     repository = new GameRepository();
//     repository.client = { connect: sinon.spy(), db: () => ({ collection: () => mockCollection }) };
//     await repository.connect(); // This would set up the mockCollection via the mocked client
//     repository.collection = mockCollection; // Ensure mockCollection is used
//     repository.connected = true; // Simulate connected state
//   });

//   afterEach(() => {
//     sinon.restore(); // Restores all sinon spies and stubs
//   });

//   describe('updateGame', () => {
//     it('should call collection.updateOne with correct parameters for an existing game', async () => {
//       const gameId = 'testGame123';
//       const gameState = { gameId, phase: 'BIDDING', players: ['p1', 'p2'] };
//       await repository.updateGame(gameId, gameState);

//       expect(mockCollection.updateOne).to.have.been.calledOnce;
//       const callArgs = mockCollection.updateOne.getCall(0).args;
//       expect(callArgs[0]).to.deep.equal({ gameId }); // Filter
//       expect(callArgs[1].$set.gameId).to.equal(gameId);
//       expect(callArgs[1].$set.phase).to.equal('BIDDING');
//       expect(callArgs[1].$setOnInsert.createdAt).to.exist;
//       expect(callArgs[2]).to.deep.equal({ upsert: true }); // Options
//     });

//     it('should throw an error if gameId is not provided to updateGame', async () => {
//       try {
//         await repository.updateGame(null, { phase: 'LOBBY' });
//         expect.fail('Should have thrown an error for missing gameId');
//       } catch (e) {
//         expect(e.message).to.equal('gameId must be provided to updateGame.');
//       }
//     });
//   });

//   describe('getGame', () => {
//     it('should call collection.findOne with the gameId and return the game state', async () => {
//       const gameState = await repository.getGame('existingGame');
//       expect(mockCollection.findOne).to.have.been.calledOnceWith({ gameId: 'existingGame' });
//       expect(gameState).to.deep.equal({ gameId: 'existingGame', phase: 'PLAYING', players: [] });
//       expect(gameState._id).to.be.undefined; // Ensure MongoDB _id is stripped
//     });

//     it('should return null if game is not found', async () => {
//       const gameState = await repository.getGame('nonExistentGame');
//       expect(mockCollection.findOne).to.have.been.calledOnceWith({ gameId: 'nonExistentGame' });
//       expect(gameState).to.be.null;
//     });

//     it('should return null if gameId is not provided to getGame', async () => {
//       const gameState = await repository.getGame(null);
//       expect(mockCollection.findOne).to.not.have.been.called;
//       expect(gameState).to.be.null;
//     });
//   });
// });
