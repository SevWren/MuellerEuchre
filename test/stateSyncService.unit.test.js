import { expect } from 'chai';
import sinon from 'sinon';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Create a require function for ES modules
const require = createRequire(import.meta.url);

// Mock the safeStorage module before importing StateSyncService
const mockSafeStorage = {
    getItem: sinon.stub(),
    setItem: sinon.stub(),
    removeItem: sinon.stub()
};

// Mock the module using proxyquire
const proxyquire = require('proxyquire').noCallThru();

// Mock the StateSyncService with our mocked safeStorage
const StateSyncServiceModule = proxyquire('../src/client/services/stateSyncService.js', {
    '../../utils/logger.js': {
        log: sinon.stub()
    },
    '../../config/constants.js': {
        GAME_EVENTS: {
            STATE_UPDATE: 'game:state:update',
            REQUEST_FULL_STATE: 'game:request_full_state'
        },
        STORAGE_KEYS: {
            GAME_STATE: 'game_state',
            OFFLINE_QUEUE: 'offline_queue'
        }
    },
    '../../utils/safeStorage.js': mockSafeStorage
});

const StateSyncService = StateSyncModule.StateSyncService;
const { GAME_EVENTS, STORAGE_KEYS } = StateSyncModule;

// Add a simple loop detection utility
const withLoopDetection = (fn, maxDepth = 10) => {
    let depth = 0;
    return (...args) => {
        if (depth > maxDepth) {
            throw new Error(`Possible infinite loop detected (depth > ${maxDepth})`);
        }
        depth++;
        try {
            return fn(...args);
        } finally {
            depth--;
        }
    };
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Mock global objects
if (typeof global.localStorage === 'undefined') {
  global.localStorage = localStorageMock;
}

describe('StateSyncService', function() {
    // Increase timeout for async tests
    this.timeout(10000);
    
    let stateSyncService;
    let mockSocketService;
    let sandbox;
    
    // Mock methods
    const mockEmit = sinon.stub().resolves({});
    const mockOn = sinon.stub();
    const mockOff = sinon.stub();
    const mockDisconnect = sinon.stub();
    const mockConnect = sinon.stub();
    let mockIsConnected = true;
    let eventHandlers = {}; // Track event handlers
    
    // Mock the StateSyncService methods we need to test
    const mockHandleGameUpdate = sinon.stub().callsFake(function(update) {
        if (!this.currentState) {
            this.currentState = {};
        }
        this.currentState = { ...this.currentState, ...update };
        this.saveStateToStorage(this.currentState);
        this.notifyStateChange();
    });
    
    const mockSendAction = sinon.stub().callsFake(function(action, payload) {
        if (this.socketService.isConnected()) {
            return this.socketService.emit(action, payload);
        } else {
            this.offlineQueue = this.offlineQueue || [];
            this.offlineQueue.push({ action, payload, timestamp: Date.now() });
            return Promise.reject(new Error('Offline'));
        }
    });
    
    const mockMergeStates = function(base, update) {
        if (!base) return { ...update };
        const result = { ...base };
        
        // Handle special cases for nested objects
        if (update.players) {
            result.players = { ...(base.players || {}), ...update.players };
        }
        
        // Merge other properties
        Object.keys(update).forEach(key => {
            if (key !== 'players' && key !== '_fullUpdate') {
                result[key] = update[key];
            }
        });
        
        return result;
    };
    
    // Reset mockSafeStorage before each test
    beforeEach(() => {
        mockSafeStorage.getItem.reset();
        mockSafeStorage.setItem.reset();
        mockSafeStorage.removeItem.reset();
    });
    
    // Mock other service methods
    const mockRequestFullState = sinon.stub().resolves({});
    const mockSaveStateToStorage = sinon.stub().resolves();
    const mockLoadStateFromStorage = sinon.stub().resolves(null);
    const mockNotifyStateChange = sinon.stub();
    const mockProcessOfflineQueue = sinon.stub().resolves();
    
    // Complete mock socket service
    const createMockSocketService = () => ({
        on: mockOn,
        off: mockOff,
        emit: mockEmit,
        disconnect: mockDisconnect,
        connect: mockConnect,
        get connected() { return mockIsConnected; },
        isConnected: () => mockIsConnected,
        send: mockEmit // Alias for emit for some methods
    });
    
    // Sample game states
    const initialState = {
        gameId: 'test-game',
        gamePhase: 'LOBBY',
        players: {
            'player-1': { id: 'player-1', name: 'Test Player 1', hand: [] },
            'player-2': { id: 'player-2', name: 'Test Player 2', hand: [] }
        },
        currentPlayer: 'player-1',
        scores: { team1: 0, team2: 0 },
        _lastUpdated: Date.now()
    };
    
    const updatedState = {
        gamePhase: 'PLAYING',
        currentPlayer: 'player-2',
        players: {
            'player-1': { id: 'player-1', name: 'Test Player 1', hand: ['2H', '3H'] },
            'player-2': { id: 'player-2', name: 'Test Player 2', hand: ['4H', '5H'] }
        },
        scores: { team1: 2, team2: 1 },
        _lastUpdated: Date.now() + 1000
    };
    
    // Setup and teardown
    before(() => {
        sandbox = sinon.createSandbox();
        
        // Setup mock socket service with all required methods
        mockSocketService = createMockSocketService();
        
        // Setup mock event handlers
        mockOn.callsFake((event, handler) => {
            eventHandlers[event] = handler;
            return mockSocketService; // Allow chaining
        });
        
        // Create instance with mock socket service
        stateSyncService = new StateSyncService(mockSocketService);
        
        // Bind mock methods to the service instance
        stateSyncService.handleGameUpdate = mockHandleGameUpdate.bind(stateSyncService);
        stateSyncService.sendAction = mockSendAction.bind(stateSyncService);
        stateSyncService.mergeStates = mockMergeStates.bind(stateSyncService);
        stateSyncService.requestFullState = mockRequestFullState.bind(stateSyncService);
        stateSyncService.saveStateToStorage = mockSaveStateToStorage.bind(stateSyncService);
        stateSyncService.loadStateFromStorage = mockLoadStateFromStorage.bind(stateSyncService);
        stateSyncService.notifyStateChange = mockNotifyStateChange.bind(stateSyncService);
        stateSyncService.processOfflineQueue = mockProcessOfflineQueue.bind(stateSyncService);
        
        // Initialize instance properties
        stateSyncService.offlineQueue = [];
        stateSyncService.currentState = null;
        stateSyncService.initialized = false;
        stateSyncService.isReplaying = false;
        
        // Mock emit to handle callbacks
        mockEmit.callsFake((event, data, callback) => {
            if (typeof callback === 'function') {
                callback({ success: true });
            }
            return mockSocketService;
        });
        
        // Mock the socket service's isConnected method
        mockSocketService.isConnected = () => mockIsConnected;
        
        // Initialize mock event handlers
        mockOn.callsFake((event, handler) => {
            eventHandlers[event] = handler;
            return mockSocketService;
        });
        
        // Mock the socket service's on/off methods
        mockSocketService.on = mockOn;
        mockSocketService.off = mockOff;
        mockSocketService.emit = mockEmit;
        mockSocketService.disconnect = mockDisconnect;
    });
    
    beforeEach(() => {
        // Reset mocks before each test
        mockEmit.resetHistory();
        mockOn.resetHistory();
        mockDisconnect.resetHistory();
        mockIsConnected = true;
        
        // Create a new instance for each test
        stateSyncService = new StateSyncService(mockSocketService);
        
        // Clear localStorage
        global.localStorage.clear();
    });
    
    afterEach(() => {
        // Clear any pending timers
        if (stateSyncService && stateSyncService.offlineTimer) {
            clearInterval(stateSyncService.offlineTimer);
            stateSyncService.offlineTimer = null;
        }
        
        // Restore sandbox and clear storage
        sandbox.restore();
        global.localStorage.clear();
        
        // Reset any global state
        mockIsConnected = true;
        eventHandlers = {};
    });
    
    after(() => {
        sinon.restore();
    });
    
    describe('initialization', () => {
        it('should initialize with null state', () => {
            expect(stateSyncService.currentState).to.be.null;
        });
        
        it('should set up socket event listeners on initialization', async () => {
            await stateSyncService.initialize();
            
            // Verify event listeners were set up
            sinon.assert.calledWith(mockOn, 'game:state:update', sinon.match.func);
            sinon.assert.calledWith(mockOn, 'reconnect', sinon.match.func);
            sinon.assert.calledWith(mockOn, 'disconnect', sinon.match.func);
            
            // Verify initialization flag is set
            expect(stateSyncService.initialized).to.be.true;
        });
        
        it('should not initialize multiple times', async () => {
            await stateSyncService.initialize();
            await stateSyncService.initialize();
            
            // Should only set up event listeners once
            sinon.assert.calledOnce(mockOn.withArgs('game:state:update', sinon.match.func));
        });
        
        it('should load state from storage on initialization', async () => {
            const testState = { gameId: 'test', players: {} };
            mockLoadStateFromStorage.resolves(testState);
            
            await stateSyncService.initialize();
            
            expect(stateSyncService.currentState).to.equal(testState);
            expect(mockNotifyStateChange).to.have.been.calledOnce;
        });
        
        it('should handle errors during initialization', async () => {
            const error = new Error('Test error');
            mockLoadStateFromStorage.rejects(error);
            
            // Stub console.error to prevent test output
            const consoleStub = sandbox.stub(console, 'error');
            
            await stateSyncService.initialize();
            
            expect(consoleStub).to.have.been.calledWith('Error initializing state sync service:', error);
            expect(stateSyncService.initialized).to.be.true; // Should still be marked as initialized
        });
        
        describe('loadStateFromStorage', () => {
            beforeEach(() => {
                // Reset mocks before each test
                mockSafeStorage.getItem.reset();
                mockSafeStorage.setItem.reset();
                mockSafeStorage.removeItem.reset();
            });
            
            it('should return null for corrupted localStorage data', async () => {
                // Mock safeStorage to return invalid JSON
                mockSafeStorage.getItem.withArgs(STORAGE_KEYS.GAME_STATE).returns('invalid-json');
                
                const result = await stateSyncService.loadStateFromStorage();
                expect(result).to.be.null;
            });

            it('should return null for expired state', async () => {
                // Mock safeStorage to return expired state
                const expiredState = {
                    state: { gameId: 'expired', players: {} },
                    timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
                };
                
                mockSafeStorage.getItem
                    .withArgs(STORAGE_KEYS.GAME_STATE)
                    .returns(JSON.stringify(expiredState));
                
                const result = await stateSyncService.loadStateFromStorage();
                
                expect(result).to.be.null;
                expect(mockSafeStorage.removeItem).to.have.been.calledWith(STORAGE_KEYS.GAME_STATE);
            });

            it('should return null for missing state', async () => {
                // Mock safeStorage to return null (no saved state)
                mockSafeStorage.getItem.withArgs(STORAGE_KEYS.GAME_STATE).returns(null);
                
                const result = await stateSyncService.loadStateFromStorage();
                expect(result).to.be.null;
            });
            
            it('should return valid state if not expired', async () => {
                const testState = { gameId: 'valid', players: {} };
                const savedState = {
                    state: testState,
                    timestamp: Date.now() - (23 * 60 * 60 * 1000) // 23 hours ago
                };
                
                // Mock safeStorage to return valid state
                mockSafeStorage.getItem
                    .withArgs(STORAGE_KEYS.GAME_STATE)
                    .returns(JSON.stringify(savedState));
                
                const result = await stateSyncService.loadStateFromStorage();
                expect(result).to.deep.equal(testState);
            });
            
            it('should handle errors when parsing state', async () => {
                // Mock safeStorage to throw an error
                mockSafeStorage.getItem.withArgs(STORAGE_KEYS.GAME_STATE).throws(new Error('Test error'));
                
                const consoleStub = sandbox.stub(console, 'error');
                
                const result = await stateSyncService.loadStateFromStorage();
                
                expect(result).to.be.null;
                expect(consoleStub).to.have.been.calledWith('Error loading state from storage:', sinon.match.instanceOf(Error));
            });
        });
    });    
    
    describe('state management', function() {
        this.timeout(5000);
        
        it('should initialize with null state', () => {
            expect(stateSyncService.currentState).to.be.null;
        });
        
        it('should update state and notify subscribers', () => {
            // Set up a subscriber
            const subscriber = sinon.stub();
            stateSyncService.subscribe('stateChange', subscriber);
            
            // Update state
            const newState = { gamePhase: 'playing' };
            stateSyncService.handleGameUpdate(newState);
            
            // Check if state was updated
            expect(stateSyncService.currentState.gamePhase).to.equal('playing');
            
            // Check if subscriber was called
            sinon.assert.calledOnce(subscriber);
        });
        
        it('should handle partial state updates', () => {
            // Initial state
            stateSyncService.handleGameUpdate({ gamePhase: 'playing', currentTurn: 'player1' });
            
            // Partial update
            stateSyncService.handleGameUpdate({ currentTurn: 'player2' });
            
            expect(stateSyncService.currentState.gamePhase).to.equal('playing');
            expect(stateSyncService.currentState.currentTurn).to.equal('player2');
        });
        
        it('should save state to localStorage on update', () => {
            // Update state (persistence is enabled by default)
            const newState = { gamePhase: 'gameOver' };
            stateSyncService.handleGameUpdate(newState);
            
            // Check if state was saved to localStorage
            const savedState = JSON.parse(global.localStorage.getItem(STORAGE_KEYS.GAME_STATE));
            expect(savedState.state.gamePhase).to.equal('gameOver');
        });
    });
    
    describe('action dispatching', () => {
        it('should send actions when online', () => {
            const action = { type: 'PLAY_CARD', payload: { card: 'AH' } };
            stateSyncService.sendAction('game:action', action);
            
            sinon.assert.calledWith(mockEmit, 'game:action', action);
        });
        
        it('should queue actions when offline', () => {
            mockIsConnected = false;
            const action = { type: 'PLAY_CARD', payload: { card: 'AH' } };
            
            stateSyncService.sendAction('game:action', action);
            
            expect(stateSyncService.offlineQueue).to.have.length(1);
            expect(stateSyncService.offlineQueue[0].action).to.equal('game:action');
            expect(stateSyncService.offlineQueue[0].payload).to.deep.equal(action);
        });
        
        it('should replay queued actions when coming back online', async () => {
            // Queue some actions while offline
            mockIsConnected = false;
            const action1 = { type: 'PLAY_CARD', payload: { card: 'AH' } };
            const action2 = { type: 'PLAY_CARD', payload: { card: 'KH' } };
            
            stateSyncService.sendAction('game:action', action1);
            stateSyncService.sendAction('game:action', action2);
            
            // Come back online
            mockIsConnected = true;
            await stateSyncService.handleReconnect();
            
            // Check if actions were replayed
            sinon.assert.calledWith(mockEmit.firstCall, 'game:action', action1);
            sinon.assert.calledWith(mockEmit.secondCall, 'game:action', action2);
            expect(stateSyncService.offlineQueue).to.be.empty;
        });
    });
    
    describe('reconnection handling', () => {
        it('should handle reconnection by requesting full state', async () => {
            // Set up the reconnect handler
            let reconnectHandler;
            mockOn.callsFake((event, handler) => {
                if (event === 'reconnect') {
                    reconnectHandler = handler;
                }
                return mockSocketService;
            });
            
            // Initialize the service to set up event listeners
            stateSyncService.initialize();
            
            // Clear the mock call history
            mockRequestFullState.resetHistory();
            
            // Trigger reconnect
            await reconnectHandler();
            
            // Check if full state was requested
            sinon.assert.calledOnce(mockRequestFullState);
        });
        
        it('should process offline queue when reconnecting', async () => {
            // Add some actions to the offline queue
            const action1 = { type: 'PLAY_CARD', payload: { card: 'AH' } };
            const action2 = { type: 'PLAY_CARD', payload: { card: 'KH' } };
            stateSyncService.offlineQueue = [
                { action: 'game:action', payload: action1, timestamp: Date.now() },
                { action: 'game:action', payload: action2, timestamp: Date.now() + 1000 }
            ];
            
            // Set up the reconnect handler
            let reconnectHandler;
            mockOn.callsFake((event, handler) => {
                if (event === 'reconnect') {
                    reconnectHandler = handler;
                }
                return mockSocketService;
            });
            
            // Initialize the service
            stateSyncService.initialize();
            
            // Trigger reconnect
            await reconnectHandler();
            
            // Check if offline queue was processed
            expect(stateSyncService.offlineQueue).to.be.empty;
            
            // Check if actions were sent
            sinon.assert.calledTwice(mockEmit);
            sinon.assert.calledWith(mockEmit.firstCall, 'game:action', action1);
            sinon.assert.calledWith(mockEmit.secondCall, 'game:action', action2);
        });
    });
    
    describe('utility methods', function() {
        this.timeout(5000);
        
        it('should handle arrays in mergeStates (arrays are replaced, not merged)', () => {
            const base = { 
                items: [1, 2, 3],
                nested: { items: ['a', 'b'] }
            };
            const update = { 
                items: [4, 5],
                nested: { items: ['c'] }
            };
            
            const result = stateSyncService.mergeStates(base, update);
            
            // Arrays should be replaced, not merged
            expect(result.items).to.deep.equal([4, 5]);
            // Nested arrays should also be replaced
            expect(result.nested.items).to.deep.equal(['c']);
        });

        it('should merge states correctly', () => {
            // Test with players object which has special merging
            const base = { 
                players: { 'player1': { name: 'Alice', score: 10 } },
                settings: { theme: 'light', volume: 50 },
                version: '1.0.0'
            };
            const update = { 
                players: { 'player2': { name: 'Bob', score: 20 } },
                settings: { theme: 'dark' },
                version: '1.0.1'
            };
            
            const result = stateSyncService.mergeStates(base, update);
            
            // Players should be merged (special case)
            expect(result.players).to.have.property('player1');
            expect(result.players).to.have.property('player2');
            
            // Settings should be shallow merged (non-special case)
            expect(result.settings).to.deep.equal({ theme: 'dark' });
            
            // Version should be updated
            expect(result.version).to.equal('1.0.1');
        });
        
        it('should handle merging with undefined or null values', () => {
            const base = { a: 1, b: { c: 2 } };
            const update = { a: undefined, b: null };
            
            const result = stateSyncService.mergeStates(base, update);
            
            expect(result).to.deep.include({
                a: undefined,
                b: null
            });
        });
        
        it('should handle state updates from server', () => {
            const update = { gamePhase: 'bidding' };
            const spy = sandbox.spy(console, 'error');
            
            // Add loop detection to handleGameUpdate
            const originalHandleGameUpdate = stateSyncService.handleGameUpdate;
            stateSyncService.handleGameUpdate = withLoopDetection(originalHandleGameUpdate);
            
            // Test with simple update
            stateSyncService.handleGameUpdate(update);
            expect(stateSyncService.getState().gamePhase).to.equal('bidding');
            expect(spy.called).to.be.false;
            
            // Restore original method
            stateSyncService.handleGameUpdate = originalHandleGameUpdate;
        });
        
        it('should prevent state update loops', () => {
            // Create a circular reference that could cause loops
            const circularUpdate = {
                gamePhase: 'bidding',
                nested: {}
            };
            circularUpdate.nested.parent = circularUpdate;
            
            const originalHandleGameUpdate = stateSyncService.handleGameUpdate;
            stateSyncService.handleGameUpdate = withLoopDetection(originalHandleGameUpdate, 5);
            
            // This should not cause an infinite loop
            expect(() => {
                stateSyncService.handleGameUpdate(circularUpdate);
            }).to.throw('Possible infinite loop detected');
            
            // Restore original method
            stateSyncService.handleGameUpdate = originalHandleGameUpdate;
        });
    });

    describe('offline handling', function() {
        this.timeout(10000); // Longer timeout for queue processing
        
        it('should queue actions when offline', () => {
            mockIsConnected = false;
            stateSyncService.sendAction('PLAY_CARD', { card: 'AH' });
            expect(stateSyncService.offlineQueue).to.have.length(1);
            expect(stateSyncService.offlineQueue[0].event).to.equal('PLAY_CARD');
        });
        
        it('should stop processing queue when disconnected', async function() {
            this.timeout(5000);
            
            // Set up queue with some actions
            stateSyncService.offlineQueue = [
                { action: 'TEST_ACTION', payload: [1], id: '1', timestamp: Date.now() },
                { action: 'TEST_ACTION', payload: [2], id: '2', timestamp: Date.now() + 1 }
            ];
            
            // Disconnect during processing
            mockIsConnected = false;
            
            // Process queue
            await stateSyncService.processOfflineQueue();
            
            // Should not have processed any items while offline
            expect(mockEmit.called).to.be.false;
            expect(stateSyncService.offlineQueue).to.have.length(2);
        });
        
        it('should request full state if no queued actions', async () => {
            stateSyncService.pendingActions = [];
            const requestFullStateStub = sandbox.stub(stateSyncService, 'requestFullState').resolves();
            
            await stateSyncService.handleReconnect();
            
            sinon.assert.calledOnce(requestFullStateStub);
        });
    });
    
    describe('subscriptions', function() {
        this.timeout(5000);
        
        it('should notify subscribers of state changes', () => {
            const callback = sinon.spy();
            const unsubscribe = stateSyncService.subscribe('stateChange', callback);
            
            // Wrap handleGameUpdate with loop detection
            const originalHandleGameUpdate = stateSyncService.handleGameUpdate;
            stateSyncService.handleGameUpdate = withLoopDetection(originalHandleGameUpdate);
            
            stateSyncService.handleGameUpdate({ test: 'value' });
            expect(callback.calledOnce).to.be.true;
            
            // Test unsubscribing
            unsubscribe();
            stateSyncService.handleGameUpdate({ test: 'new value' });
            expect(callback.calledOnce).to.be.true; // Should still only be called once
            
            // Restore original method
            stateSyncService.handleGameUpdate = originalHandleGameUpdate;
        });
        
        it('should clean up event handlers on dispose', () => {
            const callback = sinon.spy();
            stateSyncService.subscribe('stateChange', callback);
            
            stateSyncService.dispose();
            
            // Verify all listeners were removed
            expect(mockOff.called).to.be.true;
            expect(mockOff.firstCall.args[0]).to.equal(GAME_EVENTS.STATE_UPDATE);
            expect(mockOff.secondCall.args[0]).to.equal('reconnect');
            expect(mockOff.thirdCall.args[0]).to.equal('disconnect');
            
            // Verify timer was cleared
            expect(stateSyncService.offlineTimer).to.be.null;
        });
    });
    
    describe('mergeStates', () => {
        it('should merge nested objects correctly', () => {
            const base = { a: { b: 1, c: 2 }, d: 3 };
            const update = { a: { b: 2 }, e: 4 };
            
            const result = stateSyncService.mergeStates(base, update);
            
            // Check that the update was applied
            expect(result.a.b).to.equal(2);
            expect(result.a.c).to.equal(2);
            expect(result.d).to.equal(3);
            expect(result.e).to.equal(4);
        });
    });
    
    describe('utility methods', function() {
        this.timeout(5000);
        
        it('should handle arrays in mergeStates (arrays are replaced, not merged)', () => {
        const base = { 
            items: [1, 2, 3],
            nested: { items: ['a', 'b'] }
        };
        const update = { 
            items: [4, 5],
            nested: { items: ['c'] }
        };
        
        const result = stateSyncService.mergeStates(base, update);
        
        // Arrays should be replaced, not merged
        expect(result.items).to.deep.equal([4, 5]);
        // Nested arrays should also be replaced
        expect(result.nested.items).to.deep.equal(['c']);
    });

        it('should merge states correctly', () => {
            // Test with players object which has special merging
            const base = { 
                players: { 'player1': { name: 'Alice', score: 10 } },
                settings: { theme: 'light', volume: 50 },
                version: '1.0.0'
            };
            const update = { 
                players: { 'player2': { name: 'Bob', score: 20 } },
                settings: { theme: 'dark' },
                version: '1.0.1'
            };
            
            const result = stateSyncService.mergeStates(base, update);
            
            // Players should be merged (special case)
            expect(result.players).to.have.property('player1');
            expect(result.players).to.have.property('player2');
            
            // Settings should be shallow merged (non-special case)
            expect(result.settings).to.deep.equal({ theme: 'dark' });
            
            // Version should be updated
            expect(result.version).to.equal('1.0.1');
        });
        
        it('should handle merging with undefined or null values', () => {
            const base = { a: 1, b: { c: 2 } };
            const update = { a: undefined, b: null };
            
            const result = stateSyncService.mergeStates(base, update);
            
            expect(result).to.deep.include({
                a: undefined,
                b: null
            });
        });
        
        it('should handle state updates from server', () => {
            const update = { gamePhase: 'bidding' };
            const spy = sandbox.spy(console, 'error');
            
            // Add loop detection to handleGameUpdate
            const originalHandleGameUpdate = stateSyncService.handleGameUpdate;
            stateSyncService.handleGameUpdate = withLoopDetection(originalHandleGameUpdate);
            
            // Test with simple update
            stateSyncService.handleGameUpdate(update);
            expect(stateSyncService.getState().gamePhase).to.equal('bidding');
            expect(spy.called).to.be.false;
            
            // Restore original method
            stateSyncService.handleGameUpdate = originalHandleGameUpdate;
        });
        
        it('should prevent state update loops', () => {
            // Create a circular reference that could cause loops
            const circularUpdate = {
                gamePhase: 'bidding',
                nested: {}
            };
            circularUpdate.nested.parent = circularUpdate;
            
            const originalHandleGameUpdate = stateSyncService.handleGameUpdate;
            stateSyncService.handleGameUpdate = withLoopDetection(originalHandleGameUpdate, 5);
            
            // This should not cause an infinite loop
            expect(() => {
                stateSyncService.handleGameUpdate(circularUpdate);
            }).to.throw('Possible infinite loop detected');
            
            // Restore original method
            stateSyncService.handleGameUpdate = originalHandleGameUpdate;
        });
    });
    
    describe('offline handling', function() {
        this.timeout(10000); // Longer timeout for queue processing
        
        it('should queue actions when offline', () => {
            mockIsConnected = false;
            stateSyncService.sendAction('PLAY_CARD', { card: 'AH' });
            expect(stateSyncService.offlineQueue).to.have.length(1);
            expect(stateSyncService.offlineQueue[0].event).to.equal('PLAY_CARD');
        });
        
        it('should stop processing queue when disconnected', async function() {
            this.timeout(5000);
            
            // Set up queue with some actions
            stateSyncService.offlineQueue = [
                { action: 'TEST_ACTION', payload: [1], id: '1', timestamp: Date.now() },
                { action: 'TEST_ACTION', payload: [2], id: '2', timestamp: Date.now() + 1 }
            ];
            
            // Disconnect during processing
            mockIsConnected = false;
            
            // Process queue
            await stateSyncService.processOfflineQueue();
            
            // Should not have processed any items while offline
            expect(mockEmit.called).to.be.false;
            expect(stateSyncService.offlineQueue).to.have.length(2);
        });
        
        it('should request full state if no queued actions', async () => {
            stateSyncService.pendingActions = [];
            const requestFullStateStub = sandbox.stub(stateSyncService, 'requestFullState').resolves();
            
            await stateSyncService.handleReconnect();
            
            sinon.assert.calledOnce(requestFullStateStub);
        });
    });
    
    describe('subscriptions', function() {
        this.timeout(5000);
        
        it('should notify subscribers of state changes', () => {
            const callback = sinon.spy();
            const unsubscribe = stateSyncService.subscribe('stateChange', callback);
            
            // Wrap handleGameUpdate with loop detection
            const originalHandleGameUpdate = stateSyncService.handleGameUpdate;
            stateSyncService.handleGameUpdate = withLoopDetection(originalHandleGameUpdate);
            
            stateSyncService.handleGameUpdate({ test: 'value' });
            expect(callback.calledOnce).to.be.true;
            
            // Test unsubscribing
            unsubscribe();
            stateSyncService.handleGameUpdate({ test: 'new value' });
            expect(callback.calledOnce).to.be.true; // Should still only be called once
            
            // Restore original method
            stateSyncService.handleGameUpdate = originalHandleGameUpdate;
        });
        
        it('should clean up event handlers on dispose', () => {
            const callback = sinon.spy();
            stateSyncService.subscribe('stateChange', callback);
            
            stateSyncService.dispose();
            
            // Verify all listeners were removed
            expect(mockOff.called).to.be.true;
            expect(mockOff.firstCall.args[0]).to.equal(GAME_EVENTS.STATE_UPDATE);
            expect(mockOff.secondCall.args[0]).to.equal('reconnect');
            expect(mockOff.thirdCall.args[0]).to.equal('disconnect');
            
            // Verify timer was cleared
            expect(stateSyncService.offlineTimer).to.be.null;
        });
    });
    
    describe('mergeStates', () => {
        it('should merge nested objects correctly', () => {
            // Test data
            const base = { 
                gamePhase: 'LOBBY',
                players: {
                    p1: { name: 'Alice', score: 0 },
                    p2: { name: 'Bob', score: 0 }
                },
                currentPlayer: 'p1',
                scores: { team1: 0, team2: 0 },
                gameId: 'test-game'
            };
            
            const update = { 
                gamePhase: 'PLAYING',
                players: {
                    p1: { score: 1 }  // Update Alice's score
                },
                currentPlayer: 'p2',
                newProp: 'test'
            };
            
            // Call the method
            const result = stateSyncService.mergeStates(base, update);
            
            // Verify top-level properties
            expect(result.gamePhase).to.equal('PLAYING');
            expect(result.currentPlayer).to.equal('p2');
            expect(result.gameId).to.equal('test-game');
            expect(result.newProp).to.equal('test');
            
            // Verify nested objects are merged
            expect(result.players).to.have.all.keys('p1', 'p2');
            expect(result.players.p1).to.deep.include({
                name: 'Alice',
                score: 1
            });
            expect(result.players.p2).to.deep.equal({
                name: 'Bob',
                score: 0
            });
            
            // Verify other nested objects are preserved
            expect(result.scores).to.deep.equal({ team1: 0, team2: 0 });
            
            // Test with a completely new player
            const newPlayerUpdate = {
                players: {
                    p3: { name: 'Charlie', score: 0 }
                }
            };
            const resultWithNewPlayer = stateSyncService.mergeStates(base, newPlayerUpdate);
            expect(resultWithNewPlayer.players).to.have.all.keys('p1', 'p2', 'p3');
            expect(resultWithNewPlayer.players.p3).to.deep.equal({ name: 'Charlie', score: 0 });
        });
    });
});
