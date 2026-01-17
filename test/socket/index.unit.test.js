// test/socket/index.unit.test.js
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { initializeSocket } from '../../src/socket/index.js';
import { GAME_EVENTS } from '../../src/config/constants.js';
import logger from '../../src/utils/logger.js';

// Mock Socket.IO Server and Socket
class MockServerIo extends EventEmitter {
  constructor(httpServer, options) {
    super();
    this.httpServer = httpServer;
    this.options = options;
    this.to = mock.fn(() => ({ emit: mock.fn() }));
    this.emit = mock.fn();
  }
}

class MockSocket extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.emit = mock.fn();
    this.join = mock.fn();
    this.leave = mock.fn();
    this.currentGameId = null;
  }
}

// Mock handler registration functions
import * as playerConnectionHandlers from '../../src/socket/handlers/playerConnectionHandlers.js';
import * as lobbyHandlers from '../../src/socket/handlers/lobbyHandlers.js';
import * as biddingHandlers from '../../src/socket/handlers/biddingHandlers.js';
import * as goAloneHandlers from '../../src/socket/handlers/goAloneHandlers.js';
import * as playingHandlers from '../../src/socket/handlers/playingHandlers.js';
import * as gameOverHandlers from '../../src/socket/handlers/gameOverHandlers.js';


describe('initializeSocket', () => {
  let mockHttpServer;
  let mockIoServerConstructor;
  let mockIoServerInstance;
  let mockLoggerInfo;

  beforeEach(() => {
    mockHttpServer = {}; // Simple mock HTTP server

    // Reset and mock the Socket.IO Server constructor
    mockIoServerInstance = new MockServerIo(mockHttpServer, {});
    mockIoServerConstructor = mock.fn(() => mockIoServerInstance);
    // Replace the 'Server' class in 'socket.io' with our mock constructor
    mock.module('socket.io', { Server: mockIoServerConstructor });

    // Mock logger.info
    mockLoggerInfo = mock.method(logger, 'info', () => {});

    // Mock all handler registration functions
    mock.method(playerConnectionHandlers, 'registerPlayerConnectionHandlers', () => {});
    mock.method(playerConnectionHandlers, 'handlePlayerDisconnect', () => {}); // for disconnect handler
    mock.method(lobbyHandlers, 'registerLobbyHandlers', () => {});
    mock.method(biddingHandlers, 'registerBiddingHandlers', () => {});
    mock.method(goAloneHandlers, 'registerGoAloneHandlers', () => {});
    mock.method(playingHandlers, 'registerPlayingHandlers', () => {});
    mock.method(gameOverHandlers, 'registerGameOverHandlers', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should initialize Socket.IO server with correct options', () => {
    const io = initializeSocket(mockHttpServer);

    assert.strictEqual(mockIoServerConstructor.mock.callCount(), 1);
    const [httpServerArg, optionsArg] = mockIoServerConstructor.mock.calls[0].arguments;
    assert.strictEqual(httpServerArg, mockHttpServer);
    assert.deepStrictEqual(optionsArg, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    assert.strictEqual(io, mockIoServerInstance);
    assert.strictEqual(mockLoggerInfo.mock.callCount(), 1); // For the "Socket.IO server initialized" log
  });

  it('should register connection handler', () => {
    initializeSocket(mockHttpServer);
    // After initialization, the `io.on('connection')` should have been called
    // We can't directly assert on io.on since it's an instance method and mocked as EventEmitter,
    // but the functionality is tested by triggering a 'connection' event.
    
    // Simulate a connection and check if handlers are registered
    const mockSocket = new MockSocket('client1');
    mockIoServerInstance.emit('connection', mockSocket);

    assert.strictEqual(playerConnectionHandlers.registerPlayerConnectionHandlers.mock.callCount(), 1);
    assert.strictEqual(lobbyHandlers.registerLobbyHandlers.mock.callCount(), 1);
    assert.strictEqual(biddingHandlers.registerBiddingHandlers.mock.callCount(), 1);
    assert.strictEqual(goAloneHandlers.registerGoAloneHandlers.mock.callCount(), 1);
    assert.strictEqual(playingHandlers.registerPlayingHandlers.mock.callCount(), 1);
    assert.strictEqual(gameOverHandlers.registerGameOverHandlers.mock.callCount(), 1);

    // All handlers should be called with the new mockSocket and mockIoServerInstance
    [
        playerConnectionHandlers.registerPlayerConnectionHandlers,
        lobbyHandlers.registerLobbyHandlers,
        biddingHandlers.registerBiddingHandlers,
        goAloneHandlers.registerGoAloneHandlers,
        playingHandlers.registerPlayingHandlers,
        gameOverHandlers.registerGameOverHandlers
    ].forEach(mockFn => {
        assert.deepStrictEqual(mockFn.mock.calls[0].arguments[0], mockSocket);
        assert.deepStrictEqual(mockFn.mock.calls[0].arguments[1], mockIoServerInstance);
    });
    
    // Check welcome message emitted
    assert.strictEqual(mockSocket.emit.mock.callCount(), 1);
    assert.deepStrictEqual(mockSocket.emit.mock.calls[0].arguments[0], 'welcome');
    assert.deepStrictEqual(mockSocket.emit.mock.calls[0].arguments[1], {
        message: `Welcome to the Euchre server! Your ID is client1`,
        socketId: 'client1',
    });
  });

  describe('socket event handlers (after connection)', () => {
    let mockSocketInstance;
    let connectionHandler;

    beforeEach(() => {
      initializeSocket(mockHttpServer);
      // Get the connection handler
      connectionHandler = mockIoServerInstance.listeners('connection')[0];
      mockSocketInstance = new MockSocket('client1');
      connectionHandler(mockSocketInstance); // Simulate a new connection
    });

    it('should register disconnect handler', () => {
      // Check if `socket.on('disconnect')` was registered
      const disconnectListener = mockSocketInstance.listeners('disconnect')[0];
      assert.ok(disconnectListener);
      assert.strictEqual(mockSocketInstance.on.mock.calls.some(call => call.arguments[0] === 'disconnect'), true);
    });

    it('should call handlePlayerDisconnect on disconnect event', () => {
        const disconnectHandler = mockSocketInstance.listeners('disconnect')[0];
        disconnectHandler('client disconnect');
        assert.strictEqual(playerConnectionHandlers.handlePlayerDisconnect.mock.callCount(), 1);
        assert.deepStrictEqual(playerConnectionHandlers.handlePlayerDisconnect.mock.calls[0].arguments[0], mockSocketInstance);
        assert.deepStrictEqual(playerConnectionHandlers.handlePlayerDisconnect.mock.calls[0].arguments[1], mockIoServerInstance);
    });

    it('should register echo handler', () => {
      // Check if `socket.on('echo')` was registered
      const echoListener = mockSocketInstance.listeners('echo')[0];
      assert.ok(echoListener);
      assert.strictEqual(mockSocketInstance.on.mock.calls.some(call => call.arguments[0] === 'echo'), true);
    });

    it('echo handler should call callback if provided', () => {
        const echoHandler = mockSocketInstance.listeners('echo')[0];
        const mockCallback = mock.fn();
        const testData = { message: 'hello' };
        echoHandler(testData, mockCallback);

        assert.strictEqual(mockLoggerInfo.mock.callCount(), 2); // Initial log + echo log
        assert.strictEqual(mockCallback.mock.callCount(), 1);
        assert.deepStrictEqual(mockCallback.mock.calls[0].arguments[0], testData);
        assert.strictEqual(mockSocketInstance.emit.mock.callCount(), 1); // Welcome emit
    });

    it('echo handler should emit echoResponse if callback not provided', () => {
        const echoHandler = mockSocketInstance.listeners('echo')[0];
        const testData = { message: 'hello' };
        echoHandler(testData);

        assert.strictEqual(mockLoggerInfo.mock.callCount(), 2); // Initial log + echo log
        assert.strictEqual(mockSocketInstance.emit.mock.callCount(), 2); // Welcome emit + echoResponse emit
        assert.deepStrictEqual(mockSocketInstance.emit.mock.calls[1].arguments[0], 'echoResponse');
        assert.deepStrictEqual(mockSocketInstance.emit.mock.calls[1].arguments[1], testData);
    });
  });
});
