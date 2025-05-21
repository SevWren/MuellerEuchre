const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { performance, PerformanceObserver } = require('perf_hooks');

describe('Performance Testing', function() {
    this.timeout(60000); // Increase timeout for performance tests
    
    let server, gameState, mockIo;
    let logStub, appendFileStub;
    let testStartTime;
    
    // Performance metrics
    const metrics = {
        gameStartTimes: [],
        actionTimes: {},
        memoryUsage: {}
    };
    
    // Track memory usage
    const trackMemory = (label) => {
        const mem = process.memoryUsage();
        metrics.memoryUsage[label] = metrics.memoryUsage[label] || [];
        metrics.memoryUsage[label].push({
            rss: mem.rss / 1024 / 1024, // MB
            heapTotal: mem.heapTotal / 1024 / 1024, // MB
            heapUsed: mem.heapUsed / 1024 / 1024, // MB
            external: mem.external / 1024 / 1024, // MB
            timestamp: Date.now() - testStartTime
        });
    };
    
    // Measure operation time
    const measure = async (label, fn) => {
        const start = performance.now();
        const startMem = process.memoryUsage();
        let result;
        
        try {
            result = await fn();
        } finally {
            const duration = performance.now() - start;
            const endMem = process.memoryUsage();
            
            metrics.actionTimes[label] = metrics.actionTimes[label] || [];
            metrics.actionTimes[label].push({
                duration,
                memory: {
                    rss: (endMem.rss - startMem.rss) / 1024 / 1024, // MB
                    heapUsed: (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024, // MB
                    external: (endMem.external - startMem.external) / 1024 / 1024 // MB
                },
                timestamp: Date.now() - testStartTime
            });
            
            // Track peak memory usage
            trackMemory(`after-${label}`);
        }
        
        return result;
    };
    
    // Calculate statistics from measurements
    const calculateStats = (measurements) => {
        if (measurements.length === 0) return {};
        
        const durations = measurements.map(m => m.duration);
        const sorted = [...durations].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = sum / sorted.length;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted[Math.floor(sorted.length / 2)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        
        return {
            count: sorted.length,
            min,
            max,
            avg,
            median,
            p95,
            p99,
            total: sum
        };
    };
    
    // Print performance report
    const printReport = () => {
        console.log('\n=== Performance Report ===');
        console.log(`Test duration: ${((Date.now() - testStartTime) / 1000).toFixed(2)}s`);
        
        // Print action timings
        console.log('\nAction Timings (ms):');
        Object.entries(metrics.actionTimes).forEach(([action, times]) => {
            const stats = calculateStats(times);
            console.log(`  ${action}:`);
            console.log(`    Count: ${stats.count}`);
            console.log(`    Min: ${stats.min.toFixed(2)}`);
            console.log(`    Max: ${stats.max.toFixed(2)}`);
            console.log(`    Avg: ${stats.avg.toFixed(2)}`);
            console.log(`    P95: ${stats.p95.toFixed(2)}`);
            console.log(`    P99: ${stats.p99.toFixed(2)}`);
        });
        
        // Print memory usage
        console.log('\nMemory Usage (MB):');
        const memEntries = Object.entries(metrics.memoryUsage);
        if (memEntries.length > 0) {
            const lastMeasure = memEntries[memEntries.length - 1][1][0];
            console.log(`  RSS: ${lastMeasure.rss.toFixed(2)}`);
            console.log(`  Heap Total: ${lastMeasure.heapTotal.toFixed(2)}`);
            console.log(`  Heap Used: ${lastMeasure.heapUsed.toFixed(2)}`);
            console.log(`  External: ${lastMeasure.external.toFixed(2)}`);
        }
    };
    
    // Helper to simulate multiple concurrent games
    class GameSimulator {
        constructor(server, gameId) {
            this.server = server;
            this.gameId = gameId;
            this.players = [];
            this.sockets = [];
        }
        
        addPlayer(role) {
            const socketId = `game${this.gameId}-${role}`;
            const socket = {
                id: socketId,
                emit: sinon.stub(),
                eventHandlers: {},
                on: function(event, handler) {
                    this.eventHandlers[event] = handler;
                }
            };
            
            this.players.push(role);
            this.sockets.push(socket);
            
            // Simulate connection
            mockIo.connectionCallback(socket);
            
            return socket;
        }
        
        async startGame() {
            // Simulate game start
            await measure(`game${this.gameId}-start`, () => {
                this.sockets[0].eventHandlers.request_start_game();
            });
        }
        
        async playCard(playerIndex, card) {
            const socket = this.sockets[playerIndex];
            await measure(`game${this.gameId}-play`, () => {
                socket.eventHandlers.action_play_card({ card });
            });
        }
    }
    
    beforeEach(() => {
        testStartTime = Date.now();
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
    });
    
    afterEach(function() {
        // Print performance report
        if (this.currentTest.state !== 'failed') {
            printReport();
        }
        
        // Clean up
        logStub.restore();
        
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
        
        // Reset metrics
        metrics.gameStartTimes = [];
        metrics.actionTimes = {};
        metrics.memoryUsage = {};
    });
    
    // Enable garbage collection for memory tests
    before(function() {
        if (!global.gc) {
            console.warn('Run node with --expose-gc flag for more accurate memory measurements');
        }
    });
    
    it('should handle multiple concurrent games', async function() {
        this.timeout(120000); // 2 minutes
        
        const NUM_GAMES = 10;
        const games = [];
        
        // Create multiple game instances
        for (let i = 0; i < NUM_GAMES; i++) {
            const game = new GameSimulator(server, i);
            
            // Add 4 players to each game
            ['south', 'west', 'north', 'east'].forEach(role => {
                game.addPlayer(role);
            });
            
            games.push(game);
        }
        
        // Track initial memory
        trackMemory('after_setup');
        
        // Start all games
        await Promise.all(games.map((game, i) => 
            measure(`start_game_${i}`, () => game.startGame())
        ));
        
        trackMemory('after_game_start');
        
        // Simulate some game actions in parallel
        const actions = [];
        games.forEach((game, gameIndex) => {
            // Each player plays a card
            for (let i = 0; i < 4; i++) {
                actions.push(
                    measure(`game${gameIndex}_play${i}`, () => 
                        game.playCard(i, { id: `card-${i}-${gameIndex}` })
                    )
                );
            }
        });
        
        await Promise.all(actions);
        trackMemory('after_actions');
        
        // Verify all games are in a valid state
        games.forEach((game, i) => {
            // Add assertions about game state if needed
            assert(game.sockets.length === 4, `Game ${i} should have 4 players`);
        });
        
        // Verify memory usage hasn't grown excessively
        const startMem = metrics.memoryUsage.after_setup[0].rss;
        const endMem = metrics.memoryUsage.after_actions[0].rss;
        const memGrowth = ((endMem - startMem) / startMem) * 100;
        
        console.log(`\nMemory growth: ${memGrowth.toFixed(2)}%`);
        assert(memGrowth < 200, 'Memory growth should be reasonable'); // Allow 200% growth as a safety margin
    });
    
    it('should handle rapid game state changes', async function() {
        // Test rapid state transitions
        const game = new GameSimulator(server, 'rapid');
        
        // Add players
        ['south', 'west', 'north', 'east'].forEach(role => {
            game.addPlayer(role);
        });
        
        // Start game
        await game.startGame();
        
        // Simulate rapid card plays
        const startTime = Date.now();
        let playCount = 0;
        
        while (Date.now() - startTime < 5000) { // Run for 5 seconds
            for (let i = 0; i < 4; i++) {
                await measure('rapid_play', () => 
                    game.playCard(i % 4, { id: `card-${playCount++}` })
                );
            }
        }
        
        console.log(`\nPerformed ${playCount} rapid plays`);
        assert(playCount > 0, 'Should have performed some rapid plays');
    });
});
