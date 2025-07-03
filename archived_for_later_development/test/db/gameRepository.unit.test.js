// filepath: test/db/gameRepository.unit.test.js
/**
 * @file Unit tests for the GameRepository class.
 * @module test/db/gameRepository.unit.test
 * @description This test suite verifies the functionality of the GameRepository, which is the
 * sole data access layer for MongoDB in the application. Tests cover connection,
 * data manipulation (get, update), and disconnection logic, ensuring that the repository
 * interacts correctly with the mocked database driver and handles various scenarios gracefully.
 * This suite uses the project's standard `createMockedModule` wrapper for mocking dependencies.
 */

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { createMockedModule } from '../../../test/utils/esmock_wrapper.js';

// Enable chai-as-promised for testing promise rejections
chai.use(chaiAsPromised);

// Define path for module under test
const GAME_REPOSITORY_PATH = '../../src/db/gameRepository.js';

/**
 * @describe Top-level test suite for the GameRepository.
 */
describe('GameRepository Unit Tests', () => {
  let GameRepository;
  let mockCollection;
  let mockDb;
  let mockClient;
  let mockMongoClient;
  let stubbedLogger;

  /**
   * @function beforeEach
   * @description Sets up mocks and imports a fresh instance of the GameRepository before each test.
   * This ensures test isolation by providing clean mocks for the MongoDB driver and the logger.
   */
  beforeEach(async () => {
    // --- Mock Setup for mongodb library ---
    // This setup mocks the chain: new MongoClient -> connect -> db -> collection -> method
    mockCollection = {
      createIndex: sinon.stub().resolves('index_created'),
      updateOne: sinon.stub().resolves({ matchedCount: 

### **Refactored File: `test/db/gameRepository.unit.test.js`**

```javascript
// filepath: test/db/gameRepository.unit.test.js
/**
 * @file Unit tests for the GameRepository class.
 * @module test/db/gameRepository.unit.test
 * @description This test suite verifies the functionality of the GameRepository, which is the
 * sole data access layer for MongoDB in the application. Tests cover connection,
 * data manipulation (get, update), and disconnection logic, ensuring that the repository
 * interacts correctly with the mocked database driver and handles various scenarios gracefully.
 * This suite uses the project's standard `createMockedModule` wrapper for mocking dependencies.
 */

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { createMockedModule } from '../../utils/esmock_wrapper.js';

// Register the chai-as-promised plugin
chai.use(chaiAsPromised);

// Define path for module under test
const GAME_REPOSITORY_PATH = '../../src/db/gameRepository.js';

/**
 * @describe Top-level test suite for the GameRepository.
 */
describe('GameRepository Unit Tests', () => {
  let GameRepository;
  let mockCollection;
  let mockDb;
  let mockClient;
  let mockMongoClient;
  let stubbedLogger;

  /**
   * @function beforeEach
   * @description Sets up mocks and imports a fresh instance of the GameRepository before each test.
   * This ensures test isolation by providing clean mocks for the MongoDB driver and the logger.
   */
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
    const { module: gameRepoModule } = await createMockedModule(
      import.meta.url,
      GAME_REPOSITORY_PATH1, upsertedCount: 0 }),
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
    const { module: gameRepoModule } = await createMockedModule(
      import.meta.url,
      GAME_REPOSITORY_PATH,
      {
        'mongodb': {
          MongoClient: mockMongoClient
        },
        '@/utils/logger.js': {
          default: stubbedLogger,
          log: stubbedLogger.info
        }
      }
    );
    GameRepository = gameRepoModule.GameRepository;
  });

  /**
   * @function afterEach
   * @description Restores all sinon stubs and spies after each test to ensure a clean state.
   */
  afterEach(() => {
    sinon.restore();
  });

  /**
   * @describe Test suite for the `connect` method.
   */
  describe('connect', () => {
    /**
     * @it should successfully connect to the database, create indexes, and log success.
     */
    it('should connect to MongoDB and create indexes', async () => {
      const repo = new GameRepository();
      await repo.connect();

      expect(repo.connected).to.be.true;
      expect(mockMongoClient.calledOnce).to.be.true;
      expect(mockClient.connect.calledOnce).to.be.true;
      expect(mockCollection.createIndex.calledThrice).to.be.true;,
      {
        'mongodb': {
          MongoClient: mockMongoClient
        },
        '@/utils/logger.js': {
          default: stubbedLogger,
          log: stubbedLogger.info
        }
      }
    );
    GameRepository = gameRepoModule.GameRepository;
  });

  /**
   * @function afterEach
   * @description Restores all sinon stubs and spies after each test to ensure a clean state.
   */
  afterEach(() => {
    sinon.restore();
  });

  /**
   * @describe Test suite for the `connect` method.
   */
  describe('connect', () => {
    /**
     * @it should successfully connect to the database, create indexes, and log success.
     */
    it('should connect to MongoDB and create indexes', async () => {
      const repo = new GameRepository();
      await repo.connect();

      expect(repo.connected).to.be.true;
      expect(mockMongoClient.calledOnce).to.be.true;
      expect(mockClient.connect.calledOnce).to.be.true;
      expect(mockCollection.createIndex.calledThrice).to.be.true; // 3 indexes are created
      expect(stubbedLogger.info.calledWith('Successfully connected to MongoDB')).to.be.true;
    });

    /**
     * @it should prevent re-connection if already connected.
     */
    it('should not try to connect if already connected', async () => {
      const repo = new GameRepository();
      await repo.connect(); // First connection
      mockClient.connect.resetHistory(); // Reset spy for second call check

      await repo.connect(); // Second call
      expect(mockClient.connect.called).to.be.false;
    });

    /**
     * @ // 3 indexes are created
      expect(stubbedLogger.info.calledWith('Successfully connected to MongoDB')).to.be.true;
    });

    /**
     * @it should prevent re-connection if already connected.
     */
    it('should not try to connect if already connected', async () => {
      const repo = new GameRepository();
      await repo.connect(); // First connection
      mockClient.connect.resetHistory(); // Reset spy for second call check

      await repo.connect(); // Second call
      expect(mockClient.connect.called).to.be.false;
    });

    /**
     * @it should properly handle and log errors during the connection process.
     */
    it('should handle MongoDB connection errors', async () => {
      mockClient.connect.rejects(new Error('Connection failed'));
      const repo = new GameRepository();
      await expect(repo.connect()).to.be.rejectedWith('Connection failed');
      //it should properly handle and log errors during the connection process.
     */
    it('should handle MongoDB connection errors', async () => {
      mockClient.connect.rejects(new Error('Connection failed'));
      const repo = new GameRepository();
      await expect(repo.connect()).to.be.rejectedWith('Connection failed');
      // Check the second argument (message string) passed to logger.error
      expect(stubbedLogger.error.calledWith(sinon.match.any, sinon.match(/Failed to connect to MongoDB/))).to.be.true;
    });
  });

  /**
   * @describe Test suite for the `updateGame` method.
   */
  describe('updateGame', () => {
    let repo;
    beforeEach(async () => {
      repo = new GameRepository();
      await repo.connect();
     Check the second argument (message string) passed to logger.error
      expect(stubbedLogger.error.calledWith(sinon.match.any, sinon.match(/Failed to connect to MongoDB/))).to.be.true;
    });
  });

  /**
   * @describe Test suite for the `updateGame` method.
   */
  describe('updateGame', () => {
    let repo;
    beforeEach(async () => {
      repo = new GameRepository();
      await repo.connect();
    });

    /**});

    /**
     * @it should throw an error if the database connection has not been established.
     */
    it('should throw an error if not connected', async () => {
      const disconnectedRepo = new GameRepository(); // Fresh instance
      await expect(disconnectedRepo.updateGame('game1', {})).to.be.rejectedWith('Not connected to database. Call connect() first.');
    });

    /**
     * @it should
     * @it should throw an error if the database connection has not been established.
     */
    it('should throw an error if not connected', async () => {
      const disconnectedRepo = new GameRepository(); // Fresh instance
      await expect(disconnectedRepo.updateGame('game1', {})).to.be.rejectedWith('Not connected to database. Call connect() first.');
    });

    /**
     * @it should throw an error if throw an error if `gameId` is null or undefined.
     */
    it('should throw an error if gameId is not provided', async () => {
      await expect(repo.updateGame(null, {}) `gameId` is null or undefined.
     */
    it('should throw an error if gameId is not provided', async () => {
      await expect(repo.updateGame(null, {})).to.be).to.be.rejectedWith('gameId must be provided to updateGame.');
    });

    /**
     * @.rejectedWith('gameId must be provided to updateGame.');
    });

    /**
     * @it should call theit should call the database driver's `updateOne` with the correct query filter, update document, and upsert option.
 database driver's `updateOne` with the correct query filter, update document, and upsert option.
     */
         */
    it('should call updateOne with correct filter, data, and options', async () => {
it('should call updateOne with correct filter, data, and options', async () => {
      const gameId      const gameId = 'game1';
      const gameState = { gameId, phase: 'PLAYING', = 'game1';
      const gameState = { gameId, phase: 'PLAYING', players: [] }; players: [] };
      await repo.updateGame(gameId, gameState);

      expect(mockCollection.updateOne.
      await repo.updateGame(gameId, gameState);

      expect(mockCollection.updateOne.calledOnce).tocalledOnce).to.be.true;
      const [filter, update, options] = mockCollection.updateOne.be.true;
      const [filter, update, options] = mockCollection.updateOne.firstCall..firstCall.args;
      
      expect(filter).to.deep.equal({ gameId });
args;
      
      expect(filter).to.deep.equal({ gameId });
      expect(update      expect(update.$set.gameId).to.equal(gameId);
      expect(update.$set.phase).to.equal('PLAYING');
      expect(update.$set).to.have.property('.$set.gameId).to.equal(gameId);
      expect(update.$set.phase).toupdatedAt');
      expect(update.$setOnInsert).to.have.property('createdAt');
      expect(.equal('PLAYING');
      expect(update.$set).to.have.property('updatedAt');
      expect(update.$setOnInsert).to.have.property('createdAt');
      expect(options).to.options).to.deep.equal({ upsert: true });
    });

    /**
     * @it should handledeep.equal({ upsert: true });
    });

    /**
     * @it should handle and log database and log database errors that occur during the update operation.
     */
    it('should handle database errors during update', errors that occur during the update operation.
     */
    it('should handle database errors during update', async () => { async () => {
      mockCollection.updateOne.rejects(new Error('DB write failed'));
      await
      mockCollection.updateOne.rejects(new Error('DB write failed'));
      await expect(repo. expect(repo.updateGame('game1', {})).to.be.rejectedWith('DB write failed');
updateGame('game1', {})).to.be.rejectedWith('DB write failed');
      // Check the      // Check the second argument (message string) passed to logger.error
      expect(stubbedLogger.error.calledWith(sinon.match.any, sinon.match.string)).to.be.true; // second argument (message string) passed to logger.error
      expect(stubbedLogger.error.calledWith( Check for any string message
    });
  });

  /**
   * @describe Test suite for the `sinon.match.any, sinon.match.string)).to.be.true; // Check for any stringgetGame` method.
   */
  describe('getGame', () => {
    let repo;
 message
    });
  });

  /**
   * @describe Test suite for the `getGame` method    beforeEach(async () => {
      repo = new GameRepository();
      await repo.connect();
.
   */
  describe('getGame', () => {
    let repo;
    beforeEach(    });

    /**
     * @it should return the game state object without the internal MongoDB `_id`async () => {
      repo = new GameRepository();
      await repo.connect();
    });

    /**
     * @it should return the game state object without the internal MongoDB `_id` field.
      field.
     */
    it('should return a game state and strip the _id field', async () =>*/
    it('should return a game state and strip the _id field', async () => {
      const {
      const mockGameDoc = { _id: 'mongoId123', gameId: 'game mockGameDoc = { _id: 'mongoId123', gameId: 'game1', phase: 'SCOR1', phase: 'SCORING' };
      mockCollection.findOne.withArgs({ gameId: 'ING' };
      mockCollection.findOne.withArgs({ gameId: 'game1' }).resolves(game1' }).resolves(mockGameDoc);
      
      const result = await repo.getGame('game1');
      
      expect(result).to.not.have.property('_id');
      expectmockGameDoc);
      
      const result = await repo.getGame('game1');
      
      (result).to.have.property('gameId', 'game1');
      expect(result).to.expect(result).to.not.have.property('_id');
      expect(result).to.have.have.property('phase', 'SCORING');
    });

    /**
     * @it should returnproperty('gameId', 'game1');
      expect(result).to.have.property('phase', ' null when the requested game is not found in the database.
     */
    it('should return null if gameSCORING');
    });

    /**
     * @it should return null when the requested game is not found is not found', async () => {
      mockCollection.findOne.withArgs({ gameId: 'game- in the database.
     */
    it('should return null if game is not found', async () => {not-found' }).resolves(null);
      const result = await repo.getGame('game-not
      mockCollection.findOne.withArgs({ gameId: 'game-not-found' }).resolves(null);
      const result = await repo.getGame('game-not-found');
      expect(result-found');
      expect(result).to.be.null;
    });

    /**
     * @it should return null and not query the database if `gameId` is not provided.
     */
    ).to.be.null;
    });

    /**
     * @it should return null and not query the database ifit('should return null if gameId is not provided', async () => {
      const result = await repo. `gameId` is not provided.
     */
    it('should return null if gameId is not providedgetGame(null);
      expect(result).to.be.null;
      expect(mockCollection.', async () => {
      const result = await repo.getGame(null);
      expect(result).findOne.called).to.be.false;
    });

    /**
     * @it should handle databaseto.be.null;
      expect(mockCollection.findOne.called).to.be.false;
 errors during retrieval and return null.
     */
    it('should handle database errors during getGame and return null', async ()    });

    /**
     * @it should handle database errors during retrieval and return null.
     */
 => {
      mockCollection.findOne.rejects(new Error('DB read failed'));
      const result =    it('should handle database errors during getGame and return null', async () => {
      mockCollection.findOne.rejects(new Error('DB read failed'));
      const result = await repo.getGame('game1 await repo.getGame('game1');
      expect(result).to.be.null;
      // Check the second argument (message string) passed to logger.error
      expect(stubbedLogger.error.called');
      expect(result).to.be.null;
      // Check the second argument (message string) passed to logger.error
      expect(stubbedLogger.error.calledWith(sinon.match.any, sinon.match.string)).to.be.true; // Check for any string message
    });
  With(sinon.match.any, sinon.match.string)).to.be.true; // Check for any string message
    });
  });

  /**
   * @describe Test suite for the `disconnect` method.
   */
  describe('disconnect', () => {
    /**
     * @it should close});

  /**
   * @describe Test suite for the `disconnect` method.
   */
  describe('disconnect', () => {
    /**
     * @it should close the client connection if one is active.
     */
    it('should call client.close if connected', async () => {
      const repo = the client connection if one is active.
     */
    it('should call client.close if connected', async () => {
      const repo = new GameRepository();
      await repo.connect();
      await repo.disconnect();
      expect(mockClient.close.calledOnce).to.be.true;
      expect( new GameRepository();
      await repo.connect();
      await repo.disconnect();
      expect(mockClient.close.calledOnce).to.be.true;
      expect(repo.connected).to.be.repo.connected).to.be.false;
    });

    /**
     * @it should not attempt to close a connection or throw an error if not connected.
     */
    it('should not throw an error if not connected', async () => {
      const repo = new GameRepository(); // Not connected
      await expect(repofalse;
    });

    /**
     * @it should not attempt to close a connection or throw an error if not connected.
     */
    it('should not throw an error if not connected', async () => {
      .disconnect()).to.not.be.rejected;
      expect(mockClient.close.called).to.be.false;
    });
  });
});