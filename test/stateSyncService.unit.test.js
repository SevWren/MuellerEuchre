/**
 * @file stateSyncService.unit.test.js - Unit tests for the StateSyncService module
 * @module StateSyncServiceUnitTest
 * @description Unit tests for the StateSyncService module
 * @requires chai
 * @see ../src/stateSyncService.unit.js
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { 
    createMockSafeStorage, 
    createMockSocketService, 
    resetAllMocks 
} from './helpers/testUtils.js';
import { 
    INITIAL_STATE, 
    IN_PROGRESS_STATE, 
    COMPLETED_STATE, 
    TEST_PLAYERS 
} from './fixtures/testStates.js'; 

// Test configuration and constants
const TEST_CONFIG = {
    TIMEOUT: 5000,       // Default test timeout (5 seconds)
    LONG_TIMEOUT: 10000, // Longer timeout for slow tests (10 seconds)
    POLL_INTERVAL: 100,  // Polling interval for async operations (100ms)
    RETRIES: 2           // Number of retries for flaky tests
};

// Storage keys
const STORAGE_KEYS = {
    GAME_STATE: 'game_state',
    OFFLINE_QUEUE: 'offline_queue'
};

const GAME_EVENTS = {
    STATE_UPDATE: 'game:state:update',
    REQUEST_FULL_STATE: 'game:request_full_state',
    PLAYER_JOIN: 'game:player:join',
    PLAYER_LEAVE: 'game:player:leave',
    GAME_START: 'game:start',
    GAME_END: 'game:end'
};

// Mock the safeStorage module
const mockSafeStorage = createMockSafeStorage();

// Create mocks for dependencies
const mockLogger = {
    log: sinon.stub()
};

const mockConstants = {
    GAME_EVENTS,
    STORAGE_KEYS
};

let StateSyncService; // Will be set in beforeEach

// Use the global TEST_CONFIG for test timeouts and retries

// Helper function to wait for a condition with retries
const waitFor = async (condition, { 
    interval = TEST_CONFIG.POLL_INTERVAL, 
    timeout = TEST_CONFIG.TIMEOUT 
} = {}) => {
    const start = Date.now();
    let lastError;
    
    while (Date.now() - start < timeout) {
        try {
            const result = await Promise.resolve(condition());
            if (result) return result;
        } catch (error) {
            lastError = error;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    const error = lastError || new Error(`Condition not met within ${timeout}ms`);
    throw error;
};

// Helper function to detect and prevent infinite loops in state updates
const withLoopDetection = (originalFn, maxDepth = 10) => {
    let depth = 0;
    
    return function(...args) {
        if (depth >= maxDepth) {
            throw new Error('Possible infinite loop detected');
        }
        
        depth++;
        try {
            return originalFn.apply(this, args);
        } finally {
            depth--;
        }
    };
};

describe('StateSyncService', function() {
    // Set test configuration
    this.timeout(TEST_CONFIG.TIMEOUT);
    this.retries(TEST_CONFIG.RETRIES);
    
    // Test fixtures
    let stateSyncService;
    let mockSocketService;
    let sandbox;
    
    // Mock event handlers
    const eventHandlers = {};
    
    // Mock the StateSyncService methods we need to test
    let mockHandleGameUpdate;
    let mockSendAction;
    let mockMergeStates;
    
    // Mock other service methods
    let mockRequestFullState;
    let mockSaveStateToStorage;
    let mockLoadStateFromStorage;
    let mockNotifyStateChange;
    let mockProcessOfflineQueue;
    
    // Socket service mocks
    let mockOn;
    let mockOff;
    let mockEmit;
    let mockDisconnect;
    let mockConnect;
    let mockIsConnected;
    
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
    
    // Use imported test states
    const initialState = { ...INITIAL_STATE };
    const inProgressState = { ...IN_PROGRESS_STATE };
    const completedState = { ...COMPLETED_STATE };

    // Setup and teardown
    beforeEach(async () => {
        // Reset all mocks
        mockSafeStorage.getItem.reset();
        mockSafeStorage.setItem.reset();
        mockSafeStorage.removeItem.reset();
        mockLogger.log.reset();
        
        // Create a fresh sandbox for each test
        sandbox = sinon.createSandbox();
        
        // Initialize mock functions
        mockHandleGameUpdate = sandbox.stub().callsFake(function(update) {
            if (!this.currentState) {
                this.currentState = {};
            }
            this.currentState = { ...this.currentState, ...update };
            this.saveStateToStorage(this.currentState);
            this.notifyStateChange();
        });
        
        mockSendAction = sandbox.stub().callsFake(function(action, payload) {
            if (this.socketService.isConnected()) {
                return this.socketService.emit(action, payload);
            } else {
                this.offlineQueue = this.offlineQueue || [];
                this.offlineQueue.push({ action, payload, timestamp: Date.now() });
                return Promise.reject(new Error('Offline'));
            }
        });
        
        mockMergeStates = sandbox.stub().callsFake(function(base, update) {
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
        });
        
        // Initialize other mock methods
        mockRequestFullState = sandbox.stub().resolves({});
        mockSaveStateToStorage = sandbox.stub().resolves();
        mockLoadStateFromStorage = sandbox.stub().resolves(null);
        mockNotifyStateChange = sandbox.stub();
        mockProcessOfflineQueue = sandbox.stub().resolves();
        
        // Initialize socket service mocks
        mockOn = sandbox.stub();
        mockOff = sandbox.stub();
        mockEmit = sandbox.stub().callsFake((event, data, callback) => {
            if (typeof callback === 'function') {
                callback({ success: true });
            }
            return mockSocketService;
        });
        mockDisconnect = sandbox.stub();
        mockConnect = sandbox.stub();
        mockIsConnected = true;
        
        // Setup mock socket service with all required methods
        mockSocketService = createMockSocketService();
        
        // Setup mock event handlers
        mockOn.callsFake((event, handler) => {
            eventHandlers[event] = handler;
            return mockSocketService; // Allow chaining
        });
        
        // Reset event handlers
        Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);
        
        // Import the StateSyncService with esmock
        const module = await esmock(
            '../src/client/services/stateSyncService.js',
            {
                '../../utils/logger.js': mockLogger,
                '../../config/constants.js': mockConstants,
                '../../utils/safeStorage.js': mockSafeStorage,
                // Add any other required mocks here
            },
            {
                // This ensures esmock can find the actual module files
                // by providing the current file's directory as a reference
                rootDir: __dirname
            }
        );
        
        StateSyncService = module.default;
        
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
        
        // Reset mock functions
        mockRequestFullState.reset();
        mockSaveStateToStorage.reset();
        mockLoadStateFromStorage.reset();
        mockNotifyStateChange.reset();
        mockProcessOfflineQueue.reset();
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
        resetAllMocks();
        
        // Reset any global state
        mockIsConnected = true;
        Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);
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
            
            // Assert
            expect(mockOn).to.have.been.calledWith('connect');
            expect(mockOn).to.have.been.calledWith('disconnect');
            expect(mockOn).to.have.been.calledWith(GAME_EVENTS.STATE_UPDATE);
        });
        
        it('should load state from storage on initialization', async () => {
            // Arrange
            const savedState = { gamePhase: 'LOBBY' };
            mockSafeStorage.getItem.resolves(JSON.stringify(savedState));
            
            // Act
            await stateSyncService.initialize();
            
            // Assert
            expect(mockSafeStorage.getItem).to.have.been.calledWith('game_state');
            expect(stateSyncService.currentState).to.deep.include(savedState);
        });
        
        it('should handle storage errors during initialization', async () => {
            // Arrange
            const testError = new Error('Storage error');
            mockSafeStorage.getItem.rejects(testError);
            const consoleErrorStub = sinon.stub(console, 'error');
            
            // Act & Assert
            await expect(stateSyncService.initialize()).to.be.fulfilled;
            expect(consoleErrorStub).to.have.been.calledWith(
                'Error loading state from storage:', 
                testError
            );
            
            // Cleanup
            consoleErrorStub.restore();
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
                
                // Cleanup
                consoleStub.restore();
            });
            
            it('should return null for corrupted localStorage data', async () => {
                // Mock safeStorage to return invalid JSON
                mockSafeStorage.getItem.withArgs(STORAGE_KEYS.GAME_STATE).resolves('invalid-json');
                
                const result = await stateSyncService.loadStateFromStorage();
                expect(result).to.be.null;
            });
        });
    });
    
    describe('state management', function() {
        this.timeout(5000);
        
        beforeEach(async () => {
            // Reset state before each test
            stateSyncService.currentState = null;
            stateSyncService.offlineQueue = [];
            await stateSyncService.initialize();
            
            // Reset mocks
            mockSaveStateToStorage.resetHistory();
            mockNotifyStateChange.resetHistory();
        });
        
        it('should handle initial game state updates', async () => {
            // Arrange
            const testState = { ...INITIAL_STATE };
            
            // Act
            await eventHandlers[GAME_EVENTS.STATE_UPDATE](testState);
            
            // Assert
            expect(stateSyncService.currentState).to.deep.include(testState);
            expect(mockSaveStateToStorage).to.have.been.calledWith(
                sinon.match(testState)
            );
            expect(mockNotifyStateChange).to.have.been.calledOnce;
        });
        
        it('should merge partial state updates', async () => {
            // Arrange
            const initialPlayers = {
                [TEST_PLAYERS.PLAYER_1.id]: TEST_PLAYERS.PLAYER_1,
                [TEST_PLAYERS.PLAYER_2.id]: TEST_PLAYERS.PLAYER_2
            };
            
            const initialState = {
                ...INITIAL_STATE,
                players: initialPlayers,
                scores: { team1: 0, team2: 0 }
            };
            
            stateSyncService.currentState = { ...initialState };
            
            // Act - Update only the scores
            const scoreUpdate = { scores: { team1: 3, team2: 2 } };
            await eventHandlers[GAME_EVENTS.STATE_UPDATE](scoreUpdate);
            
            // Assert - Verify merge
            expect(stateSyncService.currentState).to.deep.include({
                ...initialState,
                ...scoreUpdate,
                players: initialPlayers // Players should remain unchanged
            });
            
            expect(mockSaveStateToStorage).to.have.been.calledOnce;
            expect(mockNotifyStateChange).to.have.been.calledOnce;
        });
    });
    
    describe('action dispatching', () => {
        beforeEach(() => {
            // Reset mocks and state before each test
            mockEmit.resetHistory();
            stateSyncService.offlineQueue = [];
        });

        it('should send actions when online', async () => {
            // Arrange
            const action = { type: 'PLAY_CARD', payload: { card: 'AH' } };
            mockEmit.resolves({ success: true });
            
            // Act
            await stateSyncService.sendAction('game:action', action);
            
            // Assert
            expect(mockEmit).to.have.been.calledOnceWith('game:action', action);
        });
        
        it('should queue actions when offline', async () => {
            // Arrange
            mockIsConnected = false;
            const action = { 
                type: 'PLAY_CARD', 
                payload: { 
                    card: 'AH',
                    playerId: TEST_PLAYERS.PLAYER_1.id
                } 
            };
            
            // Act & Assert
            await expect(stateSyncService.sendAction('game:action', action))
                .to.be.rejectedWith('Offline');
            
            expect(stateSyncService.offlineQueue).to.have.length(1);
            expect(stateSyncService.offlineQueue[0]).to.deep.include({
                event: 'game:action',
                args: [action]
            });
        });
        
        it('should handle arrays in mergeStates (arrays are replaced, not merged)', () => {
            // Arrange
            const base = { 
                items: [1, 2, 3],
                nested: { items: ['a', 'b'] }
            };
            const update = { 
                items: [4, 5],
                nested: { items: ['c'] }
            };
            
            // Act
            const result = stateSyncService.mergeStates(base, update);
            
            // Assert
            expect(result.items).to.deep.equal([4, 5]);
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

        it('should merge states correctly with special handling for players', () => {
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
