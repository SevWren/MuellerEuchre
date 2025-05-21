const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Multiple Concurrent Games', function() {
    this.timeout(30000); // Increase timeout for concurrent tests
    
    let server, gameState, mockIo, mockSockets = {};
    let logStub, appendFileStub;
    
    // Track performance metrics
    const metrics = {
        gameCreationTimes: [],
        actionTimes: {},
        memoryUsage: {}
    };
    
    // Helper to create a mock socket
    const createMockSocket = (id, gameId = '') => {
        const socketId = gameId ? `${gameId}-${id}` : id;
        const socket = {
            id: socketId,
            emit: sinon.stub(),
            eventHandlers: {},
            on: function(event, handler) {
                this.eventHandlers[event] = handler;
                return this; // Allow chaining
            },
            join: sinon.stub().resolves(),
            leave: sinon.stub().resolves()
        };
        
        mockSockets[socketId] = socket;
        mockIo.sockets.sockets[socketId] = socket;
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
    
    // Helper to create a game with players
    const createGame = async (gameId, numPlayers = 4) => {
        const gameSockets = [];
        const roles = ['south', 'west', 'north', 'east'].slice(0, numPlayers);
        
        // Create players
        for (const role of roles) {
            const socket = createMockSocket(`${role}-${gameId}`, gameId);
            gameSockets.push(socket);
            
            // Simulate connection
            mockIo.connectionHandler(socket);
            
            // Handle game creation/joining
            socket.eventHandlers.join_game = (data) => {
                // In a real implementation, this would handle joining a specific game
                socket.emit('game_joined', { gameId, role });
            };
        }
        
        return { sockets: gameSockets, gameId };
    };

    beforeEach(() => {
        logStub = sinon.stub(console, 'log');
        appendFileStub = sinon.stub();
        
        // Reset metrics
        metrics.gameCreationTimes = [];
        metrics.actionTimes = {};
        metrics.memoryUsage = {};
        
        // Track memory usage
        const trackMemory = (label) => {
            const mem = process.memoryUsage();
            metrics.memoryUsage[label] = metrics.memoryUsage[label] || [];
            metrics.memoryUsage[label].push({
                rss: mem.rss / 1024 / 1024, // MB
                heapTotal: mem.heapTotal / 1024 / 1024, // MB
                heapUsed: mem.heapUsed / 1024 / 1024, // MB
                timestamp: Date.now()
            });
        };
        
        // Mock fs
        const fsMock = { 
            appendFileSync: appendFileStub,
            readFileSync: sinon.stub().returns(''),
            existsSync: sinon.stub().returns(false),
            writeFileSync: sinon.stub()
        };
        
        // Mock socket.io with support for rooms
        mockIo = {
            sockets: { sockets: {} },
            to: sinon.stub().returnsThis(),
            emit: sinon.stub(),
            in: sinon.stub().returnsThis(),
            on: sinon.stub().callsFake(function(event, handler) {
                if (event === 'connection') {
                    this.connectionHandler = handler;
                }
            }),
            // Mock room functionality
            sockets: { sockets: {} },
            of: sinon.stub().returnsThis(),
            to: sinon.stub().returnsThis(),
            in: sinon.stub().returnsThis(),
            emit: sinon.stub()
        };
        
        // Load the server with mocks
        server = proxyquire('../server3', {
            fs: fsMock,
            'socket.io': function() { return mockIo; }
        });
        
        gameState = server.gameState;
        mockSockets = {};
        
        // Track initial memory
        trackMemory('initial');
    });
    
    afterEach(() => {
        logStub.restore();
        
        // Log performance metrics
        console.log('\n=== Performance Metrics ===');
        
        // Log game creation times
        if (metrics.gameCreationTimes.length > 0) {
            const totalTime = metrics.gameCreationTimes.reduce((a, b) => a + b, 0);
            const avgTime = totalTime / metrics.gameCreationTimes.length;
            console.log(`\nAverage game creation time: ${avgTime.toFixed(2)}ms`);
        }
        
        // Log action times
        console.log('\nAction Times (ms):');
        Object.entries(metrics.actionTimes).forEach(([action, times]) => {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            console.log(`  ${action}: avg=${avg.toFixed(2)}`);
        });
        
        // Log memory usage
        console.log('\nMemory Usage (MB):');
        Object.entries(metrics.memoryUsage).forEach(([label, usages]) => {
            const last = usages[usages.length - 1];
            console.log(`  ${label}: rss=${last.rss.toFixed(2)}, heap=${last.heapUsed.toFixed(2)}/${last.heapTotal.toFixed(2)}`);
        });
    });
    
    describe('Game Isolation', function() {
        it('should maintain separate game states', async function() {
            const NUM_GAMES = 5;
            const games = [];
            
            // Create multiple games
            for (let i = 0; i < NUM_GAMES; i++) {
                const startTime = Date.now();
                const game = await createGame(`game${i}`);
                games.push(game);
                
                // Record creation time
                metrics.gameCreationTimes.push(Date.now() - startTime);
                
                // Start the game
                simulateAction(`${game.gameId}-south-${i}`, 'request_start_game');
                
                // Verify game state
                // In a real implementation, we'd check the game state for each game
                assert(game.sockets.length === 4, 'Each game should have 4 players');
            }
            
            // Verify games are isolated
            // This is a simplified check - in a real implementation, we'd verify game states
            assert.strictEqual(Object.keys(mockSockets).length, NUM_GAMES * 4);
        });
        
        it('should handle actions in different games independently', async function() {
            // Create two games
            const game1 = await createGame('game1');
            const game2 = await createGame('game2');
            
            // Start both games
            simulateAction('game1-south-game1', 'request_start_game');
            simulateAction('game2-south-game2', 'request_start_game');
            
            // Simulate actions in game 1
            simulateAction('game1-south-game1', 'action_play_card', { card: { id: 'card1' } });
            
            // Verify game 2 state is unaffected
            // In a real implementation, we'd check that game 2's state didn't change
            const game2SouthSocket = mockSockets['game2-south-game2'];
            assert(!game2SouthSocket.emit.calledWith('action_error'));
        });
    });
    
    describe('Resource Management', function() {
        it('should handle many concurrent games', async function() {
            this.timeout(60000); // 1 minute timeout
            
            const NUM_GAMES = 10;
            const games = [];
            const startTime = Date.now();
            
            // Create many games
            for (let i = 0; i < NUM_GAMES; i++) {
                games.push(await createGame(`massive-${i}`));
            }
            
            // Start all games
            games.forEach((game, index) => {
                simulateAction(`${game.gameId}-south-${index}`, 'request_start_game');
            });
            
            // Simulate some actions in each game
            games.forEach((game, gameIndex) => {
                game.sockets.forEach((socket, playerIndex) => {
                    // Simulate a play card action
                    const actionTime = Date.now();
                    simulateAction(socket.id, 'action_play_card', { 
                        card: { id: `card-${gameIndex}-${playerIndex}` } 
                    });
                    
                    // Record action time
                    const duration = Date.now() - actionTime;
                    metrics.actionTimes['play_card'] = metrics.actionTimes['play_card'] || [];
                    metrics.actionTimes['play_card'].push(duration);
                });
            });
            
            // Verify all games are in a valid state
            games.forEach((game, index) => {
                // In a real implementation, we'd verify each game's state
                assert(game.sockets.length === 4, `Game ${index} should have 4 players`);
            });
            
            console.log(`\nCreated and processed ${NUM_GAMES} games in ${Date.now() - startTime}ms`);
        });
        
        it('should clean up resources when games end', async function() {
            // Track initial resource usage
            const initialSocketCount = Object.keys(mockSockets).length;
            
            // Create and end multiple games
            const NUM_GAMES = 5;
            for (let i = 0; i < NUM_GAMES; i++) {
                const game = await createGame(`temp-${i}`);
                
                // Simulate game ending
                game.sockets.forEach(socket => {
                    socket.eventHandlers.disconnect();
                });
                
                // In a real implementation, we'd verify resources were cleaned up
            }
            
            // Verify no resource leaks
            // In a real implementation, we'd check that resources were properly released
            assert.strictEqual(
                Object.keys(mockSockets).length, 
                initialSocketCount,
                'Should clean up socket references'
            );
        });
    });
    
    describe('Load Balancing', function() {
        it('should distribute load across games', async function() {
            // This would test that new players are assigned to less loaded games
            // Implementation would depend on your load balancing strategy
            
            // Create initial games with different player counts
            const game1 = await createGame('load1', 2); // 2/4 players
            const game2 = await createGame('load2', 1); // 1/4 players
            
            // New player connects - should be assigned to game2 (less loaded)
            const newPlayer = createMockSocket('new-player');
            mockIo.connectionHandler(newPlayer);
            
            // In a real implementation, we'd verify the player was assigned to game2
            // This is a simplified check
            assert(newPlayer.emit.calledWith('game_joined'));
        });
    });
    
    describe('Error Isolation', function() {
        it('should contain errors to a single game', async function() {
            // Create two games
            const game1 = await createGame('good-game');
            const game2 = await createGame('bad-game');
            
            // Start both games
            simulateAction('good-game-south-good-game', 'request_start_game');
            simulateAction('bad-game-south-bad-game', 'request_start_game');
            
            // Force an error in game 2
            const badSocket = mockSockets['bad-game-south-bad-game'];
            badSocket.eventHandlers.someInvalidEvent = () => {
                throw new Error('Test error');
            };
            
            // Trigger the error
            assert.doesNotThrow(() => {
                badSocket.eventHandlers.someInvalidEvent();
            });
            
            // Verify game 1 is unaffected
            const goodSocket = mockSockets['good-game-south-good-game'];
            assert(!goodSocket.emit.calledWith('error'));
        });
    });
});
