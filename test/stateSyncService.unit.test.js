import { expect } from 'chai';
import sinon from 'sinon';
import { StateSyncService } from '../src/client/services/stateSyncService.js';
import { GAME_EVENTS, STORAGE_KEYS } from '../src/config/constants.js';

describe('StateSyncService', function() {
    // Increase timeout for async tests
    this.timeout(10000);
    
    let stateSyncService;
    let mockSocketService;
    let sandbox;
    
    // Mock methods
    const mockEmit = sinon.stub();
    const mockOn = sinon.stub();
    const mockDisconnect = sinon.stub();
    let mockIsConnected = true;
    
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
        
        // Setup mock socket service
        mockSocketService = {
            on: mockOn,
            emit: mockEmit,
            disconnect: mockDisconnect,
            get connected() { return mockIsConnected; },
            isConnected: () => mockIsConnected,
            connect: sinon.stub()
        };
        
        // Setup mock event handlers
        mockOn.callsFake((event, handler) => {
            if (event === 'connect') {
                handler();
            }
            return mockSocketService;
        });
        
        // Mock emit to handle callbacks
        mockEmit.callsFake((event, data, callback) => {
            if (typeof callback === 'function') {
                callback({ success: true });
            }
            return mockSocketService;
        });
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
        sandbox.restore();
        sinon.reset();
    });
    
    after(() => {
        sinon.restore();
    });
    
    describe('initialization', () => {
        it('should set up event listeners on initialization', () => {
            // Initialize the service
            stateSyncService.initialize();
            
            // Check if event listeners were set up
            sinon.assert.calledWith(mockOn, GAME_EVENTS.STATE_UPDATE, sinon.match.func);
            sinon.assert.calledWith(mockOn, 'reconnect', sinon.match.func);
            sinon.assert.calledWith(mockOn, 'disconnect', sinon.match.func);
        });
        
        it('should load state from localStorage if available', () => {
            // Save state to localStorage
            global.localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(initialState));
            
            // Create a new instance (should load from localStorage)
            const service = new StateSyncService(mockSocketService);
            
            // Check if state was loaded
            const state = service.getState();
            expect(state.gameId).to.equal(initialState.gameId);
            expect(state.gamePhase).to.equal(initialState.gamePhase);
        });
        
        it('should initialize with empty state if no saved state', () => {
            // Ensure localStorage is empty
            global.localStorage.clear();
            
            // Create a new instance
            const service = new StateSyncService(mockSocketService);
            
            // Check if state is empty
            const state = service.getState();
            expect(state).to.be.an('object').that.is.empty;
        });
    });
    
    describe('state management', () => {
        it('should update state and notify subscribers', () => {
            // Set up a subscriber
            const subscriber = sinon.stub();
            stateSyncService.subscribe(subscriber);
            
            // Update state
            stateSyncService.updateState(updatedState);
            
            // Check if state was updated
            const currentState = stateSyncService.getState();
            expect(currentState.gamePhase).to.equal(updatedState.gamePhase);
            expect(currentState.currentPlayer).to.equal(updatedState.currentPlayer);
            
            // Check if subscriber was notified
            sinon.assert.calledOnce(subscriber);
            sinon.assert.calledWith(subscriber, sinon.match(updatedState));
        });
        
        it('should handle partial state updates', () => {
            // Set initial state
            stateSyncService.updateState(initialState);
            
            // Apply partial update
            const partialUpdate = { gamePhase: 'PLAYING' };
            stateSyncService.updateState(partialUpdate);
            
            // Check if state was merged correctly
            const currentState = stateSyncService.getState();
            expect(currentState.gamePhase).to.equal('PLAYING');
            expect(currentState.gameId).to.equal(initialState.gameId);
        });
        
        it('should save state to localStorage on update', () => {
            // Enable state persistence
            stateSyncService.enablePersistence();
            
            // Update state
            stateSyncService.updateState(initialState);
            
            // Check if state was saved to localStorage
            const savedState = JSON.parse(global.localStorage.getItem(STORAGE_KEYS.GAME_STATE));
            expect(savedState.gameId).to.equal(initialState.gameId);
            expect(savedState.gamePhase).to.equal(initialState.gamePhase);
        });
    });
    
    describe('action dispatching', () => {
        it('should dispatch actions when online', async () => {
            // Set up mock for online state
            mockIsConnected = true;
            
            // Create a test action
            const action = { type: 'TEST_ACTION', payload: { test: true } };
            
            // Dispatch the action
            const result = await stateSyncService.dispatch(action);
            
            // Check if action was emitted
            sinon.assert.calledWith(mockEmit, 'action', action, sinon.match.func);
            expect(result).to.deep.equal({ success: true });
        });
        
        it('should queue actions when offline', async () => {
            // Set up mock for offline state
            mockIsConnected = false;
            
            // Create a test action
            const action = { type: 'TEST_ACTION', payload: { test: true } };
            
            // Dispatch the action
            const result = await stateSyncService.dispatch(action);
            
            // Check if action was queued
            expect(stateSyncService.pendingActions).to.include(action);
            expect(result).to.deep.equal({ success: true, queued: true });
        });
        
        it('should replay queued actions when coming back online', async () => {
            // Set up mock for offline state
            mockIsConnected = false;
            
            // Queue some actions
            const action1 = { type: 'ACTION_1' };
            const action2 = { type: 'ACTION_2' };
            await stateSyncService.dispatch(action1);
            await stateSyncService.dispatch(action2);
            
            // Go back online
            mockIsConnected = true;
            
            // Replay queued actions
            await stateSyncService.replayQueuedActions();
            
            // Check if actions were replayed
            sinon.assert.calledWith(mockEmit, 'action', action1, sinon.match.func);
            sinon.assert.calledWith(mockEmit, 'action', action2, sinon.match.func);
            expect(stateSyncService.pendingActions).to.have.length(0);
        });
    });
    
    describe('reconnection handling', () => {
        it('should handle reconnection by requesting full state', async () => {
            // Mock the requestFullState method
            const requestFullStateStub = sandbox.stub(stateSyncService, 'requestFullState').resolves();
            
            // Trigger reconnect
            const reconnectHandler = mockOn.getCalls().find(call => call.args[0] === 'reconnect')?.args[1];
            await reconnectHandler();
            
            // Check if full state was requested
            sinon.assert.calledOnce(requestFullStateStub);
        });
    });
    
    describe('utility methods', () => {
        it('should merge states correctly', () => {
            const base = { a: { b: 1, c: 2 }, d: 3 };
            const update = { a: { b: 2 }, e: 4 };
            
            const result = stateSyncService.mergeStates(base, update);
            
            expect(result).to.deep.equal({
                a: { b: 2, c: 2 },
                d: 3,
                e: 4
            });
        });
    });
    
    describe('handleGameUpdate', () => {
        it('should update state with full update', () => {
            const update = { ...initialState, _fullUpdate: true };
            stateSyncService.handleGameUpdate(update);
            
            const currentState = stateSyncService.getState();
            expect(currentState.gameId).to.equal(initialState.gameId);
            expect(currentState.gamePhase).to.equal(initialState.gamePhase);
            expect(currentState.players).to.deep.equal(initialState.players);
        });
        
        it('should merge partial updates', () => {
            const partialUpdate = { gamePhase: 'PLAYING' };
            stateSyncService.handleGameUpdate(partialUpdate);
            
            const currentState = stateSyncService.getState();
            expect(currentState.gamePhase).to.equal('PLAYING');
        });
    });
    
    describe('dispatch', () => {
        it('should send action when online', async () => {
            const action = { type: 'TEST_ACTION', payload: { test: true } };
            mockSocket.emit.resolves({});
            
            await stateSyncService.dispatch(action);
            
            sinon.assert.calledWith(mockSocket.emit, 'action', action);
        });
        
        it('should queue action when offline', () => {
            mockSocket.connected = false;
            const action = { type: 'TEST_ACTION', payload: { test: true } };
            
            stateSyncService.dispatch(action);
            
            expect(stateSyncService.pendingActions).to.include(action);
        });
    });
    
    describe('handleReconnect', () => {
        it('should replay queued actions on reconnect', async () => {
            // Queue some actions
            stateSyncService.pendingActions = [
                { type: 'TEST_ACTION_1', payload: { data: 'test1' } },
                { type: 'TEST_ACTION_2', payload: { data: 'test2' } }
            ];
            
            mockSocket.connected = true;
            mockSocket.emit.resolves({});
            
            await stateSyncService.handleReconnect();
            
            sinon.assert.calledTwice(mockSocket.emit);
            expect(stateSyncService.pendingActions).to.have.length(0);
        });
        
        it('should request full state if no queued actions', async () => {
            stateSyncService.pendingActions = [];
            const requestFullStateStub = sandbox.stub(stateSyncService, 'requestFullState').resolves();
            
            await stateSyncService.handleReconnect();
            
            sinon.assert.calledOnce(requestFullStateStub);
        });
    });
    
    describe('subscriptions', () => {
        it('should notify subscribers of state changes', () => {
            const subscriber = sandbox.stub();
            stateSyncService.subscribe(subscriber);
            
            stateSyncService.handleGameUpdate({ gamePhase: 'PLAYING' });
            
            sinon.assert.calledWith(subscriber, sinon.match({
                gamePhase: 'PLAYING'
            }));
        });
    });
    
    describe('mergeStates', () => {
        it('should merge nested objects correctly', () => {
            const base = { a: { b: 1, c: 2 }, d: 3 };
            const update = { a: { b: 2 }, e: 4 };
            
            const result = stateSyncService.mergeStates(base, update);
            
            expect(result).to.deep.equal({
                a: { b: 2, c: 2 },
                d: 3,
                e: 4
            });
            
            // Should preserve all players
            expect(merged.players.p1).toEqual({ name: 'Alice', score: 5 });
            expect(merged.players.p2).toEqual({ name: 'Bob', score: 0 });
            expect(merged.players.p3).toEqual({ name: 'Charlie', score: 0 });
            
            // Should update scores correctly
            expect(merged.scores).toEqual({ team1: 2, team2: 0 });
            
            // Should preserve other properties
            expect(merged.gameId).toBe('test');
        });
    });
});
