import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GamePersistence, getGamePersistence } from '../../src/db/gamePersistence.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../../src/utils/logger.js';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock file system implementation
class MockFs {
  constructor() {
    this.files = new Map();
    this.directories = new Set();
    this.writeFileSync = mock.fn((filePath, data, options) => {
      this.files.set(filePath, data);
    });
    this.readFileSync = mock.fn((filePath, options) => {
      if (!this.files.has(filePath)) {
        const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
        error.code = 'ENOENT';
        throw error;
      }
      return this.files.get(filePath);
    });
    this.existsSync = mock.fn((filePath) => {
      return this.files.has(filePath) || this.directories.has(filePath);
    });
    this.mkdirSync = mock.fn((dirPath, options) => {
      this.directories.add(dirPath);
    });
    this.clear = () => {
      this.files.clear();
      this.directories.clear();
      this.writeFileSync.mock.resetCalls();
      this.readFileSync.mock.resetCalls();
      this.existsSync.mock.resetCalls();
      this.mkdirSync.mock.resetCalls();
    };
  }
}

describe('GamePersistence', () => {
  let mockFs;
  let gamePersistence;
  let loggerErrorMock;
  let loggerWarnMock;

  beforeEach(() => {
    mockFs = new MockFs();
    // Mock logger methods used in gamePersistence
    loggerErrorMock = mock.method(logger, 'error', () => {});
    loggerWarnMock = mock.method(logger, 'warn', () => {});
    // Dynamically import to ensure fresh singleton for getGamePersistence
    gamePersistence = new GamePersistence({ fs: mockFs, basePath: path.join(__dirname, 'saved_games') });
  });

  afterEach(() => {
    mockFs.clear();
    mock.restoreAll(); // Restore all mocks after each test
  });

  describe('constructor', () => {
    it('should throw an error if fs is not provided', () => {
      assert.throws(() => new GamePersistence(), {
        message: 'fs implementation is required'
      });
    });

    it('should throw an error if fs is missing required methods', () => {
      assert.throws(() => new GamePersistence({ fs: { existsSync: () => true } }), {
        message: 'fs implementation is missing required methods: writeFileSync, readFileSync'
      });
    });

    it('should create basePath directory if mkdirSync is available', () => {
      const basePath = path.join(__dirname, 'test_games');
      const gp = new GamePersistence({ fs: mockFs, basePath });
      assert.strictEqual(mockFs.mkdirSync.mock.callCount(), 1);
      assert.deepStrictEqual(mockFs.mkdirSync.mock.calls[0].arguments[0], basePath);
      assert.ok(mockFs.directories.has(basePath));
    });

    it('should not throw if mkdirSync is not available and basePath is "."', () => {
      const fsWithoutMkdir = {
        writeFileSync: mock.fn(),
        readFileSync: mock.fn(),
        existsSync: mock.fn(),
      };
      assert.doesNotThrow(() => new GamePersistence({ fs: fsWithoutMkdir, basePath: '.' }));
    });

    it('should log and throw if mkdirSync fails', () => {
      mockFs.mkdirSync.mock.mockImplementation(() => { throw new Error('Permission denied'); });
      assert.throws(() => new GamePersistence({ fs: mockFs, basePath: '/invalid/path' }), {
        message: 'Failed to initialize persistence directory'
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
      assert.ok(loggerErrorMock.mock.calls[0].arguments[1].includes('Failed to create base directory'));
    });
  });

  describe('connect()', () => {
    it('should be a no-op and resolve immediately', async () => {
      await assert.doesNotReject(gamePersistence.connect());
    });
  });

  describe('updateGame()', () => {
    const gameId = 'game123';
    const gameState = { id: gameId, phase: 'LOBBY', players: {} };

    it('should save game state to a file', async () => {
      const result = await gamePersistence.updateGame(gameId, gameState);
      assert.strictEqual(result, gameId);
      assert.strictEqual(mockFs.writeFileSync.mock.callCount(), 1);
      assert.deepStrictEqual(mockFs.writeFileSync.mock.calls[0].arguments[0], gamePersistence.getFilePath(gameId));
      assert.strictEqual(mockFs.files.get(gamePersistence.getFilePath(gameId)), JSON.stringify(gameState, null, 2));
    });

    it('should throw an error for invalid gameId', async () => {
      await assert.rejects(gamePersistence.updateGame(null, gameState), {
        message: 'Invalid game ID. Must be a non-empty string with alphanumeric characters, hyphens, or underscores'
      });
      await assert.rejects(gamePersistence.updateGame('', gameState), {
        message: 'Invalid game ID. Must be a non-empty string with alphanumeric characters, hyphens, or underscores'
      });
      await assert.rejects(gamePersistence.updateGame('game/123', gameState), {
        message: 'Invalid game ID. Must be a non-empty string with alphanumeric characters, hyphens, or underscores'
      });
    });

    it('should throw an error for invalid gameState', async () => {
      await assert.rejects(gamePersistence.updateGame(gameId, null), {
        message: 'Invalid game state: must be an object'
      });
      await assert.rejects(gamePersistence.updateGame(gameId, 'not an object'), {
        message: 'Invalid game state: must be an object'
      });
    });

    it('should propagate fs.writeFileSync errors', async () => {
      mockFs.writeFileSync.mock.mockImplementation(() => { throw new Error('Disk full'); });
      await assert.rejects(gamePersistence.updateGame(gameId, gameState), {
        message: `Failed to save game ${gameId}: Disk full`
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });

  describe('getGame()', () => {
    const gameId = 'game456';
    const gameState = { id: gameId, phase: 'PLAYING', players: { 'player1': { name: 'test' } } };
    const filePath = path.join(__dirname, 'saved_games', `${gameId}.json`);

    it('should load game state from a file', async () => {
      mockFs.files.set(filePath, JSON.stringify(gameState));
      mockFs.existsSync.mock.mockImplementation(() => true);

      const loadedState = await gamePersistence.getGame(gameId);
      assert.deepStrictEqual(loadedState, gameState);
      assert.strictEqual(mockFs.readFileSync.mock.callCount(), 1);
      assert.deepStrictEqual(mockFs.readFileSync.mock.calls[0].arguments[0], filePath);
    });

    it('should return null if game file does not exist', async () => {
      mockFs.existsSync.mock.mockImplementation(() => false);
      const loadedState = await gamePersistence.getGame(gameId);
      assert.strictEqual(loadedState, null);
      assert.strictEqual(mockFs.readFileSync.mock.callCount(), 0); // Should not try to read
    });

    it('should throw an error for corrupted JSON file', async () => {
      mockFs.files.set(filePath, '{"id": "game", "corrupted": ');
      mockFs.existsSync.mock.mockImplementation(() => true);
      await assert.rejects(gamePersistence.getGame(gameId), (error) => {
        return error.message.includes(`Failed to load game ${gameId}`) && error.message.includes('Unexpected end of JSON input');
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });

    it('should throw an error for empty game file', async () => {
      mockFs.files.set(filePath, '');
      mockFs.existsSync.mock.mockImplementation(() => true);
      await assert.rejects(gamePersistence.getGame(gameId), {
        message: `Failed to load game ${gameId}: Empty game file`
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });

    it('should throw an error for invalid gameId', async () => {
      await assert.rejects(gamePersistence.getGame(null), {
        message: 'Invalid game ID: must be a non-empty string'
      });
      await assert.rejects(gamePersistence.getGame(''), {
        message: 'Invalid game ID: must be a non-empty string'
      });
    });

    it('should propagate fs.readFileSync errors', async () => {
      mockFs.existsSync.mock.mockImplementation(() => true);
      mockFs.readFileSync.mock.mockImplementation(() => { throw new Error('Permission denied'); });
      await assert.rejects(gamePersistence.getGame(gameId), {
        message: `Failed to load game ${gameId}: Permission denied`
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });

  describe('disconnect()', () => {
    it('should be a no-op and resolve immediately', async () => {
      await assert.doesNotReject(gamePersistence.disconnect());
    });
  });

  describe('getFilePath()', () => {
    const basePath = path.join(__dirname, 'saved_games');

    it('should return the correct file path for a valid gameId', () => {
      const filePath = gamePersistence.getFilePath('testGame1');
      assert.strictEqual(filePath, path.join(basePath, 'testGame1.json'));
    });

    it('should sanitize gameId to prevent directory traversal', () => {
      const filePath = gamePersistence.getFilePath('../testGame.json');
      assert.strictEqual(filePath, path.join(basePath, 'testGame.json'));
    });

    it('should throw error if gameId becomes empty after sanitization', () => {
      assert.throws(() => gamePersistence.getFilePath('../../../'), {
        message: 'Invalid game ID: contains no valid characters'
      });
    });
  });

  describe('getGamePersistence() singleton', () => {
    it('should return the same instance', async () => {
      // Clear the _gamePersistenceInstance cache to force re-initialization
      delete GamePersistence.__proto__._gamePersistenceInstance;
      // Mock node:fs import for the singleton
      const fsImportMock = mock.fn(async () => mockFs);
      mock.module('node:fs', { default: mockFs, __esModule: true });

      const instance1 = await getGamePersistence();
      const instance2 = await getGamePersistence();
      assert.strictEqual(instance1, instance2);
      assert.ok(instance1 instanceof GamePersistence);
    });

    it('should throw if fs import fails', async () => {
      mock.module('node:fs', { default: {}, __esModule: true, throws: true }); // Simulate import failure
      
      await assert.rejects(getGamePersistence(), {
        message: /Failed to initialize game persistence/
      });
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
    });
  });
});
