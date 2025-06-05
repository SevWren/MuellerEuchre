/**
 * @file reconnectionHandler.unit.test.js - Unit tests for the ReconnectionHandler module
 * @module test/reconnectionHandler.unit
 * @description Comprehensive test suite for the ReconnectionHandler class.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import ReconnectionHandler from '../../src/socket/reconnectionHandler.js';

// Create a sandbox for stubs
const sandbox = sinon.createSandbox();

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error
};

// Suppress console output during tests
before(() => {
  console.log = () => {};
  console.error = () => {};
});

// Restore console methods after tests
after(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  sandbox.restore();
});

describe('ReconnectionHandler', () => {
  let mockSocket;
  let reconnectionHandler;
  let clock;
  let mockEmit, mockOn, mockOff, mockConnect, mockDisconnect;

  beforeEach(() => {
    // Create fresh stubs
    mockEmit = sandbox.stub();
    mockOn = sandbox.stub();
    mockOff = sandbox.stub();
    mockConnect = sandbox.stub();
    mockDisconnect = sandbox.stub();

    // Setup mock socket
    mockSocket = {
      connected: true,
      disconnected: false,
      id: 'test-socket-id',
      gameId: 'test-game-id',
      playerId: 'test-player-id',
      sessionId: 'test-session-id',
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
      connect: mockConnect,
      disconnect: mockDisconnect,
      once: sandbox.stub(),
      removeAllListeners: sandbox.stub()
    };

    // Mock the emit method
    mockEmit.callsFake((event, ...args) => {
      if (event === 'rejoin_game' && typeof args[1] === 'function') {
        args[1]({ status: 'success' });
      }
      return mockSocket;
    });

    // Setup fake timers
    clock = sinon.useFakeTimers();

    // Create handler instance
    reconnectionHandler = new ReconnectionHandler(mockSocket, {
      maxReconnectAttempts: 3,
      reconnectInterval: 100,
      maxReconnectInterval: 1000,
      reconnectDecay: 1.5,
      timeout: 500,
      autoReconnect: true
    });
  });

  afterEach(() => {
    // Restore sandbox and clock
    clock.restore();
    sandbox.restore();
  });

  describe('initialization', () => {
    it('should set up event listeners on the socket', () => {
      // Verify event listeners were set up
      sinon.assert.calledWith(mockOn, 'disconnect');
      sinon.assert.calledWith(mockOn, 'connect');
      sinon.assert.calledWith(mockOn, 'error');
      sinon.assert.calledWith(mockOn, 'pong');
    });

    it('should start connection monitoring', () => {
      // Test the monitoring logic
      // (Add your specific test logic here)
    });
  });
    
    /**
     * @description Test suite for disconnection handling.
     * Verifies behavior when the WebSocket connection is lost.
     */
    describe('disconnection handling', () => {
        it('should attempt to reconnect when disconnected', () => {
            // Simulate disconnection
            const disconnectHandler = mockOn.getCalls().find(
                call => call.args[0] === 'disconnect'
            ).args[1];
            
            disconnectHandler('test disconnect reason');
            
            // Should schedule a reconnection attempt
            expect(setTimeout).to.have.been.called;
        });
        
        it('should not attempt to reconnect if already reconnecting', () => {
            // Set as already reconnecting
            reconnectionHandler.isReconnecting = true;
            
            // Simulate disconnection
            const disconnectHandler = mockOn.getCalls().find(
                call => call.args[0] === 'disconnect'
            ).args[1];
            
            disconnectHandler('test disconnect reason');
            
            // Should not schedule another reconnection attempt
            expect(setTimeout).not.to.have.been.called;
        });
    });
    
    /**
     * @description Test suite for reconnection logic.
     * Verifies the reconnection attempts, backoff strategy, and success/failure handling.
     */
    describe('reconnection logic', () => {
        it('should attempt to reconnect with exponential backoff', async () => {
            // Mock the connect method to fail on first attempt
            mockConnect.onFirstCall().callsFake(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        mockSocket.connected = false;
                        mockSocket.emit('connect_error', new Error('Connection failed'));
                        resolve();
                    }, 10);
                });
            });
            
            // Simulate disconnection
            const disconnectHandler = mockOn.getCalls().find(
                call => call.args[0] === 'disconnect'
            ).args[1];
            
            disconnectHandler('test disconnect reason');
            
            // Should schedule first reconnection attempt after initial delay (100ms)
            expect(setTimeout).to.have.been.calledWith(sinon.match.func, 100);
            
            // Fast-forward to trigger the first reconnection attempt
            clock.tick(100);
            
            // Should have called connect
            expect(mockConnect).to.have.been.calledOnce;
            
            // Simulate connection timeout
            clock.tick(500); // Timeout is 500ms
            
            // Should schedule next attempt with increased delay (100 * 1.5 = 150ms)
            expect(setTimeout).to.have.been.calledWith(sinon.match.func, 150);
        });
        
        it('should give up after max reconnection attempts', async () => {
            // Mock the connect method to always fail
            mockConnect.callsFake(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        mockSocket.connected = false;
                        mockSocket.emit('connect_error', new Error('Connection failed'));
                        resolve();
                    }, 10);
                });
            });
            
            // Set up a mock error handler
            const errorHandler = sinon.stub();
            reconnectionHandler.on('reconnect_failed', errorHandler);
            
            // Simulate disconnection
            const disconnectHandler = mockOn.getCalls().find(
                call => call.args[0] === 'disconnect'
            ).args[1];
            disconnectHandler('test disconnect reason');
            
            // Fast-forward through all reconnection attempts
            // 1st attempt: 100ms
            // 2nd attempt: 150ms (100 * 1.5)
            // 3rd attempt: 225ms (150 * 1.5) - but capped at maxReconnectInterval (1000ms)
            clock.tick(1000);
            
            // Should have given up after max attempts (3)
            expect(mockConnect).to.have.been.calledThrice;
            expect(errorHandler).to.have.been.called;
        });
    });
    
    describe('message queueing', () => {
        it('should queue messages when disconnected', () => {
            // Simulate being disconnected
            mockSocket.connected = false;
            
            // Try to send a message
            reconnectionHandler.emit('test_event', { data: 'test' });
            
            // Should queue the message instead of sending
            expect(mockEmit).not.to.have.been.called;
            expect(reconnectionHandler.pendingMessages.length).to.equal(1);
            expect(reconnectionHandler.pendingMessages[0].event).to.equal('test_event');
        });
        
        it('should resend queued messages on reconnection', async () => {
            // Queue some messages
            reconnectionHandler.queueMessage('test_event_1', [{ data: 'test1' }]);
            reconnectionHandler.queueMessage('test_event_2', [{ data: 'test2' }]);
            
            // Simulate reconnection
            const connectHandler = mockOn.getCalls().find(
                call => call.args[0] === 'connect'
            ).args[1];
            
            connectHandler();
            
            // Should resend queued messages
            expect(mockEmit).to.have.been.calledTwice;
            expect(mockEmit).to.have.been.calledWith('test_event_1', { data: 'test1' });
            expect(mockEmit).to.have.been.calledWith('test_event_2', { data: 'test2' });
            expect(reconnectionHandler.pendingMessages.length).to.equal(0);
        });
    });
    
    /**
     * @description Test suite for resource cleanup.
     * Verifies proper cleanup of timers and event listeners.
     */
    describe('cleanup', () => {
        it('should clean up resources when disposed', () => {
            // Call dispose
            reconnectionHandler.dispose();
            
            // Should clear any pending timeouts/intervals
            expect(clearTimeout).toHaveBeenCalled();
            expect(clearInterval).toHaveBeenCalled();
            
            // Should remove event listeners
            expect(mockOff).toHaveBeenCalledWith('disconnect', expect.any(Function));
            expect(mockOff).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockOff).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockOff).toHaveBeenCalledWith('pong', expect.any(Function));
        });
    });
});
