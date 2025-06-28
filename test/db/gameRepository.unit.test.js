// filepath: test/db/gameRepository.unit.test.js
import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

// Define paths for esmock
const gameRepositoryModulePath = '../../src/db/gameRepository.js';
const loggerModulePath = '../../src/utils/logger.js';
const mongoDbModulePath = 'mongodb'; // This is a node_module, so esmock will find it by name

describe('GameRepository Unit Tests', () => {
  let GameRepository;
  let mockCollection;
  let mockDb;
  let mockClient;
  let mockMongoClient;
  let stubbedLogger;

  beforeEach(async () => {
    // --- Mock Setup for mongodb library ---
    // This setup mocks the chain: new MongoClient -> connect -> db -> collection -> method
    mockCollection = {
      createIndex: sinon.stub().resolves('index_created'),
      updateOne: sinon.stub().resolves({ matchedCount: 1, upsertedCount: 0 }),
      findOne: sinon.stub().resolves(null),
      // Mock the find().sort().limit().toArray() chain
      find: sinon.stub().returns({
        sort: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        toArray: sinon.stub().resolves([]),
      }),
    };
    mockDb = {
      collection: sinon.stub().returns(mockCollection),
    };
    mockClient = {
      connect: sinon.stub().resolves(),
      db: sinon.stub().returns(mockDb),
      close: sinon.stub().resolves(),
    };
    mockMongoClient = sinon.stub().returns(mockClient);

    // --- Mock Setup for local dependencies ---
    stubbedLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    };

    // --- Import the module under test with mocks ---
    const { GameRepository: ImportedRepo } = await esmock(gameRepositoryModulePath, {
      [mongoDbModulePath]: {
        MongoClient: mockMongoClient,
      },
      [loggerModulePath]: {
        default: { // Mock the default export
          info: stubbedLogger.info,
          warn: stubbedLogger.warn,
          error: stubbedLogger.error,
          debug: stubbedLogger.debug,
        },
        log: stubbedLogger.info, // Keep mocking the named export `log` for completeness if it's used elsewhere
      },
    });
    GameRepository = ImportedRepo;
  });

  afterEach(() => {
    sinon.restore();
    esmock.purge(gameRepositoryModulePath);
  });

  describe('connect', () => {
    it('should connect to MongoDB and create indexes', async () => {
      const repo = new GameRepository();
      await repo.connect();

      expect(repo.connected).to.be.true;
      expect(mockMongoClient.calledOnce).to.be.true;
      expect(mockClient.connect.calledOnce).to.be.true;
      expect(mockCollection.createIndex.calledThrice).to.be.true; // 3 indexes are created
      expect(stubbedLogger.info.calledWith('Successfully connected to MongoDB')).to.be.true;
    });

    it('should not try to connect if already connected', async () => {
      const repo = new GameRepository();
      await repo.connect(); // First connection
      mockClient.connect.resetHistory(); // Reset spy for second call check

      await repo.connect(); // Second call
      expect(mockClient.connect.called).to.be.false;
    });

    it('should handle MongoDB connection errors', async () => {
      mockClient.connect.rejects(new Error('Connection failed'));
      const repo = new GameRepository();
      await expect(repo.connect()).to.be.rejectedWith('Connection failed');
      // Check the second argument (message string) passed to logger.error
      expect(stubbedLogger.error.calledWith(sinon.match.any, sinon.match(/Failed to connect to MongoDB/))).to.be.true;
    });
  });

  describe('updateGame', () => {
    let repo;
    beforeEach(async () => {
      repo = new GameRepository();
      await repo.connect();
    });

    it('should throw an error if not connected', async () => {
      const disconnectedRepo = new GameRepository(); // Fresh instance
      await expect(disconnectedRepo.updateGame('game1', {})).to.be.rejectedWith('Not connected to database. Call connect() first.');
    });

    it('should throw an error if gameId is not provided', async () => {
      await expect(repo.updateGame(null, {})).to.be.rejectedWith('gameId must be provided to updateGame.');
    });

    it('should call updateOne with correct filter, data, and options', async () => {
      const gameId = 'game1';
      const gameState = { gameId, phase: 'PLAYING', players: [] };
      await repo.updateGame(gameId, gameState);

      expect(mockCollection.updateOne.calledOnce).to.be.true;
      const [filter, update, options] = mockCollection.updateOne.firstCall.args;
      
      expect(filter).to.deep.equal({ gameId });
      expect(update.$set.gameId).to.equal(gameId);
      expect(update.$set.phase).to.equal('PLAYING');
      expect(update.$set).to.have.property('updatedAt');
      expect(update.$setOnInsert).to.have.property('createdAt');
      expect(options).to.deep.equal({ upsert: true });
    });

    it('should handle database errors during update', async () => {
      mockCollection.updateOne.rejects(new Error('DB write failed'));
      await expect(repo.updateGame('game1', {})).to.be.rejectedWith('DB write failed');
      // Check the second argument (message string) passed to logger.error
      expect(stubbedLogger.error.calledWith(sinon.match.any, sinon.match.string)).to.be.true; // Check for any string message
    });
  });

  describe('getGame', () => {
    let repo;
    beforeEach(async () => {
      repo = new GameRepository();
      await repo.connect();
    });

    it('should return a game state and strip the _id field', async () => {
      const mockGameDoc = { _id: 'mongoId123', gameId: 'game1', phase: 'SCORING' };
      mockCollection.findOne.withArgs({ gameId: 'game1' }).resolves(mockGameDoc);
      
      const result = await repo.getGame('game1');
      
      expect(result).to.not.have.property('_id');
      expect(result).to.have.property('gameId', 'game1');
      expect(result).to.have.property('phase', 'SCORING');
    });

    it('should return null if game is not found', async () => {
      mockCollection.findOne.withArgs({ gameId: 'game-not-found' }).resolves(null);
      const result = await repo.getGame('game-not-found');
      expect(result).to.be.null;
    });

    it('should return null if gameId is not provided', async () => {
      const result = await repo.getGame(null);
      expect(result).to.be.null;
      expect(mockCollection.findOne.called).to.be.false;
    });

    it('should handle database errors during getGame and return null', async () => {
      mockCollection.findOne.rejects(new Error('DB read failed'));
      const result = await repo.getGame('game1');
      expect(result).to.be.null;
      // Check the second argument (message string) passed to logger.error
      expect(stubbedLogger.error.calledWith(sinon.match.any, sinon.match.string)).to.be.true; // Check for any string message
    });
  });

  describe('disconnect', () => {
    it('should call client.close if connected', async () => {
      const repo = new GameRepository();
      await repo.connect();
      await repo.disconnect();
      expect(mockClient.close.calledOnce).to.be.true;
      expect(repo.connected).to.be.false;
    });

    it('should not throw an error if not connected', async () => {
      const repo = new GameRepository(); // Not connected
      await expect(repo.disconnect()).to.not.be.rejected;
      expect(mockClient.close.called).to.be.false;
    });
  });
});