const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Socket.IO Event Handlers', function() {
    let server, io;
    let logStub, appendFileStub, ioEmitStub;
    let gameState, resetFullGame, startNewHand, mockSocket, mockIo;

    beforeEach(() => {
        logStub = sinon.stub(console, 'log');
        appendFileStub = sinon.stub();
        ioEmitStub = sinon.stub();
        
        // Mock socket.io
        mockSocket = {
            id: 'test-socket-id',
            emit: sinon.stub(),
            on: sinon.stub()
        };
        
        mockIo = {
            sockets: {
                sockets: {}
            },
            to: sinon.stub().returns({ 
                emit: ioEmitStub,
                to: function() { return this; } // Allow chaining
            }),
            emit: sinon.stub(),
            on: function(event, callback) {
                if (event === 'connection') {
                    // Store the connection callback for later use
                    this.connectionCallback = callback;
                }
            }
        };
        
        // Mock fs
        const fsMock = { 
            appendFileSync: appendFileStub,
            readFileSync: sinon.stub().returns(''),
            existsSync: sinon.stub().returns(false),
            writeFileSync: sinon.stub()
        };

        // Load the server module with mocks
        server = proxyquire('../server3', {
            fs: fsMock,
            'socket.io': function() { return mockIo; }
        });

        // Extract the functions we want to test
        gameState = server.gameState;
        resetFullGame = server.resetFullGame;
        startNewHand = server.startNewHand;
        
        // Set up test players
        gameState.playerSlots.forEach((role, index) => {
            gameState.players[role].id = `socket-${index}`;
            gameState.players[role].name = role.charAt(0).toUpperCase() + role.slice(1);
            mockIo.sockets.sockets[`socket-${index}`] = { 
                id: `socket-${index}`, 
                emit: sinon.stub() 
            };
        });
        
        // Set up initial game state
        resetFullGame();
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('connection', function() {
        it('should assign a role to a connecting player in LOBBY phase', function() {
            // Simulate connection
            const socket = { 
                id: 'new-socket-id',
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Verify the player was assigned a role
            let assigned = false;
            gameState.playerSlots.forEach(role => {
                if (gameState.players[role].id === 'new-socket-id') {
                    assigned = true;
                }
            });
            
            assert(assigned, 'Player was not assigned a role');
            assert(socket.emit.calledWith('assign_role'));
            assert.strictEqual(gameState.connectedPlayerCount, 1);
        });

        it('should handle full game by not assigning a role', function() {
            // Fill all player slots
            gameState.playerSlots.forEach((role, index) => {
                gameState.players[role].id = `socket-${index}`;
                gameState.connectedPlayerCount = 4;
            });
            
            // Simulate connection
            const socket = { 
                id: 'new-socket-id',
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Verify the player was not assigned a role
            let assigned = false;
            gameState.playerSlots.forEach(role => {
                if (gameState.players[role].id === 'new-socket-id') {
                    assigned = true;
                }
            });
            
            assert(!assigned, 'Player was incorrectly assigned a role');
            assert(socket.emit.calledWith('game_full'));
        });
    });

    describe('request_start_game', function() {
        it('should start a new game when 4 players are connected', function() {
            // Set up 4 connected players
            gameState.connectedPlayerCount = 4;
            
            // Mock the socket
            const socket = { 
                id: 'socket-0',
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Set up the request_start_game handler
            let startGameHandler;
            socket.on.callsFake((event, handler) => {
                if (event === 'request_start_game') {
                    startGameHandler = handler;
                }
            });
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Mock startNewHand
            const startNewHandSpy = sinon.spy(server, 'startNewHand');
            
            // Trigger the start game request
            startGameHandler();
            
            // Verify the game started
            assert(startNewHandSpy.calledOnce);
            assert(logStub.calledWith(sinon.match(/Game start requested/)));
            
            startNewHandSpy.restore();
        });

        it('should not start a game with fewer than 4 players', function() {
            // Set up only 3 connected players
            gameState.connectedPlayerCount = 3;
            
            // Mock the socket
            const socket = { 
                id: 'socket-0',
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Set up the request_start_game handler
            let startGameHandler;
            socket.on.callsFake((event, handler) => {
                if (event === 'request_start_game') {
                    startGameHandler = handler;
                }
            });
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Mock startNewHand
            const startNewHandSpy = sinon.spy(server, 'startNewHand');
            
            // Trigger the start game request
            startGameHandler();
            
            // Verify the game did not start
            assert(!startNewHandSpy.called);
            assert(socket.emit.calledWith('action_error', 'Need 4 players to start.'));
            
            startNewHandSpy.restore();
        });
    });

    describe('disconnect', function() {
        it('should handle player disconnection in LOBBY phase', function() {
            // Set up a connected player
            const playerRole = 'south';
            const socketId = 'test-socket-id';
            gameState.players[playerRole].id = socketId;
            gameState.connectedPlayerCount = 1;
            
            // Mock the socket
            const socket = { 
                id: socketId,
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Set up the disconnect handler
            let disconnectHandler;
            socket.on.callsFake((event, handler) => {
                if (event === 'disconnect') {
                    disconnectHandler = handler;
                }
            });
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Trigger the disconnect handler
            disconnectHandler();
            
            // Verify the player was removed
            assert.strictEqual(gameState.players[playerRole].id, null);
            assert.strictEqual(gameState.connectedPlayerCount, 0);
            assert(logStub.calledWith(sinon.match(/User disconnected/)));
        });

        it('should handle player disconnection during active game', function() {
            // Set up an active game
            const playerRole = 'south';
            const socketId = 'test-socket-id';
            gameState.players[playerRole].id = socketId;
            gameState.connectedPlayerCount = 4;
            gameState.gamePhase = 'PLAYING_TRICKS';
            
            // Mock the socket
            const socket = { 
                id: socketId,
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Set up the disconnect handler
            let disconnectHandler;
            socket.on.callsFake((event, handler) => {
                if (event === 'disconnect') {
                    disconnectHandler = handler;
                }
            });
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Trigger the disconnect handler
            disconnectHandler();
            
            // Verify the game state was reset
            assert.strictEqual(gameState.gamePhase, 'LOBBY');
            assert.strictEqual(gameState.connectedPlayerCount, 0);
            assert(logStub.calledWith(sinon.match(/Game reset due to disconnection/)));
        });
    });
});
