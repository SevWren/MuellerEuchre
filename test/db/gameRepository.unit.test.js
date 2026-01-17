import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GameRepository, gameRepository as singletonGameRepository } from '../../src/db/gameRepository.js';
import logger from '../../src/utils/logger.js';
import databaseConfig from '../../src/config/database.js'; // Assuming this exists or will be mocked

// --- Mock MongoDB Client ---
class MockCollection {
  constructor(name = 'games') {
    this.name = name;
    this.documents = new Map(); // Store documents by gameId
    this.indexes = new Map();
    this.createIndex = mock.fn(async (keys, options) => {
      this.indexes.set(options.name, { keys, options });
      return Promise.resolve(options.name);
    });
    this.updateOne = mock.fn(async (filter, update, options) => {
      const gameId = filter.gameId;
      if (!gameId) throw new Error('Filter must contain gameId');

      let matchedCount = 0;
      let upsertedCount = 0;

      let doc = this.documents.get(gameId);
      if (doc) {
        matchedCount = 1;
        doc = { ...doc, ...update.$set };
        if (update.$setOnInsert && doc.createdAt === undefined) {
          doc.createdAt = update.$setOnInsert.createdAt;
        }
      } else if (options.upsert) {
        upsertedCount = 1;
        doc = { ...update.$set };
        if (update.$setOnInsert) {
          doc.createdAt = update.$setOnInsert.createdAt;
        }
      } else {
        return { matchedCount: 0, upsertedCount: 0 };
      }

      this.documents.set(gameId, { _id: doc.gameId, ...doc }); // Simulate _id for simplicity
      return { matchedCount, upsertedCount };
    });
    this.findOne = mock.fn(async (filter) => {
      const gameId = filter.gameId;
      const doc = this.documents.get(gameId);
      return Promise.resolve(doc ? { ...doc } : null);
    });
    this.find = mock.fn((filter) => {
      let results = Array.from(this.documents.values()).filter(doc => {
        let match = true;
        for (const key in filter) {
          if (key.startsWith('players.')) {
            const playerId = filter[key];
            const playersInDoc = Object.values(doc.players || {});
            if (!playersInDoc.some(p => p.id === playerId)) {
              match = false;
              break;
            }
          } else if (key === 'gameOver') {
            if (filter[key].$ne && doc.gameOver === filter[key].$ne) {
              match = false;
              break;
            }
          } else if (doc[key] !== filter[key]) {
            match = false;
            break;
          }
        }
        return match;
      });

      let sortFn = () => 0; // Default no-op sort
      let limitValue = results.length;

      return {
        sort: mock.fn(function(sortKeys) {
          // Simple mock sort for updatedAt descending
          if (sortKeys.updatedAt === -1) {
            sortFn = (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);
          }
          return this; // Chainable
        }),
        limit: mock.fn(function(limit) {
          limitValue = limit;
          return this; // Chainable
        }),
        toArray: mock.fn(async () => {
          const sortedResults = [...results].sort(sortFn);
          return Promise.resolve(sortedResults.slice(0, limitValue).map(doc => {
            const { _id, ...rest } = doc;
            return rest;
          }));
        }),
      };
    });
  }
  clear() {
    this.documents.clear();
    this.indexes.clear();
    this.createIndex.mock.resetCalls();
    this.updateOne.mock.resetCalls();
    this.findOne.mock.resetCalls();
    this.find.mock.resetCalls();
  }
}

class MockDb {
  constructor(name) {
    this.name = name;
    this.collections = new Map();
    this.collection = mock.fn((name) => {
      if (!this.collections.has(name)) {
        this.collections.set(name, new MockCollection(name));
      }
      return this.collections.get(name);
    });
  }
  clear() {
    this.collections.forEach(col => col.clear());
    this.collections.clear();
    this.collection.mock.resetCalls();
  }
}

class MockMongoClient {
  constructor(connectionString, options) {
    this.connectionString = connectionString;
    this.options = options;
    this.dbs = new Map();
    this.connect = mock.fn(async () => Promise.resolve(this));
    this.db = mock.fn((name) => {
      if (!this.dbs.has(name)) {
        this.dbs.set(name, new MockDb(name));
      }
      return this.dbs.get(name);
    });
    this.close = mock.fn(async () => Promise.resolve());
  }
  clear() {
    this.dbs.forEach(db => db.clear());
    this.dbs.clear();
    this.connect.mock.resetCalls();
    this.db.mock.resetCalls();
    this.close.mock.resetCalls();
  }
}

// --- Test Suite ---
describe('GameRepository', () => {
  let repository;
  let mockMongoClient;
  let mockCollection;
  let loggerInfoMock;
  let loggerErrorMock;
  let loggerWarnMock;

  // Mock database config for consistency
  const mockDatabaseConfig = {
    mongodb: {
      host: 'localhost',
      port: '27017',
      database: 'euchre_test_db',
      options: {},
    },
  };

  beforeEach(() => {
    mockMongoClient = new MockMongoClient();
    mockCollection = new MockCollection();

    // Mock dependencies: logger and MongoClient constructor
    loggerInfoMock = mock.method(logger, 'info', () => {});
    loggerErrorMock = mock.method(logger, 'error', () => {});
    loggerWarnMock = mock.method(logger, 'warn', () => {});

    // Mock the MongoClient import
    mock.module('mongodb', { MongoClient: mock.fn(() => mockMongoClient), ObjectId: class ObjectId {} });
    mock.module('../../src/config/database.js', { default: mockDatabaseConfig });

    repository = new GameRepository();
    // Directly set the mocked components after construction but before connect()
    repository.client = mockMongoClient;
    repository.db = mockMongoClient.db(mockDatabaseConfig.mongodb.database);
    repository.collection = repository.db.collection('games');
    
    // Ensure the mocked methods are available on the collection instance
    repository.collection.createIndex = mockCollection.createIndex;
    repository.collection.updateOne = mockCollection.updateOne;
    repository.collection.findOne = mockCollection.findOne;
    repository.collection.find = mockCollection.find;
  });

  afterEach(() => {
    mock.restoreAll(); // Restore all mocks after each test
    mockMongoClient.clear();
    mockCollection.clear();
  });

  describe('constructor', () => {
    it('should initialize properties correctly', () => {
      const newRepo = new GameRepository();
      assert.strictEqual(newRepo.client, null);
      assert.strictEqual(newRepo.db, null);
      assert.strictEqual(newRepo.collection, null);
      assert.strictEqual(newRepo.connected, false);
    });
  });

  describe('connect()', () => {
    it('should connect to MongoDB, set connected to true, and create indexes', async () => {
      await repository.connect();

      assert.strictEqual(repository.connected, true);
      assert.strictEqual(mockMongoClient.connect.mock.callCount(), 1);
      assert.strictEqual(mockCollection.createIndex.mock.callCount(), 3); // Expected 3 indexes
      assert.strictEqual(loggerInfoMock.mock.callCount(), 2); // Connected and indexes created
    });

    it('should do nothing if already connected', async () => {
      repository.connected = true;
      await repository.connect();

      assert.strictEqual(mockMongoClient.connect.mock.callCount(), 0);
      assert.strictEqual(mockCollection.createIndex.mock.callCount(), 0);
    });

    it('should log an error and throw if connection fails', async () => {
      mockMongoClient.connect.mock.mockImplementation(async () => {
        throw new Error('Connection failed');
      });

      await assert.rejects(repository.connect(), { message: 'Connection failed' });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });

  describe('createIndexes()', () => {
    beforeEach(() => {
      repository.connected = true; // Simulate connected state
    });

    it('should create all required indexes', async () => {
      await repository.createIndexes();
      assert.strictEqual(mockCollection.createIndex.mock.callCount(), 3);
      assert.ok(mockCollection.indexes.has('gameId_unique'));
      assert.ok(mockCollection.indexes.has('players.id_index'));
      assert.ok(mockCollection.indexes.has('updatedAt_ttl'));
    });

    it('should log an error and throw if index creation fails', async () => {
      mockCollection.createIndex.mock.mockImplementation(() => {
        throw new Error('Index creation failed');
      });

      await assert.rejects(repository.createIndexes(), { message: 'Index creation failed' });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });

  describe('updateGame()', () => {
    const gameId = 'testGame1';
    const initialGameState = { id: gameId, players: [{ id: 'p1' }], phase: 'LOBBY' };
    const updatedGameState = { id: gameId, players: [{ id: 'p1' }], phase: 'PLAYING' };

    beforeEach(() => {
      repository.connected = true;
    });

    it('should throw an error if not connected', async () => {
      repository.connected = false;
      await assert.rejects(repository.updateGame(gameId, initialGameState), {
        message: 'Not connected to database. Call connect() first.'
      });
    });

    it('should throw an error if gameId is not provided', async () => {
      await assert.rejects(repository.updateGame(null, initialGameState), {
        message: 'gameId must be provided to updateGame.'
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1); // For the validation error
    });

    it('should create a new game if it does not exist (upsert)', async () => {
      mockCollection.updateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 0, upsertedCount: 1 }));
      await repository.updateGame(gameId, initialGameState);
      assert.strictEqual(mockCollection.updateOne.mock.callCount(), 1);
      assert.deepStrictEqual(mockCollection.updateOne.mock.calls[0].arguments[0], { gameId });
      assert.strictEqual(loggerInfoMock.mock.calls.some(c => c.arguments[1].includes('created successfully')), true);
    });

    it('should update an existing game', async () => {
      // Simulate game existing
      mockCollection.documents.set(gameId, { _id: gameId, ...initialGameState });
      mockCollection.updateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 1, upsertedCount: 0 }));

      await repository.updateGame(gameId, updatedGameState);
      assert.strictEqual(mockCollection.updateOne.mock.callCount(), 1);
      assert.strictEqual(loggerInfoMock.mock.calls.some(c => c.arguments[1].includes('updated successfully')), true);
    });

    it('should log a warning if game was neither updated nor inserted', async () => {
      mockCollection.updateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 0, upsertedCount: 0 }));
      await repository.updateGame(gameId, initialGameState);
      assert.strictEqual(loggerWarnMock.mock.callCount(), 1);
      assert.ok(loggerWarnMock.mock.calls[0].arguments[1].includes('neither updated nor inserted'));
    });

    it('should log an error and throw if database operation fails', async () => {
      mockCollection.updateOne.mock.mockImplementation(() => {
        throw new Error('DB write failed');
      });
      await assert.rejects(repository.updateGame(gameId, initialGameState), {
        message: /DB write failed/
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });

  describe('getGame()', () => {
    const gameId = 'testGame2';
    const storedGameState = { gameId, phase: 'LOBBY', players: [{ id: 'p1' }] };

    beforeEach(() => {
      repository.connected = true;
      mockCollection.documents.set(gameId, { _id: gameId, ...storedGameState });
    });

    it('should throw an error if not connected', async () => {
      repository.connected = false;
      await assert.rejects(repository.getGame(gameId), {
        message: 'Not connected to database. Call connect() first.'
      });
    });

    it('should return null if gameId is not provided and log a warning', async () => {
      const result = await repository.getGame(null);
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.callCount(), 1);
    });

    it('should retrieve a game state', async () => {
      const result = await repository.getGame(gameId);
      assert.deepStrictEqual(result, storedGameState);
      assert.strictEqual(mockCollection.findOne.mock.callCount(), 1);
      assert.strictEqual(loggerInfoMock.mock.calls.some(c => c.arguments[1].includes('loaded successfully')), true);
    });

    it('should return null if game is not found', async () => {
      const result = await repository.getGame('nonExistentGame');
      assert.strictEqual(result, null);
      assert.strictEqual(loggerInfoMock.mock.calls.some(c => c.arguments[1].includes('not found')), true);
    });

    it('should log an error and return null if database operation fails', async () => {
      mockCollection.findOne.mock.mockImplementation(() => {
        throw new Error('DB read failed');
      });
      const result = await repository.getGame(gameId);
      assert.strictEqual(result, null);
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });

  describe('findActiveGamesByPlayer()', () => {
    const playerId = 'playerXYZ';
    const game1 = { gameId: 'g1', players: [{ id: playerId }], gameOver: false, updatedAt: new Date() };
    const game2 = { gameId: 'g2', players: [{ id: playerId }], gameOver: false, updatedAt: new Date(Date.now() - 1000) };
    const game3 = { gameId: 'g3', players: [{ id: 'otherPlayer' }], gameOver: false, updatedAt: new Date() }; // Not for player
    const game4 = { gameId: 'g4', players: [{ id: playerId }], gameOver: true, updatedAt: new Date() }; // Game Over

    beforeEach(() => {
      repository.connected = true;
      mockCollection.documents.set(game1.gameId, { _id: game1.gameId, ...game1 });
      mockCollection.documents.set(game2.gameId, { _id: game2.gameId, ...game2 });
      mockCollection.documents.set(game3.gameId, { _id: game3.gameId, ...game3 });
      mockCollection.documents.set(game4.gameId, { _id: game4.gameId, ...game4 });
    });

    it('should throw an error if not connected', async () => {
      repository.connected = false;
      await assert.rejects(repository.findActiveGamesByPlayer(playerId), {
        message: 'Not connected to database'
      });
    });

    it('should return active games for a specific player, sorted by updatedAt descending', async () => {
      const result = await repository.findActiveGamesByPlayer(playerId);
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0].gameId, game1.gameId); // Sorted by updatedAt descending
      assert.deepStrictEqual(result[1].gameId, game2.gameId);
      assert.strictEqual(mockCollection.find.mock.callCount(), 1);
    });

    it('should return an empty array if no games found for player', async () => {
      const result = await repository.findActiveGamesByPlayer('nonExistentPlayer');
      assert.deepStrictEqual(result, []);
    });

    it('should log an error and throw if database operation fails', async () => {
      mockCollection.find.mock.mockImplementation(() => {
        throw new Error('DB find failed');
      });
      await assert.rejects(repository.findActiveGamesByPlayer(playerId), {
        message: /DB find failed/
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });

  describe('findAllActiveGames()', () => {
    const game1 = { gameId: 'g1', players: [], gameOver: false, updatedAt: new Date() };
    const game2 = { gameId: 'g2', players: [], gameOver: false, updatedAt: new Date(Date.now() - 1000) };
    const game3 = { gameId: 'g3', players: [], gameOver: true, updatedAt: new Date() }; // Game Over

    beforeEach(() => {
      repository.connected = true;
      mockCollection.documents.set(game1.gameId, { _id: game1.gameId, ...game1 });
      mockCollection.documents.set(game2.gameId, { _id: game2.gameId, ...game2 });
      mockCollection.documents.set(game3.gameId, { _id: game3.gameId, ...game3 });
    });

    it('should throw an error if not connected', async () => {
      repository.connected = false;
      await assert.rejects(repository.findAllActiveGames(), {
        message: 'Not connected to database'
      });
    });

    it('should return all active games, sorted by updatedAt descending', async () => {
      const result = await repository.findAllActiveGames();
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result[0].gameId, game1.gameId); // Sorted by updatedAt descending
      assert.deepStrictEqual(result[1].gameId, game2.gameId);
      assert.strictEqual(mockCollection.find.mock.callCount(), 1);
    });

    it('should return an empty array if no active games found', async () => {
      mockCollection.documents.clear();
      mockCollection.documents.set(game3.gameId, { _id: game3.gameId, ...game3 }); // Only game over
      const result = await repository.findAllActiveGames();
      assert.deepStrictEqual(result, []);
    });

    it('should log an error and throw if database operation fails', async () => {
      mockCollection.find.mock.mockImplementation(() => {
        throw new Error('DB find all failed');
      });
      await assert.rejects(repository.findAllActiveGames(), {
        message: /DB find all failed/
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });

  describe('disconnect()', () => {
    it('should close the client connection if connected', async () => {
      repository.connected = true;
      await repository.disconnect();
      assert.strictEqual(mockMongoClient.close.mock.callCount(), 1);
      assert.strictEqual(repository.connected, false);
      assert.strictEqual(loggerInfoMock.mock.calls.some(c => c.arguments[1].includes('Disconnected from MongoDB')), true);
    });

    it('should do nothing if not connected', async () => {
      repository.connected = false;
      await repository.disconnect();
      assert.strictEqual(mockMongoClient.close.mock.callCount(), 0);
    });
  });

  // Test the singleton instance (gameRepository)
  describe('singleton gameRepository', () => {
    it('should be an instance of GameRepository', () => {
      assert.ok(singletonGameRepository instanceof GameRepository);
    });

    // Note: Testing process.on handlers is challenging in unit tests.
    // This typically requires more elaborate mocking of process globals
    // or is better suited for integration tests. For unit testing, we focus
    // on the class methods.
  });
});
