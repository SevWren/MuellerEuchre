import assert from "assert";
import proxyquire from "proxyquire";
import sinon from "sinon";

describe('Call Trump Functionality', function() {
    let server;
    let logStub, appendFileStub, ioEmitStub;
    let handleCallTrumpDecision, gameState, startNewHand, broadcastGameState, addGameMessage;
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
                sockets: {}
            },
            to: sinon.stub().returns({ 
                emit: ioEmitStub,
                to: function() { return this; } // Allow chaining
            }),
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
        handleCallTrumpDecision = server.handleCallTrumpDecision;
        startNewHand = server.startNewHand;
        broadcastGameState = server.broadcastGameState;
        addGameMessage = server.addGameMessage;
        gameState = server.gameState;
        
        // Set up a test game state
        server.resetFullGame();
        
        // Set up players
        gameState.playerSlots.forEach((role, index) => {
            gameState.players[role].id = `socket-${index}`;
            gameState.players[role].name = role.charAt(0).toUpperCase() + role.slice(1);
            mockIo.sockets.sockets[`socket-${index}`] = { 
                id: `socket-${index}`, 
                emit: sinon.stub() 
            };
        });
        gameState.connectedPlayerCount = 4;
        
        // Set up for round 2 of bidding
        gameState.orderUpRound = 2;
        gameState.gamePhase = 'ORDER_UP_ROUND2';
        gameState.kitty = [{ suit: 'hearts', value: '9', id: '9-hearts' }]; // Up-card that was turned down
        gameState.currentPlayer = 'west'; // First player after dealer
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('handleCallTrumpDecision', function() {
        it('should allow player to call a valid trump suit', function() {
            const playerRole = gameState.currentPlayer; // 'west'
            const suitToCall = 'spades'; // Any suit except hearts (which was turned down)
            
            // Player calls trump
            handleCallTrumpDecision(playerRole, suitToCall);
            
            // Verify game state
            assert.strictEqual(gameState.trump, suitToCall);
            assert.strictEqual(gameState.maker, gameState.players[playerRole].team);
            assert.strictEqual(gameState.playerWhoCalledTrump, playerRole);
            assert.strictEqual(gameState.gamePhase, 'AWAITING_GO_ALONE');
            assert.strictEqual(gameState.currentPlayer, playerRole);
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/Trump is/)));
            assert(logStub.calledWith(sinon.match(/Team \d+ \(\w+\)/)));
        });

        it('should prevent calling the turned-down suit', function() {
            const playerRole = gameState.currentPlayer; // 'west'
            const originalState = JSON.parse(JSON.stringify(gameState));
            
            // Try to call the turned-down suit (hearts)
            handleCallTrumpDecision(playerRole, 'hearts');
            
            // Verify no changes were made
            assert.strictEqual(gameState.trump, originalState.trump);
            assert.strictEqual(gameState.maker, originalState.maker);
            assert.strictEqual(gameState.gamePhase, originalState.gamePhase);
            
            // Verify error was sent to player
            assert(ioEmitStub.calledWith('action_error', sinon.match(/Cannot call the suit of the turned-down card/)));
        });

        it('should handle player passing in round 2', function() {
            const playerRole = gameState.currentPlayer; // 'west'
            
            // Player passes
            handleCallTrumpDecision(playerRole, null);
            
            // Verify game state
            assert.strictEqual(gameState.trump, null);
            assert.strictEqual(gameState.currentPlayer, 'north'); // Next player
            assert.strictEqual(gameState.gamePhase, 'ORDER_UP_ROUND2');
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/passed/)));
        });

        it('should redeal if all pass in round 2', function() {
            // Mock startNewHand to verify it's called
            const startNewHandSpy = sinon.spy(server, 'startNewHand');
            
            // All players pass in round 2
            handleCallTrumpDecision('west', null);
            handleCallTrumpDecision('north', null);
            handleCallTrumpDecision('east', null);
            handleCallTrumpDecision('south', null);
            
            // Verify game state
            assert(startNewHandSpy.calledOnce);
            assert(logStub.calledWith(sinon.match(/Redealing/)));
            
            startNewHandSpy.restore();
        });

        it('should prevent calling trump when not in round 2', function() {
            // Change to a different phase
            gameState.gamePhase = 'PLAYING_TRICKS';
            
            // Try to call trump
            handleCallTrumpDecision('west', 'spades');
            
            // Verify no changes were made
            assert.strictEqual(gameState.trump, null);
            assert(logStub.calledWith(sinon.match(/Invalid call trump attempt/)));
        });

        it('should prevent calling trump when not the current player\'s turn', function() {
            // Current player is 'west'
            
            // Try to call trump as a different player
            handleCallTrumpDecision('east', 'spades');
            
            // Verify no changes were made
            assert.strictEqual(gameState.trump, null);
            assert(logStub.calledWith(sinon.match(/Invalid call trump attempt/)));
        });
    });
});
