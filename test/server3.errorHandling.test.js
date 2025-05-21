const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Error Handling', function() {
    let server, gameState, mockIo, mockSockets = {};
    let logStub, appendFileStub;
    
    beforeEach(() => {
        logStub = sinon.stub(console, 'log');
        appendFileStub = sinon.stub();
        
        // Mock fs
        const fsMock = { 
            appendFileSync: appendFileStub,
            readFileSync: sinon.stub().returns(''),
            existsSync: sinon.stub().returns(false),
            writeFileSync: sinon.stub()
        };
        
        // Mock socket.io
        mockIo = {
            sockets: { sockets: {} },
            to: sinon.stub().returnsThis(),
            emit: sinon.stub(),
            in: sinon.stub().returnsThis(),
            on: sinon.stub()
        };
        
        // Load the server with mocks
        server = proxyquire('../server3', {
            fs: fsMock,
            'socket.io': function() { return mockIo; }
        });
        
        gameState = server.gameState;
        mockSockets = {};
    });
    
    afterEach(() => {
        logStub.restore();
    });
    
    describe('Invalid Game Actions', function() {
        it('should handle invalid card plays gracefully', function() {
            // Set up a game in progress
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.currentPlayer = 'south';
            gameState.players.south.hand = [{ id: 'valid-card', suit: 'hearts', value: 'A' }];
            
            // Try to play a card not in hand
            server.handlePlayCard('south', { id: 'invalid-card' });
            
            // Verify error was logged and no state change occurred
            assert(logStub.calledWith(sinon.match(/Invalid card play/)));
            assert.strictEqual(gameState.players.south.hand.length, 1);
        });
        
        it('should handle invalid game phase transitions', function() {
            // Try to play a card in the wrong phase
            gameState.gamePhase = 'LOBBY';
            server.handlePlayCard('south', { id: 'any-card' });
            
            assert(logStub.calledWith(sinon.match(/Invalid play attempt/)));
        });
    });
    
    describe('Error Recovery', function() {
        it('should recover from invalid game state', function() {
            // Force an invalid game state
            gameState.gamePhase = 'INVALID_PHASE';
            
            // Try to perform an action
            server.handleOrderUpDecision('south', true);
            
            // Verify error was logged and game didn't crash
            assert(logStub.calledWith(sinon.match(/Error/)));
        });
        
        it('should handle missing player data', function() {
            // Try to perform action with non-existent player
            server.handlePlayCard('nonexistent', { id: 'any-card' });
            
            assert(logStub.calledWith(sinon.match(/Invalid/)));
        });
    });
    
    describe('Input Validation', function() {
        it('should validate player input', function() {
            // Test with invalid input types
            server.handleOrderUpDecision(123, 'not-a-boolean');
            assert(logStub.calledWith(sinon.match(/Invalid/)));
            
            // Test with missing parameters
            server.handleCallTrumpDecision();
            assert(logStub.calledWith(sinon.match(/Invalid/)));
        });
    });
});
