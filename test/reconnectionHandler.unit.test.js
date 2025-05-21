import { jest } from '@jest/globals';
import ReconnectionHandler from '../src/socket/reconnectionHandler.js';

// Mock the logger to prevent console output during tests
jest.mock('../src/utils/logger.js', () => ({
    log: jest.fn()
}));

describe('ReconnectionHandler', () => {
    let mockSocket;
    let reconnectionHandler;
    const mockEmit = jest.fn();
    const mockOn = jest.fn();
    const mockOff = jest.fn();
    const mockConnect = jest.fn();
    const mockDisconnect = jest.fn();
    
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
            once: jest.fn(),
            removeAllListeners: jest.fn()
        };
        
        // Mock the emitWithAck method
        mockEmit.mockImplementation((event, ...args) => {
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
        
        // Mock setTimeout and clearTimeout
        jest.useFakeTimers();
    });
    
    afterEach(() => {
        // Clean up any pending timers
        jest.clearAllTimers();
        jest.useRealTimers();
    });
    
    describe('initialization', () => {
        it('should set up event listeners on the socket', () => {
            expect(mockOn).toHaveBeenCalledWith('disconnect', expect.any(Function));
            expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockOn).toHaveBeenCalledWith('pong', expect.any(Function));
        });
        
        it('should start connection monitoring', () => {
            // Should set up an interval for sending pings
            expect(setInterval).toHaveBeenCalled();
        });
    });
    
    describe('disconnection handling', () => {
        it('should attempt to reconnect when disconnected', () => {
            // Simulate disconnection
            const disconnectHandler = mockOn.mock.calls.find(
                call => call[0] === 'disconnect'
            )[1];
            
            disconnectHandler('test disconnect reason');
            
            // Should schedule a reconnection attempt
            expect(setTimeout).toHaveBeenCalled();
        });
        
        it('should not attempt to reconnect if already reconnecting', () => {
            // Set as already reconnecting
            reconnectionHandler.isReconnecting = true;
            
            // Simulate disconnection
            const disconnectHandler = mockOn.mock.calls.find(
                call => call[0] === 'disconnect'
            )[1];
            
            disconnectHandler('test disconnect reason');
            
            // Should not schedule another reconnection attempt
            expect(setTimeout).not.toHaveBeenCalled();
        });
    });
    
    describe('reconnection logic', () => {
        it('should attempt to reconnect with exponential backoff', async () => {
            // Mock the connect method to fail on first attempt
            let connectResolve;
            mockConnect.mockImplementationOnce(() => {
                return new Promise((resolve) => {
                    connectResolve = resolve;
                });
            });
            
            // Simulate disconnection
            const disconnectHandler = mockOn.mock.calls.find(
                call => call[0] === 'disconnect'
            )[1];
            
            disconnectHandler('test disconnect reason');
            
            // Should schedule first reconnection attempt after initial delay (100ms)
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 100);
            
            // Fast-forward to trigger the first reconnection attempt
            jest.advanceTimersByTime(100);
            
            // Should have called connect
            expect(mockConnect).toHaveBeenCalledTimes(1);
            
            // Simulate connection timeout
            jest.advanceTimersByTime(500); // Timeout is 500ms
            
            // Should schedule next attempt with increased delay (100 * 1.5 = 150ms)
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 150);
        });
        
        it('should give up after max reconnection attempts', async () => {
            // Mock the connect method to always fail
            mockConnect.mockImplementation(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection failed')), 10);
                });
            });
            
            // Set up a mock error handler
            const errorHandler = jest.fn();
            reconnectionHandler.on('reconnect_failed', errorHandler);
            
            // Simulate disconnection
            const disconnectHandler = mockOn.mock.calls.find(
                call => call[0] === 'disconnect'
            )[1];
            disconnectHandler('test disconnect reason');
            
            // Fast-forward through all reconnection attempts
            // 1st attempt: 100ms
            // 2nd attempt: 150ms (100 * 1.5)
            // 3rd attempt: 225ms (150 * 1.5) - but capped at maxReconnectInterval (1000ms)
            jest.advanceTimersByTime(1000);
            
            // Should have given up after max attempts (3)
            expect(mockConnect).toHaveBeenCalledTimes(3);
            expect(errorHandler).toHaveBeenCalled();
        });
    });
    
    describe('message queueing', () => {
        it('should queue messages when disconnected', () => {
            // Simulate being disconnected
            mockSocket.connected = false;
            
            // Try to send a message
            reconnectionHandler.emit('test_event', { data: 'test' });
            
            // Should queue the message instead of sending
            expect(mockEmit).not.toHaveBeenCalled();
            expect(reconnectionHandler.pendingMessages.length).toBe(1);
            expect(reconnectionHandler.pendingMessages[0].event).toBe('test_event');
        });
        
        it('should resend queued messages on reconnection', async () => {
            // Queue some messages
            reconnectionHandler.queueMessage('test_event_1', [{ data: 'test1' }]);
            reconnectionHandler.queueMessage('test_event_2', [{ data: 'test2' }]);
            
            // Simulate reconnection
            const connectHandler = mockOn.mock.calls.find(
                call => call[0] === 'connect'
            )[1];
            
            connectHandler();
            
            // Should resend queued messages
            expect(mockEmit).toHaveBeenCalledTimes(2);
            expect(mockEmit).toHaveBeenCalledWith('test_event_1', { data: 'test1' });
            expect(mockEmit).toHaveBeenCalledWith('test_event_2', { data: 'test2' });
            expect(reconnectionHandler.pendingMessages.length).toBe(0);
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
