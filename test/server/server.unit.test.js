// test/server/server.unit.test.js
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import logger from '../../src/utils/logger.js';

// Mock external modules
import * as http from 'node:http';
import * as express from 'express';
import * as path from 'node:path';
import * as url from 'node:url'; // To mock fileURLToPath and dirname
import * as socketIoModule from '../../src/socket/index.js';
import * as gameRepositoryModule from '../../src/db/gameRepository.js';
import * as gameStateModule from '../../src/game/state.js';


// Mock process.exit
let mockProcessExit;
let originalProcessExit;
let originalProcessOn;
let mockProcessOn;
let mockHttpServerClose;

// --- Setup Mocks for Server.js ---
const setupServerMocks = () => {
  mockHttpServerClose = mock.fn((cb) => cb());
  const mockHttpServer = new EventEmitter();
  mockHttpServer.listen = mock.fn((port, cb) => cb());
  mockHttpServer.close = mockHttpServerClose;

  const mockExpressApp = {
    use: mock.fn(),
    get: mock.fn(),
    listen: mock.fn(),
  };
  const mockExpress = mock.fn(() => mockExpressApp);
  mockExpress.json = mock.fn(() => 'jsonMiddleware');
  mockExpress.static = mock.fn((dir) => `staticMiddleware(${dir})`);

  const mockInitializeSocket = mock.fn(() => ({})); // Returns a mocked io instance

  const mockGameRepository = {
    connect: mock.fn(async () => Promise.resolve()),
    findAllActiveGames: mock.fn(async () => Promise.resolve([])),
    disconnect: mock.fn(async () => Promise.resolve()),
  };
  
  const mockHydrateGames = mock.fn(() => {});

  const mockLogger = {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
  };

  // Replace methods on actual logger imported by server.js
  mock.method(logger, 'info', mockLogger.info);
  mock.method(logger, 'warn', mockLogger.warn);
  mock.method(logger, 'error', mockLogger.error);

  // Mock process.exit and process.on for graceful shutdown tests
  originalProcessExit = process.exit;
  originalProcessOn = process.on;
  mockProcessExit = mock.fn((code) => { throw new Error(`process.exit called with code: ${code}`); });
  mockProcessOn = mock.fn((event, handler) => {
    if (event === 'SIGINT' || event === 'SIGTERM') {
      // Store the handler to be called manually by the test
      if (!mockProcessOn.handlers) mockProcessOn.handlers = {};
      mockProcessOn.handlers[event] = handler;
    }
  });
  Object.defineProperty(process, 'exit', { value: mockProcessExit, configurable: true });
  Object.defineProperty(process, 'on', { value: mockProcessOn, configurable: true });

  return {
    mockHttpServer,
    mockExpressApp,
    mockExpress,
    mockInitializeSocket,
    mockGameRepository,
    mockHydrateGames,
    mockLogger,
    mockProcessExit,
    mockProcessOn,
    mockHttpServerClose,
  };
};

describe('server.js', () => {
  let mocks;
  let serverModule; // The module containing the server logic

  beforeEach(async () => {
    mocks = setupServerMocks();

    // Mock direct imports for server.js
    mock.method(http, 'createServer', () => mocks.mockHttpServer);
    mock.module('express', { default: mocks.mockExpress });
    // Mock path and url utilities if needed for __dirname equivalent
    mock.method(url, 'fileURLToPath', () => '/app/src/server.js');
    mock.method(path, 'dirname', () => '/app/src');
    mock.method(path, 'join', (...args) => args.join('/')); // Simplify path.join for mocks


    mock.method(socketIoModule, 'initializeSocket', mocks.mockInitializeSocket);
    mock.method(gameRepositoryModule, 'gameRepository', mocks.mockGameRepository);
    mock.method(gameStateModule, 'hydrateGames', mocks.mockHydrateGames);

    // Dynamically import server.js AFTER all mocks are set up
    // This requires a cache-busting mechanism to ensure fresh imports
    const cacheBuster = `?t=${Date.now()}`;
    serverModule = await import(`../../src/server.js${cacheBuster}`);
  });

  afterEach(() => {
    mock.restoreAll();
    // Restore original process methods
    Object.defineProperty(process, 'exit', { value: originalProcessExit, configurable: true });
    Object.defineProperty(process, 'on', { value: originalProcessOn, configurable: true });
  });

  it('should initialize Express and HTTP server', () => {
    assert.strictEqual(mocks.mockExpress.mock.callCount(), 1); // Express app created
    assert.strictEqual(http.createServer.mock.callCount(), 1); // HTTP server created
    assert.strictEqual(mocks.mockExpressApp.use.mock.callCount(), 2); // json and static middleware
    assert.strictEqual(mocks.mockExpressApp.get.mock.callCount(), 1); // /api/status route
    assert.strictEqual(mocks.mockInitializeSocket.mock.callCount(), 1); // Socket.IO initialized
    assert.deepStrictEqual(mocks.mockInitializeSocket.mock.calls[0].arguments[0], mocks.mockHttpServer);
  });

  it('should set up static file serving from the public directory', () => {
    assert.strictEqual(mocks.mockExpress.static.mock.callCount(), 1);
    assert.deepStrictEqual(mocks.mockExpress.static.mock.calls[0].arguments[0], '/app/public');
    assert.strictEqual(mocks.mockExpressApp.use.mock.calls[1].arguments[0], 'staticMiddleware(/app/public)');
    assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Serving static files from: /app/public')), true);
  });

  it('should respond to /api/status endpoint', () => {
    const statusHandler = mocks.mockExpressApp.get.mock.calls[0].arguments[1];
    const mockReq = {};
    const mockRes = {
      json: mock.fn(),
    };
    statusHandler(mockReq, mockRes);
    assert.strictEqual(mockRes.json.mock.callCount(), 1);
    assert.ok(mockRes.json.mock.calls[0].arguments[0].status, 'ok');
  });

  describe('startServer() function (implicitly called on import)', () => {
    it('should connect to gameRepository', async () => {
      // The startServer function runs implicitly on module import
      // and is an async IIFE, so we need to wait a tick for it to execute.
      await new Promise(resolve => process.nextTick(resolve));
      assert.strictEqual(mocks.mockGameRepository.connect.mock.callCount(), 1);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Server listening on port')), true);
      assert.strictEqual(mocks.mockHttpServer.listen.mock.callCount(), 1);
    });

    it('should find and hydrate active games if present', async () => {
      const activeGames = [{ id: 'game1' }];
      mocks.mockGameRepository.findAllActiveGames.mock.mockImplementationOnce(async () => activeGames);
      
      await new Promise(resolve => process.nextTick(resolve)); // Wait for server to start
      
      assert.strictEqual(mocks.mockGameRepository.findAllActiveGames.mock.callCount(), 1);
      assert.strictEqual(mocks.mockHydrateGames.mock.callCount(), 1);
      assert.deepStrictEqual(mocks.mockHydrateGames.mock.calls[0].arguments[0], activeGames);
    });

    it('should not hydrate games if none found', async () => {
      mocks.mockGameRepository.findAllActiveGames.mock.mockImplementationOnce(async () => []);
      
      await new Promise(resolve => process.nextTick(resolve)); // Wait for server to start
      
      assert.strictEqual(mocks.mockGameRepository.findAllActiveGames.mock.callCount(), 1);
      assert.strictEqual(mocks.mockHydrateGames.mock.callCount(), 0);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('No active games found')), true);
    });

    it('should log an error and exit if gameRepository.connect fails', async () => {
      mocks.mockGameRepository.connect.mock.mockImplementationOnce(async () => { throw new Error('DB connect failed'); });
      
      await assert.throws(async () => {
        // Re-import the module to re-run the IIFE with the new mock
        const cacheBuster = `?t=${Date.now()}`;
        await import(`../../src/server.js${cacheBuster}`);
      }, { message: 'process.exit called with code: 1' }); // process.exit is mocked to throw
      
      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(mocks.mockProcessExit.mock.callCount(), 1);
      assert.deepStrictEqual(mocks.mockProcessExit.mock.calls[0].arguments[0], 1);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should register SIGINT and SIGTERM handlers', async () => {
      await new Promise(resolve => process.nextTick(resolve)); // Ensure server starts and process.on is called
      assert.strictEqual(mocks.mockProcessOn.mock.callCount(), 2);
      assert.strictEqual(mocks.mockProcessOn.mock.calls[0].arguments[0], 'SIGINT');
      assert.strictEqual(mocks.mockProcessOn.mock.calls[1].arguments[0], 'SIGTERM');
    });

    it('should close http server and disconnect from DB on SIGINT', async () => {
      await new Promise(resolve => process.nextTick(resolve)); // Ensure handlers are registered
      
      const sigintHandler = mocks.mockProcessOn.handlers['SIGINT'];
      assert.ok(sigintHandler, 'SIGINT handler should be registered');

      await assert.throws(async () => sigintHandler(), { message: 'process.exit called with code: 0' }); // process.exit is mocked
      
      assert.strictEqual(mocks.mockHttpServerClose.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.disconnect.mock.callCount(), 1);
      assert.strictEqual(mocks.mockProcessExit.mock.callCount(), 1);
      assert.deepStrictEqual(mocks.mockProcessExit.mock.calls[0].arguments[0], 0);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Shutting down gracefully...')), true);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('HTTP server closed.')), true);
    });

    it('should log error and exit with code 1 if disconnect fails during shutdown', async () => {
      mocks.mockGameRepository.disconnect.mock.mockImplementationOnce(async () => { throw new Error('DB disconnect failed'); });
      
      await new Promise(resolve => process.nextTick(resolve)); // Ensure handlers are registered
      
      const sigtermHandler = mocks.mockProcessOn.handlers['SIGTERM'];
      assert.ok(sigtermHandler, 'SIGTERM handler should be registered');

      await assert.throws(async () => sigtermHandler(), { message: 'process.exit called with code: 1' }); // process.exit is mocked
      
      assert.strictEqual(mocks.mockHttpServerClose.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.disconnect.mock.callCount(), 1);
      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(mocks.mockProcessExit.mock.callCount(), 1);
      assert.deepStrictEqual(mocks.mockProcessExit.mock.calls[0].arguments[0], 1);
    });
  });
});
