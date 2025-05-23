const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Go Alone Functionality', function() {
    let server;
    let logStub, appendFileStub, ioEmitStub;
    let handleGoAloneDecision, gameState, startNewHand, broadcastGameState, addGameMessage, getPartner;
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
        handleGoAloneDecision = server.handleGoAloneDecision;
        getPartner = server.getPartner;
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
        
        // Set up for go alone decision
        gameState.gamePhase = 'AWAITING_GO_ALONE';
        gameState.trump = 'spades';
        gameState.maker = 1; // Team 1 (south/north)
        gameState.playerWhoCalledTrump = 'south';
        gameState.currentPlayer = 'south';
        
        // Deal some cards
        gameState.players.south.hand = [
            { suit: 'spades', value: 'J', id: 'J-spades' },
            { suit: 'spades', value: 'A', id: 'A-spades' },
            { suit: 'hearts', value: 'J', id: 'J-hearts' },
            { suit: 'diamonds', value: 'A', id: 'A-diamonds' },
            { suit: 'clubs', value: '10', id: '10-clubs' }
        ];
        
        // Other players have cards too (not relevant for this test)
        ['west', 'north', 'east'].forEach(role => {
            gameState.players[role].hand = Array(5).fill({ suit: 'hearts', value: '9', id: `9-hearts-${role}` });
        });
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('handleGoAloneDecision', function() {
        it('should handle player choosing to go alone', function() {
            const playerRole = 'south';
            const partnerRole = getPartner(playerRole); // 'north'
            
            // Player chooses to go alone
            handleGoAloneDecision(playerRole, true);
            
            // Verify game state
            assert.strictEqual(gameState.goingAlone, true);
            assert.strictEqual(gameState.playerGoingAlone, playerRole);
            assert.strictEqual(gameState.partnerSittingOut, partnerRole);
            assert.strictEqual(gameState.gamePhase, 'PLAYING_TRICKS');
            
            // Verify the trick leader is set correctly (next player after dealer, skipping partner if needed)
            assert(['west', 'east'].includes(gameState.trickLeader));
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/GOING ALONE/)));
            assert(logStub.calledWith(sinon.match(/sits out/)));
        });

        it('should handle player choosing not to go alone', function() {
            const playerRole = 'south';
            
            // Player chooses not to go alone
            handleGoAloneDecision(playerRole, false);
            
            // Verify game state
            assert.strictEqual(gameState.goingAlone, false);
            assert.strictEqual(gameState.playerGoingAlone, null);
            assert.strictEqual(gameState.partnerSittingOut, null);
            assert.strictEqual(gameState.gamePhase, 'PLAYING_TRICKS');
            
            // Verify the trick leader is set correctly (next player after dealer)
            assert.strictEqual(gameState.trickLeader, 'west');
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/play with their partner/)));
        });

        it('should prevent going alone when not in the correct phase', function() {
            // Change to a different phase
            gameState.gamePhase = 'PLAYING_TRICKS';
            
            // Try to go alone
            handleGoAloneDecision('south', true);
            
            // Verify no changes were made
            assert.strictEqual(gameState.goingAlone, false);
            assert(logStub.calledWith(sinon.match(/Invalid go alone decision/)));
        });

        it('should prevent going alone when not the player who called trump', function() {
            // Current player is 'south' (who called trump)
            
            // Try to go alone as a different player
            handleGoAloneDecision('west', true);
            
            // Verify no changes were made
            assert.strictEqual(gameState.goingAlone, false);
            assert(logStub.calledWith(sinon.match(/Invalid go alone decision/)));
        });

        it('should handle going alone with partner as trick leader', function() {
            // Set up so that the partner would be the trick leader
            gameState.dealer = 'east'; // Dealer is east
            // Next player after dealer is south (who called trump)
            // Then north (partner) would be next, but they sit out
            // So west should be trick leader
            
            // Player chooses to go alone
            handleGoAloneDecision('south', true);
            
            // Verify the trick leader is west (skipping north who is sitting out)
            assert.strictEqual(gameState.trickLeader, 'west');
            assert.strictEqual(gameState.currentPlayer, 'west');
        });
    });
});
