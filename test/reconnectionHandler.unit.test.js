/**
 * @file reconnectionHandler.unit.test.js - Unit tests for the ReconnectionHandler module
 * @module test/reconnectionHandler.unit
 * @description Comprehensive test suite for the ReconnectionHandler class.
 * 
 * This test suite verifies the reconnection logic for WebSocket connections,
 * including automatic reconnection attempts, exponential backoff, and proper
 * cleanup of resources.
 * 
 * @requires chai
 * @requires sinon
 * @requires ../src/socket/reconnectionHandler
 * @see {@link module:socket/reconnectionHandler} for the implementation being tested
 */

import { expect } from 'chai';
import sinon from 'sinon';
import ReconnectionHandler from '../src/socket/reconnectionHandler.js';

/** @type {Object} sandbox - Sinon sandbox for test isolation */
const sandbox = sinon.createSandbox();

// Store the original console methods for restoration
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

/**
 * Before all tests, suppress console output to keep test output clean.
 */
before(() => {
    console.log = () => {};
    console.error = () => {};
});

/**
 * After all tests, restore the original console methods.
 */
after(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

/**
 * @description Test suite for the ReconnectionHandler class.
 * Covers all aspects of WebSocket reconnection logic.
 */
describe('ReconnectionHandler', () => {
    /** @type {Object} mockSocket - Mock WebSocket instance */
    let mockSocket;
    
    /** @type {ReconnectionHandler} reconnectionHandler - Instance under test */
    let reconnectionHandler;
    
    /** @type {sinon.SinonStub} mockEmit - Stub for socket.emit */
    let mockEmit;
    
    /** @type {sinon.SinonStub} mockOn - Stub for socket.on */
    let mockOn;
    
    /** @type {sinon.SinonStub} mockOff - Stub for socket.off */
    let mockOff;
    
    /** @type {sinon.SinonStub} mockConnect - Stub for socket.connect */
    let mockConnect;
    
    /** @type {sinon.SinonStub} mockDisconnect - Stub for socket.disconnect */
    let mockDisconnect;
    
    /** @type {Object} clock - Sinon fake timer for testing timeouts */
    let clock;
    
    beforeEach(() => {
        // Create fresh stubs before each test
        mockEmit = sinon.stub();
        mockOn = sinon.stub();
        mockOff = sinon.stub();
        mockConnect = sinon.stub();
        mockDisconnect = sinon.stub();
        
        // Set up the clock for testing timeouts
        clock = sinon.useFakeTimers();
        
                // Reset all stubs
        sandbox.reset();
    });
    
    /**
     * After each test, clean up timers and restore any stubs.
     */
    afterEach(() => {
        // Restore the clock and all stubs after each test
        clock.restore();
        sandbox.restore();
    });
    
    /**
     * After all tests, clean up the sandbox.
     */
    after(() => {
        // Clean up sandbox after all tests
        sandbox.restore();
    });
    
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Create a mock socket.io client
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
            once: sinon.stub(),
            removeAllListeners: sinon.stub()
        };
        
        // Mock the emitWithAck method
        mockEmit.callsFake((event, ...args) => {
            if (event === 'rejoin_game' && typeof args[1] === 'function') {
                args[1]({ status: 'success' });
            }
            return mockSocket;
        });
        
        // Create a new ReconnectionHandler instance for each test
        reconnectionHandler = new ReconnectionHandler(mockSocket, {
            maxReconnectAttempts: 3,
            reconnectInterval: 100,
            maxReconnectInterval: 1000,
            reconnectDecay: 1.5,
            timeout: 500,
            autoReconnect: true
        });
    });
    
    /**
     * @description Test suite for ReconnectionHandler initialization.
     * Verifies proper setup of event listeners and initial state.
     */
    describe('initialization', () => {
        it('should set up event listeners on the socket', () => {
            expect(mockOn).toHaveBeenCalledWith('disconnect', sinon.match.func);
            expect(mockOn).toHaveBeenCalledWith('connect', sinon.match.func);
            expect(mockOn).toHaveBeenCalledWith('error', sinon.match.func);
            expect(mockOn).toHaveBeenCalledWith('pong', sinon.match.func);
        });
        
        it('should start connection monitoring', () => {
            // Should set up an interval for sending pings
            expect(setInterval).to.have.been.called;
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
