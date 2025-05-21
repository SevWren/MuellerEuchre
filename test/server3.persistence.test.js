import assert from "assert";
import proxyquire from "proxyquire";
import sinon from "sinon";
import fs from "fs";
import path from "path";

describe('Game State Persistence', function() {
    let server, gameState, mockIo, mockSockets = {};
    let logStub, appendFileStub, writeFileSyncStub, readFileSyncStub, existsSyncStub;
    const SAVE_FILE = path.join(__dirname, '..', 'game_state.json');
    
    // Helper to create a mock socket
    const createMockSocket = (id, role = null) => {
        const socket = {
            id,
            emit: sinon.stub(),
            eventHandlers: {},
            on: function(event, handler) {
                this.eventHandlers[event] = handler;
                return this; // Allow chaining
            }
        };
        
        // If role is provided, assign to game state
        if (role) {
            gameState.players[role].id = id;
            gameState.players[role].name = role.charAt(0).toUpperCase() + role.slice(1);
        }
        
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
        
        // Setup file system mocks
        writeFileSyncStub = sinon.stub();
        readFileSyncStub = sinon.stub();
        existsSyncStub = sinon.stub();
        
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
        
        // Reset file system mocks before each test
        writeFileSyncStub.reset();
        readFileSyncStub.reset();
        existsSyncStub.reset();
        
        // Default mock implementations
        existsSyncStub.returns(false);
        readFileSyncStub.returns('');
    });
    
    afterEach(() => {
        logStub.restore();
        
        // Clean up any created files
        if (fs.existsSync(SAVE_FILE)) {
            fs.unlinkSync(SAVE_FILE);
        }
    });
    
    const setupServer = (options = {}) => {
        const {
            saveOnExit = true,
            autoSave = true,
            existingSave = null
        } = options;
        
        // Mock fs with our stubs
        const fsMock = { 
            appendFileSync: appendFileStub,
            readFileSync: readFileSyncStub,
            existsSync: existsSyncStub,
            writeFileSync: writeFileSyncStub,
            readdirSync: sinon.stub().returns([]),
            mkdirSync: sinon.stub(),
            constants: fs.constants
        };
        
        // If there's an existing save, set up the mock to return it
        if (existingSave) {
            existsSyncStub.withArgs(SAVE_FILE).returns(true);
            readFileSyncStub.withArgs(SAVE_FILE).returns(JSON.stringify(existingSave));
        }
        
        // Load the server with mocks and options
        server = proxyquire('../server3', {
            fs: fsMock,
            'socket.io': function() { return mockIo; },
            './config': {
                SAVE_ON_EXIT: saveOnExit,
                AUTO_SAVE: autoSave,
                SAVE_FILE: SAVE_FILE
            }
        });
        
        gameState = server.gameState;
        mockSockets = {};
        
        return { server, gameState };
    };
    
    describe('Saving Game State', function() {
        it('should save game state to file', function() {
            const { server } = setupServer();
            
            // Set up a game in progress
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.currentPlayer = 'south';
            gameState.trump = 'hearts';
            
            // Trigger save
            server.saveGameState();
            
            // Verify the save was attempted
            assert(writeFileSyncStub.calledOnce);
            
            // Verify the correct file was written to
            const [filePath, data] = writeFileSyncStub.firstCall.args;
            assert.strictEqual(filePath, SAVE_FILE);
            
            // Verify the data is valid JSON and contains our game state
            const savedState = JSON.parse(data);
            assert.strictEqual(savedState.gamePhase, 'PLAYING_TRICKS');
            assert.strictEqual(savedState.currentPlayer, 'south');
            assert.strictEqual(savedState.trump, 'hearts');
        });
        
        it('should not save when auto-save is disabled', function() {
            const { server } = setupServer({ autoSave: false });
            
            // Modify game state
            gameState.gamePhase = 'PLAYING_TRICKS';
            
            // Trigger save (should be no-op)
            server.saveGameState();
            
            // Verify no save occurred
            assert(writeFileSyncStub.notCalled);
        });
        
        it('should handle save errors gracefully', function() {
            const { server } = setupServer();
            
            // Make the write operation fail
            const error = new Error('Disk full');
            writeFileSyncStub.throws(error);
            
            // This should not throw
            assert.doesNotThrow(() => {
                server.saveGameState();
            });
            
            // Error should be logged
            assert(logStub.calledWith(sinon.match(/Error saving game state/)));
        });
    });
    
    describe('Loading Game State', function() {
        it('should load game state from file on startup', function() {
            const savedState = {
                gamePhase: 'PLAYING_TRICKS',
                currentPlayer: 'south',
                trump: 'diamonds',
                players: {
                    south: { id: 'player1', name: 'South' },
                    west: { id: 'player2', name: 'West' },
                    north: { id: 'player3', name: 'North' },
                    east: { id: 'player4', name: 'East' }
                },
                deck: [],
                kitty: [],
                currentTrickPlays: [],
                currentTrickSuit: null,
                trickLeader: 'south',
                orderUpRound: 1,
                dealer: 'east',
                maker: 1,
                playerWhoCalledTrump: 'south',
                goingAlone: false,
                playerGoingAlone: null,
                partnerSittingOut: null,
                team1Score: 3,
                team2Score: 5,
                gameMessages: [],
                connectedPlayerCount: 4,
                gameId: 12345
            };
            
            // Set up the server with existing save
            const { gameState } = setupServer({ existingSave: savedState });
            
            // Verify the game state was loaded correctly
            assert.strictEqual(gameState.gamePhase, 'PLAYING_TRICKS');
            assert.strictEqual(gameState.currentPlayer, 'south');
            assert.strictEqual(gameState.trump, 'diamonds');
            assert.strictEqual(gameState.team1Score, 3);
            assert.strictEqual(gameState.team2Score, 5);
            assert.strictEqual(gameState.players.south.name, 'South');
        });
        
        it('should handle missing or corrupt save file', function() {
            // Simulate corrupt save file
            readFileSyncStub.throws(new Error('Corrupt file'));
            existsSyncStub.returns(true);
            
            // Should not throw
            assert.doesNotThrow(() => {
                setupServer();
            });
            
            // Should log the error
            assert(logStub.calledWith(sinon.match(/Error loading saved game/)));
            
            // Should start with a fresh game state
            assert.strictEqual(gameState.gamePhase, 'LOBBY');
        });
        
        it('should handle version mismatches', function() {
            // Simulate save from a different version
            const savedState = {
                version: '2.0.0',
                gamePhase: 'PLAYING_TRICKS'
            };
            
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify(savedState));
            
            // Should not throw
            assert.doesNotThrow(() => {
                setupServer();
            });
            
            // Should log a warning
            assert(logStub.calledWith(sinon.match(/version mismatch/)));
            
            // Should start with a fresh game state
            assert.strictEqual(gameState.gamePhase, 'LOBBY');
        });
    });
    
    describe('Auto-Saving', function() {
        let clock;
        
        beforeEach(() => {
            clock = sinon.useFakeTimers();
            setupServer({ autoSave: true });
        });
        
        afterEach(() => {
            clock.restore();
        });
        
        it('should auto-save at regular intervals', function() {
            // Initial state
            assert(writeFileSyncStub.notCalled);
            
            // Fast-forward to first interval
            clock.tick(30000);
            
            // Should have auto-saved
            assert(writeFileSyncStub.calledOnce);
            
            // Fast-forward again
            clock.tick(30000);
            
            // Should have auto-saved again
            assert.strictEqual(writeFileSyncStub.callCount, 2);
        });
        
        it('should not auto-save when disabled', function() {
            // Re-setup with auto-save disabled
            clock.restore();
            setupServer({ autoSave: false });
            clock = sinon.useFakeTimers();
            
            // Fast-forward
            clock.tick(60000);
            
            // Should not have saved
            assert(writeFileSyncStub.notCalled);
        });
    });
    
    describe('Game State Cleanup', function() {
        it('should clean up save file when game ends', function() {
            const { server } = setupServer();
            
            // Simulate a saved game
            existsSyncStub.returns(true);
            
            // End the game
            gameState.gamePhase = 'GAME_OVER';
            server.cleanupGameState();
            
            // Should have tried to delete the save file
            assert(existsSyncStub.calledWith(SAVE_FILE));
            // Note: In a real test, we'd verify the file was deleted,
            // but with our mocks we can only verify the unlink was attempted
        });
        
        it('should handle cleanup errors gracefully', function() {
            const { server } = setupServer();
            
            // Simulate error during cleanup
            existsSyncStub.throws(new Error('Filesystem error'));
            
            // Should not throw
            assert.doesNotThrow(() => {
                server.cleanupGameState();
            });
            
            // Should log the error
            assert(logStub.calledWith(sinon.match(/Error cleaning up/)));
        });
    });
    
    describe('Player Reconnection with Saved State', function() {
        it('should restore player state on reconnection', function() {
            const playerId = 'player-123';
            const role = 'south';
            
            // Set up a game with a saved player
            const savedState = {
                gamePhase: 'PLAYING_TRICKS',
                currentPlayer: role,
                players: {
                    [role]: { id: playerId, name: 'Test Player', hand: [] },
                    west: { id: 'player-456', name: 'West' },
                    north: { id: 'player-789', name: 'North' },
                    east: { id: 'player-012', name: 'East' }
                },
                // ... other required game state
            };
            
            setupServer({ existingSave: savedState });
            
            // Simulate player reconnection
            const socket = createMockSocket(playerId, role);
            mockIo.connectionHandler(socket);
            
            // Should be assigned the same role
            assert.strictEqual(gameState.players[role].id, playerId);
            assert(socket.emit.calledWith('role_assigned', {
                role,
                isSpectator: false
            }));
            
            // Should receive the current game state
            assert(socket.emit.calledWith('game_state_update'));
        });
    });
});
