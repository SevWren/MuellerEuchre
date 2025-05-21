import { jest } from '@jest/globals';
import StateSyncService from '../src/client/services/stateSyncService.js';
import { GAME_EVENTS } from '../src/config/constants.js';

// Mock the logger
jest.mock('../src/utils/logger.js', () => ({
    log: jest.fn()
}));

describe('StateSyncService', () => {
    let mockSocketService;
    let stateSyncService;
    
    // Mock game states
    const initialState = {
        gameId: 'test-game',
        gamePhase: 'LOBBY',
        players: {
            player1: { id: 'player1', name: 'Alice', hand: [] },
            player2: { id: 'player2', name: 'Bob', hand: [] }
        },
        scores: { team1: 0, team2: 0 }
    };
    
    const updatedState = {
        gamePhase: 'PLAYING',
        currentPlayer: 'player1',
        players: {
            player1: { id: 'player1', name: 'Alice', hand: ['2H', '3H'] },
            player2: { id: 'player2', name: 'Bob', hand: [] }
        },
        scores: { team1: 2, team2: 1 }
    };
    
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        
        // Create a mock socket service
        mockSocketService = {
            on: jest.fn(),
            off: jest.fn(),
            send: jest.fn(),
            connected: true,
            id: 'test-socket-id'
        };
        
        // Create a new instance for each test
        stateSyncService = new StateSyncService(mockSocketService);
        stateSyncService.initialize();
    });
    
    describe('initialization', () => {
        it('should set up event listeners', () => {
            expect(mockSocketService.on).toHaveBeenCalledWith(
                GAME_EVENTS.STATE_UPDATE,
                expect.any(Function)
            );
            expect(mockSocketService.on).toHaveBeenCalledWith(
                'reconnect',
                expect.any(Function)
            );
            expect(mockSocketService.on).toHaveBeenCalledWith(
                'disconnect',
                expect.any(Function)
            );
        });
    });
    
    describe('handleGameUpdate', () => {
        it('should update state with full update', () => {
            const fullUpdate = { ...initialState, _fullUpdate: true };
            stateSyncService.handleGameUpdate(fullUpdate);
            
            const currentState = stateSyncService.getState();
            expect(currentState).toEqual(initialState);
        });
        
        it('should merge partial updates', () => {
            // Initial state
            stateSyncService.currentState = { ...initialState };
            
            // Partial update
            const partialUpdate = { gamePhase: 'PLAYING', currentPlayer: 'player1' };
            stateSyncService.handleGameUpdate(partialUpdate);
            
            const currentState = stateSyncService.getState();
            expect(currentState.gamePhase).toBe('PLAYING');
            expect(currentState.currentPlayer).toBe('player1');
            expect(currentState.players).toEqual(initialState.players);
        });
    });
    
    describe('dispatch', () => {
        it('should send action when online', async () => {
            mockSocketService.send.mockResolvedValue('success');
            
            const result = await stateSyncService.dispatch('testAction', { data: 'test' });
            
            expect(mockSocketService.send).toHaveBeenCalledWith('testAction', { data: 'test' });
            expect(result).toBe('success');
        });
        
        it('should queue action when offline', async () => {
            mockSocketService.connected = false;
            
            await expect(stateSyncService.dispatch('testAction', { data: 'test' }))
                .rejects.toThrow('Offline: Action queued for later');
                
            expect(stateSyncService.pendingActions).toHaveLength(1);
            expect(stateSyncService.pendingActions[0].event).toBe('testAction');
        });
    });
    
    describe('handleReconnect', () => {
        it('should replay queued actions on reconnect', async () => {
            // Queue some actions
            stateSyncService.pendingActions = [
                { event: 'action1', args: [{ data: 'test1' }] },
                { event: 'action2', args: [{ data: 'test2' }] }
            ];
            
            // Mock the socket service to resolve successfully
            mockSocketService.send.mockResolvedValue('success');
            
            // Trigger reconnect
            await stateSyncService.handleReconnect();
            
            // Should have replayed both actions
            expect(mockSocketService.send).toHaveBeenCalledTimes(2);
            expect(mockSocketService.send).toHaveBeenCalledWith('action1', { data: 'test1' });
            expect(mockSocketService.send).toHaveBeenCalledWith('action2', { data: 'test2' });
            
            // Queue should be empty now
            expect(stateSyncService.pendingActions).toHaveLength(0);
        });
        
        it('should request full state if no queued actions', async () => {
            // Mock the requestFullState method
            const requestFullStateSpy = jest.spyOn(stateSyncService, 'requestFullState')
                .mockResolvedValue();
            
            // Trigger reconnect with empty queue
            await stateSyncService.handleReconnect();
            
            expect(requestFullStateSpy).toHaveBeenCalled();
        });
    });
    
    describe('subscriptions', () => {
        it('should notify subscribers of state changes', () => {
            const callback = jest.fn();
            
            // Subscribe to state changes
            const unsubscribe = stateSyncService.subscribe('stateChange', callback);
            
            // Trigger a state change
            stateSyncService.handleGameUpdate({ ...initialState, _fullUpdate: true });
            
            // Should have been called with the new state
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                gameId: 'test-game',
                gamePhase: 'LOBBY'
            }));
            
            // Unsubscribe and verify no more notifications
            callback.mockClear();
            unsubscribe();
            
            stateSyncService.handleGameUpdate({ gamePhase: 'PLAYING' });
            expect(callback).not.toHaveBeenCalled();
        });
    });
    
    describe('mergeStates', () => {
        it('should merge nested objects correctly', () => {
            const current = {
                gameId: 'test',
                players: {
                    p1: { name: 'Alice', score: 0 },
                    p2: { name: 'Bob', score: 0 }
                },
                scores: { team1: 0, team2: 0 }
            };
            
            const update = {
                players: {
                    p1: { score: 5 },
                    p3: { name: 'Charlie', score: 0 }
                },
                scores: { team1: 2 }
            };
            
            const merged = stateSyncService.mergeStates(current, update);
            
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
