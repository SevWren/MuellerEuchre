import { expect } from 'chai';
import sinon from 'sinon';
import ReconnectionHandler from '../src/socket/reconnectionHandler.js';

// Create a sandbox for stubs
const sandbox = sinon.createSandbox();

// Store the original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Suppress console output during tests
before(() => {
    console.log = () => {};
    console.error = () => {};
});

// Restore console methods after tests
after(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

describe('ReconnectionHandler', () => {
    let mockSocket;
    let reconnectionHandler;
    let mockEmit;
    let mockOn;
    let mockOff;
    let mockConnect;
    let mockDisconnect;
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
    
    afterEach(() => {
        // Restore the clock and all stubs after each test
        clock.restore();
        sandbox.restore();
    });
    
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
