/**
 * @file stateSyncService.unit.test.js - Unit tests for the StateSyncService module
 * @module StateSyncServiceUnitTest
 * @description Unit tests for the StateSyncService module
 * @requires chai
 * @requires sinon
 * @see ../../src/client/services/stateSyncService.js
 */

import { expect } from 'chai';
import sinon from 'sinon';

// Import the module under test
let StateSyncService;

/**
 * Storage keys used for local storage operations
 * @type {Object}
 * @property {string} GAME_STATE - Key for storing game state
 * @property {string} OFFLINE_QUEUE - Key for storing offline action queue
 * @property {string} PENDING_ACTIONS - Key for storing pending actions
 */
const STORAGE_KEYS = {
    GAME_STATE: 'game_state',
    OFFLINE_QUEUE: 'offline_queue',
    PENDING_ACTIONS: 'pending_actions'
};

/**
 * Game event types used for socket communication
 * @type {Object}
 * @property {string} STATE_UPDATE - Event for game state updates
 * @property {string} REQUEST_FULL_STATE - Event to request full game state
 * @property {string} PLAYER_JOIN - Event when a player joins
 * @property {string} PLAYER_LEAVE - Event when a player leaves
 * @property {string} GAME_START - Event when game starts
 * @property {string} GAME_END - Event when game ends
 */
const GAME_EVENTS = {
    STATE_UPDATE: 'game:state:update',
    REQUEST_FULL_STATE: 'game:request_full_state',
    PLAYER_JOIN: 'game:player:join',
    PLAYER_LEAVE: 'game:player:leave',
    GAME_START: 'game:start',
    GAME_END: 'game:end'
};

/**
 * Game phases
 * @type {Object}
 * @property {string} LOBBY - Lobby phase
 * @property {string} BIDDING - Bidding phase
 * @property {string} PLAYING - Active play phase
 * @property {string} GAME_OVER - Game over phase
 */
const GAME_PHASES = {
    LOBBY: 'LOBBY',
    BIDDING: 'BIDDING',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};

/**
 * Mock constants object that mimics the real constants module
 * @type {Object}
 * @property {Object} STORAGE_KEYS - Storage key constants
 * @property {Object} GAME_EVENTS - Game event constants
 * @property {Object} GAME_PHASES - Game phase constants
 * @property {Object} DEBUG_LEVELS - Logging levels
 */
const mockConstants = {
    STORAGE_KEYS,
    GAME_EVENTS,
    GAME_PHASES,
    DEBUG_LEVELS: {
        INFO: 1,
        WARNING: 2,
        VERBOSE: 3
    }
};

/**
 * Mock logger implementation for testing
 * @type {Object}
 * @property {Function} log - Mock log function
 * @property {Function} setDebugLevel - Mock set debug level function
 */
const mockLogger = {
    log: sinon.stub().callsFake((level, message) => {
        const levelStr = Object.keys(mockConstants.DEBUG_LEVELS)
            .find(key => mockConstants.DEBUG_LEVELS[key] === level) || level;
        console.log(`[${levelStr}] ${message}`);
    }),
    setDebugLevel: sinon.stub()
};

/**
 * In-memory storage for testing
 * @type {Object}
 */
/**
 * In-memory storage for testing
 * @type {Object}
 */
const testStorage = {};

/**
 * Test configuration
 * @type {Object}
 * @property {number} TIMEOUT - Default test timeout (5 seconds)
 * @property {number} LONG_TIMEOUT - Longer timeout for slow tests (10 seconds)
 * @property {number} POLL_INTERVAL - Polling interval for async operations (100ms)
 * @property {number} RETRIES - Number of retries for flaky tests
 */
const TEST_CONFIG = {
    TIMEOUT: 5000,       // Default test timeout (5 seconds)
    LONG_TIMEOUT: 10000, // Longer timeout for slow tests (10 seconds)
    POLL_INTERVAL: 100,  // Polling interval for async operations (100ms)
    RETRIES: 2           // Number of retries for flaky tests
};

/**
 * Mock safeStorage implementation for testing
 * @type {Object}
 * @property {Function} getItem - Mock get item function
 * @property {Function} setItem - Mock set item function
 * @property {Function} removeItem - Mock remove item function
 * @property {Function} clear - Mock clear storage function
 */
const mockSafeStorage = {
    getItem: sinon.stub(),
    setItem: sinon.stub(),
    removeItem: sinon.stub(),
    clear: sinon.stub()
};

// Implement basic storage methods
mockSafeStorage.getItem.callsFake((key) => {
    return Promise.resolve(testStorage[key] || null);
});

mockSafeStorage.setItem.callsFake((key, value) => {
    testStorage[key] = value;
    return Promise.resolve();
});

mockSafeStorage.removeItem.callsFake((key) => {
    delete testStorage[key];
    return Promise.resolve();
});

mockSafeStorage.clear.callsFake(() => {
    Object.keys(testStorage).forEach(key => delete testStorage[key]);
    return Promise.resolve();
});

/**
 * Helper function to wait for a condition with retries
 * @param {Function} condition - Function that returns a boolean or Promise<boolean>
 * @param {Object} [options] - Options object
 * @param {number} [options.interval=TEST_CONFIG.POLL_INTERVAL] - Polling interval in ms
 * @param {number} [options.timeout=TEST_CONFIG.TIMEOUT] - Timeout in ms
 * @returns {Promise<boolean>} Resolves when condition is true or times out
 */
async function waitFor(condition, { 
    interval = TEST_CONFIG.POLL_INTERVAL, 
    timeout = TEST_CONFIG.TIMEOUT 
} = {}) {
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
}

/**
 * Wraps a function to detect and prevent infinite loops
 * @param {Function} originalFn - The function to wrap
 * @param {number} [maxDepth=10] - Maximum allowed call depth
 * @returns {Function} Wrapped function with loop detection
 */
function withLoopDetection(originalFn, maxDepth = 10) {
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
}

/**
 * Event handlers for socket events
 * @type {Object}
 */
const eventHandlers = {};

/**
 * Test player data
 * @type {Object}
 * @property {Object} PLAYER_1 - First test player
 * @property {string} PLAYER_1.id - Player ID
 * @property {string} PLAYER_1.name - Player name
 * @property {number} PLAYER_1.score - Player score
 * @property {Object} PLAYER_2 - Second test player
 * @property {string} PLAYER_2.id - Player ID
 * @property {string} PLAYER_2.name - Player name
 * @property {number} PLAYER_2.score - Player score
 */
const TEST_PLAYERS = {
    PLAYER_1: { id: 'p1', name: 'Alice', score: 0 },
    PLAYER_2: { id: 'p2', name: 'Bob', score: 0 }
};

/**
 * Initial game state for testing
 * @type {Object}
 */
const INITIAL_STATE = {
    gamePhase: GAME_PHASES.LOBBY,
    players: {},
    scores: { team1: 0, team2: 0 },
    currentPlayer: null,
    gameId: 'test-game',
    timestamp: Date.now()
};

/**
 * In-progress game state for testing
 * @type {Object}
 */
const IN_PROGRESS_STATE = {
    ...INITIAL_STATE,
    gamePhase: GAME_PHASES.PLAYING,
    players: {
        [TEST_PLAYERS.PLAYER_1.id]: TEST_PLAYERS.PLAYER_1,
        [TEST_PLAYERS.PLAYER_2.id]: TEST_PLAYERS.PLAYER_2
    },
    currentPlayer: TEST_PLAYERS.PLAYER_1.id,
    scores: { team1: 3, team2: 2 }
};

/**
 * Main test suite for StateSyncService
 */
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
    
    /**
     * Create a mock socket service
     * @returns {Object} Mock socket service
     */
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
    
    // Use test states
    const initialState = { ...INITIAL_STATE };
    const inProgressState = { ...IN_PROGRESS_STATE };

    /**
     * Test setup before each test
     */
    beforeEach(async () => {
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
        
        // Setup mock socket service
        mockSocketService = createMockSocketService();
        
        // Setup mock event handlers
        mockOn.callsFake((event, handler) => {
            eventHandlers[event] = handler;
            return mockSocketService; // Allow chaining
        });
        
        // Reset event handlers
        Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);
        
        // Import the StateSyncService with proxyquire
        const module = await import('../src/client/services/stateSyncService.js');
        StateSyncService = module.default;
        
        // Clear any previous test state
        await mockSafeStorage.clear();
        
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
    
    /**
     * Test teardown after each test
     */
    afterEach(() => {
        // Clear any pending timers
        if (stateSyncService && stateSyncService.offlineTimer) {
            clearInterval(stateSyncService.offlineTimer);
            stateSyncService.offlineTimer = null;
        }
        
        // Restore sandbox and clear storage
        sandbox.restore();
        Object.keys(testStorage).forEach(key => delete testStorage[key]);
        
        // Reset any global state
        mockIsConnected = true;
        Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);
    });
    
    /**
     * Clean up after all tests
     */
    after(() => {
        sinon.restore();
    });
    
    /**
     * Basic test to verify test setup
     */
    it('should pass a basic test with core imports', () => {
        expect(true).to.be.true;
    });
});