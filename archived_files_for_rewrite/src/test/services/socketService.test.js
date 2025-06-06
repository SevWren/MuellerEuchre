import { expect } from 'chai';
import sinon from 'sinon';
import { io } from 'socket.io-client';
import { socketService } from '../../client/services/socketService.js';
import { GAME_EVENTS } from '../../config/constants.js';

describe('SocketService', function() {
    let mockSocket;
    let clock;
    let originalConsoleLog;

    before(() => {
        // Save original console.log
        originalConsoleLog = console.log;
        // Replace console.log with a stub
        console.log = () => {};
    });

    after(() => {
        // Restore original console.log
        console.log = originalConsoleLog;
    });

    beforeEach(function() {
        // Set up fake timers
        clock = sinon.useFakeTimers();
        
        // Create a mock socket.io-client
        mockSocket = {
            on: sinon.stub(),
            emit: sinon.stub(),
            connected: false,
            disconnect: sinon.stub(),
            close: sinon.stub()
        };
        
        // Stub the io import to return our mock socket
        sinon.stub(io, 'connect').returns(mockSocket);
        
        // Reset the singleton instance for each test
        socketService.disconnect();
        // @ts-ignore - Reset internal state for testing
        socketService.socket = null;
        // @ts-ignore
        socketService.isConnected = false;
        // @ts-ignore
        socketService.messageQueue = [];
        // @ts-ignore
        socketService.eventListeners = new Map();
    });

    afterEach(function() {
        // Restore the original io.connect
        io.connect.restore();
        // Restore timers
        clock.restore();
    });

    describe('connect()', function() {
        it('should connect to the WebSocket server', async function() {
            // Arrange
            const url = 'http://localhost:3000';
            
            // Act
            const connectPromise = socketService.connect(url);
            
            // Simulate successful connection
            const connectCallback = mockSocket.on.getCalls()
                .find(call => call.args[0] === 'connect').args[1];
            connectCallback();
            
            // Wait for the connection to be established
            await connectPromise;
            
            // Assert
            expect(io.connect.calledWith(url)).to.be.true;
            expect(socketService.isConnected).to.be.true;
        });

        it('should queue messages sent before connection', async function() {
            // Arrange
            const url = 'http://localhost:3000';
            const event = 'testEvent';
            const data = { test: 'data' };
            
            // Act - send message before connecting
            socketService.send(event, data);
            
            // Connect
            const connectPromise = socketService.connect(url);
            const connectCallback = mockSocket.on.getCalls()
                .find(call => call.args[0] === 'connect').args[1];
            connectCallback();
            await connectPromise;
            
            // Assert
            expect(mockSocket.emit.calledWith(event, data)).to.be.true;
        });
    });

    describe('disconnect()', function() {
        it('should disconnect from the WebSocket server', function() {
            // Arrange
            socketService.connect('http://localhost:3000');
            // @ts-ignore - Force connection state for test
            socketService.isConnected = true;
            
            // Act
            socketService.disconnect();
            
            // Assert
            expect(socketService.isConnected).to.be.false;
            expect(mockSocket.disconnect.called).to.be.true;
        });
    });

    describe('send()', function() {
        it('should send a message when connected', function() {
            // Arrange
            const event = 'testEvent';
            const data = { test: 'data' };
            // @ts-ignore - Force connection state for test
            socketService.isConnected = true;
            
            // Act
            socketService.send(event, data);
            
            // Assert
            expect(mockSocket.emit.calledWith(event, data)).to.be.true;
        });

        it('should queue messages when not connected', function() {
            // Arrange
            const event = 'testEvent';
            const data = { test: 'data' };
            // @ts-ignore - Force disconnected state for test
            socketService.isConnected = false;
            
            // Act
            socketService.send(event, data);
            
            // Assert
            expect(mockSocket.emit.called).to.be.false;
            // @ts-ignore - Access private property for test
            expect(socketService.messageQueue).to.have.length(1);
        });
    });

    describe('on()', function() {
        it('should register an event listener', function() {
            // Arrange
            const event = 'testEvent';
            const callback = sinon.stub();
            
            // Act
            socketService.on(event, callback);
            
            // Assert
            expect(mockSocket.on.calledWith(event)).to.be.true;
        });
    });

    describe('off()', function() {
        it('should remove an event listener', function() {
            // Arrange
            const event = 'testEvent';
            const callback = sinon.stub();
            
            // Act
            socketService.off(event, callback);
            
            // Assert
            expect(mockSocket.off.calledWith(event, callback)).to.be.true;
        });
    });

    describe('reconnection', function() {
        it('should handle reconnection', async function() {
            // Arrange
            const url = 'http://localhost:3000';
            const reconnectCallback = sinon.stub();
            socketService.onReconnect(reconnectCallback);
            
            // Connect first time
            await socketService.connect(url);
            
            // Simulate disconnection
            const disconnectCallback = mockSocket.on.getCalls()
                .find(call => call.args[0] === 'disconnect').args[1];
            disconnectCallback();
            
            // Simulate reconnection
            const reconnectEvent = mockSocket.on.getCalls()
                .find(call => call.args[0] === 'reconnect_attempt').args[1];
            reconnectEvent();
            
            // Assert
            expect(reconnectCallback.called).to.be.true;
        });
    });

    describe('connection quality', function() {
        it('should track connection quality', function() {
            // Arrange
            const url = 'http://localhost:3000';
            
            // Act - connect and simulate ping
            socketService.connect(url);
            
            // Simulate ping event
            const pingCallback = mockSocket.on.getCalls()
                .find(call => call.args[0] === 'ping').args[1];
            
            // First ping
            clock.tick(1000);
            pingCallback();
            
            // Second ping after 50ms
            clock.tick(50);
            pingCallback();
            
            // Get connection quality
            const quality = socketService.getConnectionQuality();
            
            // Assert
            expect(quality.latency).to.be.greaterThan(0);
            expect(quality.jitter).to.be.greaterThanOrEqual(0);
            expect(['good', 'excellent', 'fair', 'poor']).to.include(quality.quality);
        });
    });
});
