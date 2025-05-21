const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Game State Management', function() {
    let server;
    let logStub, appendFileStub, ioEmitStub;
    let resetFullGame, addGameMessage, broadcastGameState, gameState, getRoleBySocketId;
    let mockIo, mockSocket;

    beforeEach(() => {
        logStub = sinon.stub(console, 'log');
        appendFileStub = sinon.stub();
        ioEmitStub = sinon.stub();
        
        // Mock socket.io
        mockSocket = {
            id: 'test-socket-id',
            emit: sinon.stub()
        };
        
        mockIo = {
            sockets: {
                sockets: {
                    'test-socket-id': mockSocket
                }
            },
            to: sinon.stub().returns({ emit: ioEmitStub }),
            emit: sinon.stub(),
            on: sinon.stub()
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
        resetFullGame = server.resetFullGame;
        addGameMessage = server.addGameMessage;
        broadcastGameState = server.broadcastGameState;
        getRoleBySocketId = server.getRoleBySocketId;
        gameState = server.gameState;
        
        // Reset game state before each test
        resetFullGame();
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('resetFullGame', function() {
        it('should initialize game state with default values', function() {
            // Verify initial state
            assert.strictEqual(gameState.gamePhase, 'LOBBY');
            assert.strictEqual(gameState.playerSlots.length, 4);
            assert.deepStrictEqual(gameState.playerSlots, ['south', 'west', 'north', 'east']);
            assert.strictEqual(gameState.connectedPlayerCount, 0);
            assert.strictEqual(gameState.trump, null);
            assert.strictEqual(gameState.dealer, 'south');
            assert.strictEqual(gameState.team1Score, 0);
            assert.strictEqual(gameState.team2Score, 0);
            assert.strictEqual(gameState.gameMessages.length, 0);
        });

        it('should initialize player objects with correct structure', function() {
            gameState.playerSlots.forEach(role => {
                const player = gameState.players[role];
                assert(player);
                assert.strictEqual(player.id, null);
                assert.strictEqual(player.name, role.charAt(0).toUpperCase() + role.slice(1));
                assert(Array.isArray(player.hand));
                assert.strictEqual(player.hand.length, 0);
                assert([1, 2].includes(player.team));
                assert.strictEqual(player.tricksTakenThisHand, 0);
            });
            
            // Verify teams
            assert.strictEqual(gameState.players.south.team, 1);
            assert.strictEqual(gameState.players.north.team, 1);
            assert.strictEqual(gameState.players.east.team, 2);
            assert.strictEqual(gameState.players.west.team, 2);
        });

        it('should reset all game state when called multiple times', function() {
            // Modify the game state
            gameState.team1Score = 5;
            gameState.team2Score = 7;
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.players.south.hand = ['card1', 'card2'];
            
            // Reset the game
            resetFullGame();
            
            // Verify reset
            assert.strictEqual(gameState.team1Score, 0);
            assert.strictEqual(gameState.team2Score, 0);
            assert.strictEqual(gameState.gamePhase, 'LOBBY');
            assert.strictEqual(gameState.players.south.hand.length, 0);
        });
    });

    describe('addGameMessage', function() {
        it('should add a message to the game messages array', function() {
            addGameMessage('Test message 1');
            addGameMessage('Test message 2', true);
            
            assert.strictEqual(gameState.gameMessages.length, 2);
            assert.strictEqual(gameState.gameMessages[0].text, 'Test message 2');
            assert.strictEqual(gameState.gameMessages[0].important, true);
            assert.strictEqual(gameState.gameMessages[1].text, 'Test message 1');
            assert.strictEqual(gameState.gameMessages[1].important, false);
            
            // Should have timestamps
            assert(gameState.gameMessages[0].timestamp);
            assert(gameState.gameMessages[1].timestamp);
        });

        it('should limit the number of stored messages', function() {
            // Add more than the limit (15)
            for (let i = 0; i < 20; i++) {
                addGameMessage(`Message ${i}`);
            }
            
            // Should only keep the most recent 15 messages
            assert.strictEqual(gameState.gameMessages.length, 15);
            assert.strictEqual(gameState.gameMessages[0].text, 'Message 19');
            assert.strictEqual(gameState.gameMessages[14].text, 'Message 5');
        });
    });

    describe('broadcastGameState', function() {
        it('should send game state to all connected players', function() {
            // Set up test players
            gameState.players.south.id = 'socket1';
            gameState.players.west.id = 'socket2';
            gameState.connectedPlayerCount = 2;
            
            // Mock io.sockets.sockets
            mockIo.sockets.sockets = {
                'socket1': { id: 'socket1', emit: sinon.stub() },
                'socket2': { id: 'socket2', emit: sinon.stub() }
            };
            
            // Call the function
            broadcastGameState();
            
            // Verify each player received their personalized state
            assert.strictEqual(mockIo.sockets.sockets.socket1.emit.calledWith('game_update'), true);
            assert.strictEqual(mockIo.sockets.sockets.socket2.emit.calledWith('game_update'), true);
            
            // Verify the state was personalized
            const southState = mockIo.sockets.sockets.socket1.emit.firstCall.args[1];
            assert.strictEqual(southState.myRole, 'south');
            assert.strictEqual(southState.myName, 'South');
            
            // Verify opponent's hand is hidden
            assert.strictEqual(southState.players.west.hand[0].S, 'back');
            assert.strictEqual(southState.players.north.hand[0].S, 'back');
            assert.strictEqual(southState.players.east.hand[0].S, 'back');
            
            // Verify deck is not sent to clients
            assert.strictEqual(southState.deck, undefined);
        });

        it('should send lobby update when in LOBBY phase', function() {
            gameState.gamePhase = 'LOBBY';
            gameState.players.south.id = 'socket1';
            gameState.connectedPlayerCount = 1;
            
            broadcastGameState();
            
            // Verify lobby_update was emitted
            assert.strictEqual(mockIo.emit.calledWith('lobby_update'), true);
            
            const lobbyData = mockIo.emit.firstCall.args[1];
            assert.strictEqual(lobbyData.players.length, 4);
            assert.strictEqual(lobbyData.players[0].role, 'south');
            assert.strictEqual(lobbyData.players[0].name, 'South');
            assert.strictEqual(lobbyData.players[0].connected, true);
            assert.strictEqual(lobbyData.connectedPlayerCount, 1);
        });
    });

    describe('getRoleBySocketId', function() {
        it('should return the role for a connected player', function() {
            gameState.players.south.id = 'test-socket-id';
            const role = getRoleBySocketId('test-socket-id');
            assert.strictEqual(role, 'south');
        });

        it('should return null for unknown socket ID', function() {
            const role = getRoleBySocketId('non-existent-id');
            assert.strictEqual(role, null);
        });
    });
});
