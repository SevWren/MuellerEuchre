import { jest } from '@jest/globals';
import { UIIntegrationService } from '../src/client/services/uiIntegrationService.js';

// Mock the logger
jest.mock('../src/utils/logger.js', () => ({
    log: jest.fn()
}));

describe('UIIntegrationService', () => {
    let mockStateSyncService;
    let mockGameUI;
    let uiIntegrationService;
    
    // Mock game state
    const mockState = {
        gameId: 'test-game',
        gamePhase: 'LOBBY',
        players: {
            player1: { id: 'player1', name: 'Alice', hand: [] },
            player2: { id: 'player2', name: 'Bob', hand: [] }
        },
        currentPlayer: 'player1',
        dealer: 'player1',
        scores: { team1: 0, team2: 0 },
        upCard: { suit: 'hearts', rank: 'A' }
    };
    
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        
        // Create mock state sync service
        mockStateSyncService = {
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
            getState: jest.fn(() => mockState),
            getCurrentPlayerId: jest.fn(() => 'player1')
        };
        
        // Create mock game UI
        mockGameUI = {
            updateBoard: jest.fn(),
            updateHands: jest.fn(),
            updateScores: jest.fn(),
            updatePlayerInfo: jest.fn(),
            showLobby: jest.fn(),
            showDealing: jest.fn(),
            showBidding: jest.fn(),
            showPlaying: jest.fn(),
            showGameOver: jest.fn()
        };
        
        // Create a new instance for each test
        uiIntegrationService = new UIIntegrationService(
            mockStateSyncService,
            mockGameUI
        );
        
        // Mock document methods
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Initialize the service
        uiIntegrationService.initialize();
    });
    
    afterEach(() => {
        // Clean up DOM after each test
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Destroy the service
        uiIntegrationService.destroy();
    });
    
    describe('initialization', () => {
        it('should set up event listeners', () => {
            expect(mockStateSyncService.subscribe).toHaveBeenCalledWith(
                'stateChange',
                expect.any(Function)
            );
            
            expect(mockStateSyncService.subscribe).toHaveBeenCalledWith(
                'connectionStatus',
                expect.any(Function)
            );
        });
        
        it('should create UI elements', () => {
            expect(document.querySelector('.connection-indicator')).not.toBeNull();
            expect(document.querySelector('.toast-container')).not.toBeNull();
        });
        
        it('should add styles to the document', () => {
            const styles = document.querySelectorAll('style');
            expect(styles.length).toBeGreaterThan(0);
        });
    });
    
    describe('handleStateChange', () => {
        it('should update the game board', () => {
            uiIntegrationService.handleStateChange(mockState);
            
            expect(mockGameUI.updateBoard).toHaveBeenCalledWith(mockState);
            expect(mockGameUI.updateHands).toHaveBeenCalledWith(
                mockState.players,
                mockState.currentPlayer
            );
            expect(mockGameUI.updateScores).toHaveBeenCalledWith(mockState.scores);
        });
        
        it('should update player info', () => {
            uiIntegrationService.handleStateChange(mockState);
            
            expect(mockGameUI.updatePlayerInfo).toHaveBeenCalledWith({
                currentPlayer: 'player1',
                dealer: 'player1',
                players: mockState.players
            });
        });
        
        it('should handle different game phases', () => {
            // Test Lobby phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'LOBBY'
            });
            expect(mockGameUI.showLobby).toHaveBeenCalled();
            
            // Test Dealing phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'DEALING'
            });
            expect(mockGameUI.showDealing).toHaveBeenCalled();
            
            // Test Bidding phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'BIDDING'
            });
            expect(mockGameUI.showBidding).toHaveBeenCalled();
            
            // Test Playing phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'PLAYING'
            });
            expect(mockGameUI.showPlaying).toHaveBeenCalled();
            
            // Test Game Over phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'GAME_OVER',
                winner: 'team1'
            });
            expect(mockGameUI.showGameOver).toHaveBeenCalled();
        });
    });
    
    describe('handleConnectionStatus', () => {
        it('should update connection indicator for connected state', () => {
            uiIntegrationService.handleConnectionStatus({
                isConnected: true,
                isReconnecting: false,
                lastError: null
            });
            
            const indicator = document.querySelector('.connection-indicator');
            expect(indicator.className).toContain('connected');
            expect(indicator.title).toBe('Connected to server');
        });
        
        it('should update connection indicator for disconnected state', () => {
            uiIntegrationService.handleConnectionStatus({
                isConnected: false,
                isReconnecting: false,
                lastError: 'Connection lost'
            });
            
            const indicator = document.querySelector('.connection-indicator');
            expect(indicator.className).toContain('disconnected');
            expect(indicator.title).toContain('Connection lost');
        });
        
        it('should show toast notifications', () => {
            // Test reconnecting state
            uiIntegrationService.handleConnectionStatus({
                isConnected: false,
                isReconnecting: true,
                lastError: null
            });
            
            // Test disconnected state
            uiIntegrationService.handleConnectionStatus({
                isConnected: false,
                isReconnecting: false,
                lastError: 'Connection lost'
            });
            
            // Test reconnected state
            uiIntegrationService.handleConnectionStatus({
                isConnected: true,
                isReconnecting: false,
                lastError: 'Connection lost'
            });
            
            // Check that toasts were added to the container
            const toasts = document.querySelectorAll('.toast');
            expect(toasts.length).toBe(3);
        });
    });
    
    describe('showToast', () => {
        it('should create and show a toast notification', () => {
            // Show a toast
            uiIntegrationService.showToast('Test message', 'info', 1000);
            
            // Check that toast was created
            const toast = document.querySelector('.toast');
            expect(toast).not.toBeNull();
            expect(toast.textContent).toBe('Test message');
            expect(toast.className).toContain('toast-info');
            
            // Fast-forward time to check auto-removal
            jest.advanceTimersByTime(1500);
            
            // Check that toast was removed
            expect(document.querySelector('.toast')).toBeNull();
        });
        
        it('should support different toast types', () => {
            const types = ['info', 'success', 'warning', 'error'];
            
            types.forEach(type => {
                uiIntegrationService.showToast('Test', type);
                const toast = document.querySelector(`.toast-${type}`);
                expect(toast).not.toBeNull();
                
                // Clean up for next test
                toast.remove();
            });
        });
    });
    
    describe('cleanup', () => {
        it('should remove event listeners on destroy', () => {
            uiIntegrationService.destroy();
            
            expect(mockStateSyncService.unsubscribe).toHaveBeenCalledWith(
                'stateChange',
                expect.any(Function)
            );
            
            expect(mockStateSyncService.unsubscribe).toHaveBeenCalledWith(
                'connectionStatus',
                expect.any(Function)
            );
            
            // Check that UI elements were removed
            expect(document.querySelector('.connection-indicator')).toBeNull();
            expect(document.querySelector('.toast-container')).toBeNull();
        });
    });
});
