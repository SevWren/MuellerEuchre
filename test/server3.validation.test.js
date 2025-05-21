import assert from "assert";
import proxyquire from "proxyquire";
import sinon from "sinon";
import {  Buffer  } from "buffer";

describe('Input Validation', function() {
    let server, gameState, mockIo, mockSockets = {};
    let logStub, appendFileStub;
    
    // Helper to create a mock socket
    const createMockSocket = (id) => {
        const socket = {
            id,
            emit: sinon.stub(),
            eventHandlers: {},
            on: function(event, handler) {
                this.eventHandlers[event] = handler;
                return this; // Allow chaining
            }
        };
        
        mockSockets[id] = socket;
        mockIo.sockets.sockets[id] = socket;
        return socket;
    };
    
    // Helper to simulate player action
    const simulateAction = (socketId, action, data) => {
        const socket = mockSockets[socketId];
        if (!socket) throw new Error(`Socket ${socketId} not found`);
        
        const handler = socket.eventHandlers[action];
        if (!handler) throw new Error(`No handler for ${action}`);
        
        return handler(data);
    };

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
            on: sinon.stub().callsFake(function(event, handler) {
                if (event === 'connection') {
                    this.connectionHandler = handler;
                }
            })
        };
        
        // Load the server with mocks
        server = proxyquire('../server3', {
            fs: fsMock,
            'socket.io': function() { return mockIo; }
        });
        
        gameState = server.gameState;
        mockSockets = {};
        
        // Set up basic game state
        ['south', 'west', 'north', 'east'].forEach((role, idx) => {
            const socketId = `socket-${idx}`;
            createMockSocket(socketId);
            gameState.players[role].id = socketId;
            gameState.players[role].name = role.charAt(0).toUpperCase() + role.slice(1);
        });
        
        gameState.connectedPlayerCount = 4;
    });
    
    afterEach(() => {
        logStub.restore();
        // Clean up any created files
        try {
            if (fs.existsSync) {
                if (fs.existsSync('malicious-file.txt')) {
                    fs.unlinkSync('malicious-file.txt');
                }
            }
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    });
    
    // Helper to generate a very long string
    const generateLongString = (length) => {
        return 'x'.repeat(length);
    };
    
    // Helper to generate a malicious payload
    const generateMaliciousPayload = () => ({
        __proto__: {
            isAdmin: true,
            toString: () => 'malicious',
            valueOf: () => 42
        },
        constructor: { name: 'Malicious' },
        then: (resolve) => resolve('hacked')
    });
    
    describe('Security Validation', function() {
        it('should prevent prototype pollution', function() {
            const maliciousPayload = generateMaliciousPayload();
            
            // Test with various functions that handle objects
            assert.throws(
                () => server.handlePlayCard('south', maliciousPayload),
                /Invalid card/
            );
            
            // Test with player data
            assert.throws(
                () => server.updatePlayerData(maliciousPayload, { name: 'test' }),
                /Invalid player/
            );
        });
        
        it('should prevent XSS in player names', function() {
            const xssPayload = '<script>alert(1)</script>';
            
            // Test player name assignment
            assert.throws(
                () => server.updatePlayerData('south', { name: xssPayload }),
                /Invalid name/
            );
            
            // Test chat messages
            assert.throws(
                () => server.handleChatMessage('south', { message: xssPayload }),
                /Invalid message/
            );
        });
        
        it('should prevent path traversal in file operations', function() {
            const maliciousPath = '../../etc/passwd';
            
            // Test with any function that handles file paths
            assert.throws(
                () => server.loadGameState(maliciousPath),
                /Invalid path/
            );
            
            // Test with relative paths
            assert.throws(
                () => server.saveGameState('..' + maliciousPath, {}),
                /Invalid path/
            );
        });
        
        it('should handle malformed JSON input', function() {
            const malformedJson = '{"invalid": "json"';
            
            // Mock readFileSync to return malformed JSON
            fsMock.readFileSync.returns(malformedJson);
            
            // Should handle the error gracefully
            assert.doesNotThrow(() => {
                server.loadGameState('test.json');
            });
            
            // Should log the error
            assert(logStub.calledWith(sinon.match(/Error parsing/)));
        });
    });
    
    describe('Player Input Validation', function() {
        it('should validate player role in actions', function() {
            // Try to perform action with invalid role
            assert.throws(
                () => server.handlePlayCard('invalid-role', { id: 'test-card' }),
                /Invalid player role/
            );
            
            // Try with null/undefined role
            assert.throws(
                () => server.handlePlayCard(null, { id: 'test-card' }),
                /Invalid player role/
            );
        });
        
        it('should validate card objects', function() {
            // Invalid card format
            assert.throws(
                () => server.handlePlayCard('south', { invalid: 'card' }),
                /Invalid card format/
            );
            
            // Missing card ID
            assert.throws(
                () => server.handlePlayCard('south', { suit: 'hearts', value: 'A' }),
                /Invalid card format/
            );
        });
        
        it('should validate game phase transitions', function() {
            // Set up a game in progress
            gameState.gamePhase = 'PLAYING_TRICKS';
            
            // Try to start a new game
            simulateAction('socket-0', 'request_start_game');
            
            // Should log an error and not change game state
            assert(logStub.calledWith(sinon.match(/Cannot start game/)));
            assert.strictEqual(gameState.gamePhase, 'PLAYING_TRICKS');
        });
    });
    
    describe('Input Sanitization', function() {
        it('should trim whitespace from input', function() {
            const testName = '  test  ';
            const testMessage = '  hello  ';
            
            // Test player name
            server.updatePlayerData('south', { name: testName });
            assert.strictEqual(gameState.players.south.name, testName.trim());
            
            // Test chat message
            server.handleChatMessage('south', { message: testMessage });
            const lastMessage = gameState.chatMessages[gameState.chatMessages.length - 1];
            assert.strictEqual(lastMessage.text, testMessage.trim());
        });
        
        it('should handle very large inputs', function() {
            const longName = generateLongString(1000);
            const longMessage = generateLongString(10000);
            
            // Test long player name (should be truncated or rejected)
            assert.throws(
                () => server.updatePlayerData('south', { name: longName }),
                /Name too long/
            );
            
            // Test long chat message (should be truncated or rejected)
            assert.throws(
                () => server.handleChatMessage('south', { message: longMessage }),
                /Message too long/
            );
        });
        
        it('should handle special characters in input', function() {
            const specialName = '玩家1 🚀';
            const specialMessage = 'Special chars: !@#$%^&*()_+{}|:"<>?~`';
            
            // Should handle Unicode in names
            server.updatePlayerData('south', { name: specialName });
            assert.strictEqual(gameState.players.south.name, specialName);
            
            // Should handle special chars in messages
            server.handleChatMessage('south', { message: specialMessage });
            const lastMessage = gameState.chatMessages[gameState.chatMessages.length - 1];
            assert.strictEqual(lastMessage.text, specialMessage);
        });
    });
    
    describe('Game State Validation', function() {
        it('should detect invalid game states', function() {
            // Force an invalid state
            gameState.gamePhase = 'INVALID_PHASE';
            
            // Try to perform an action
            assert.throws(
                () => server.handlePlayCard('south', { id: 'test-card' }),
                /Invalid game phase/
            );
        });
        
        it('should validate player turns', function() {
            // Set up a trick in progress
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.currentPlayer = 'south';
            
            // Try to play out of turn
            assert.throws(
                () => server.handlePlayCard('west', { id: 'test-card' }),
                /Not your turn/
            );
        });
    });
    
    describe('Card Play Validation', function() {
        beforeEach(() => {
            // Set up a valid game state for card playing
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.currentPlayer = 'south';
            gameState.trump = 'hearts';
            gameState.players.south.hand = [
                { id: 'JH', suit: 'hearts', value: 'J' },
                { id: '9H', suit: 'hearts', value: '9' },
                { id: 'AS', suit: 'spades', value: 'A' }
            ];
        });
        
        it('should validate card is in player\'s hand', function() {
            // Try to play a card not in hand
            assert.throws(
                () => server.handlePlayCard('south', { id: 'invalid-card' }),
                /Card not in hand/
            );
        });
        
        it('should enforce suit following rules', function() {
            // Set up a trick with a leading suit
            gameState.currentTrickSuit = 'spades';
            
            // Try to play a different suit when able to follow suit
            assert.throws(
                () => server.handlePlayCard('south', { id: '9H' }),
                /Must follow suit/
            );
            
            // Should allow playing a spade
            assert.doesNotThrow(
                () => server.handlePlayCard('south', { id: 'AS' })
            );
        });
        
        it('should allow playing any card when cannot follow suit', function() {
            // Set up a trick with a leading suit not in player's hand
            gameState.currentTrickSuit = 'diamonds';
            
            // Should allow playing any card
            assert.doesNotThrow(
                () => server.handlePlayCard('south', { id: 'JH' })
            );
        });
    });
    
    describe('Socket Event Validation', function() {
        it('should validate socket event data types', function() {
            const socket = createMockSocket('test-socket');
            
            // Simulate connection with invalid data
            assert.doesNotThrow(() => {
                mockIo.connectionHandler({
                    id: 'test-socket',
                    emit: sinon.stub(),
                    on: sinon.stub()
                });
            });
            
            // Verify error was logged for invalid data
            assert(logStub.called);
        });
        
        it('should handle malformed socket events', function() {
            const socket = createMockSocket('malformed-socket');
            
            // Simulate malformed event
            assert.doesNotThrow(() => {
                if (socket.eventHandlers.someEvent) {
                    socket.eventHandlers.someEvent('invalid data');
                }
            });
            
            // Verify error was logged
            assert(logStub.called);
        });
    });
    
    describe('Edge Case Validation', function() {
        it('should handle undefined or null input', function() {
            // Test various functions with null/undefined
            assert.throws(
                () => server.handlePlayCard(undefined, null),
                /Invalid player role/
            );
            
            assert.throws(
                () => server.handleOrderUpDecision(null, true),
                /Invalid player role/
            );
        });
        
        it('should handle empty or malformed game state', function() {
            // Force an empty game state
            Object.keys(gameState).forEach(key => {
                delete gameState[key];
            });
            
            // Should handle gracefully
            assert.doesNotThrow(() => {
                server.broadcastGameState();
            });
            
            assert(logStub.calledWith(sinon.match(/Error/)));
        });
    });
});
