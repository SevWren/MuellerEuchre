/**
 * @file uiIntegrationService.unit.test.js - Unit tests for the UiIntegrationService module
 * @module UiIntegrationServiceUnitTest
 * @description Unit tests for the UiIntegrationService module
 * @requires chai
 * @see ../src/uiIntegrationService.unit.js
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

// Mock logger
const mockLogger = {
    log: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub()
};

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

describe('UIIntegrationService', () => {
    let UIIntegrationService;
    let mockStateSyncService;
    let mockGameUI;
    let uiIntegrationService;
    let sandbox;
    
    // Import the module with mocks
    before(async () => {
        sandbox = sinon.createSandbox();
        
        // Mock DOM elements
        const mockElement = {
            style: {},
            classList: {
                add: sinon.stub(),
                remove: sinon.stub(),
                contains: sinon.stub().returns(false)
            },
            appendChild: sinon.stub(),
            remove: sinon.stub()
        };
        
        // Mock document methods
        const mockDocument = {
            createElement: sinon.stub().returns(mockElement),
            getElementById: sinon.stub().returns(mockElement),
            querySelector: sinon.stub().returns(mockElement),
            querySelectorAll: sinon.stub().returns([mockElement]),
            body: {
                appendChild: sinon.stub(),
                removeChild: sinon.stub()
            },
            addEventListener: sinon.stub(),
            removeEventListener: sinon.stub()
        };
        
        // Mock window object
        const mockWindow = {
            document: mockDocument,
            addEventListener: sinon.stub(),
            removeEventListener: sinon.stub(),
            requestAnimationFrame: (cb) => setTimeout(cb, 0),
            cancelAnimationFrame: (id) => clearTimeout(id)
        };
        
        // Import the module with mocks
        const module = await esmock(
            '../../src/client/services/uiIntegrationService.js',
            {
                'socket.io-client': { io: () => ({}) },
                '../../src/client/services/stateSyncService.js': {
                    default: class StateSyncService {
                        subscribe() {}
                        unsubscribe() {}
                        getState() {}
                        getCurrentPlayerId() {}
                    }
                }
            },
            {
                '../../src/utils/logger.js': { default: mockLogger },
                '../../src/config/constants.js': {
                    GAME_EVENTS: {
                        STATE_UPDATE: 'stateUpdate',
                        PLAYER_JOINED: 'playerJoined',
                        PLAYER_LEFT: 'playerLeft',
                        GAME_STARTED: 'gameStarted',
                        CARD_PLAYED: 'cardPlayed',
                        TRUMP_SELECTED: 'trumpSelected',
                        TRICK_COMPLETED: 'trickCompleted',
                        HAND_COMPLETED: 'handCompleted',
                        GAME_OVER: 'gameOver'
                    }
                }
            }
        );
        
        UIIntegrationService = module.UIIntegrationService;
    });
    
    afterEach(() => {
        sandbox.reset();
        mockLogger.log.resetHistory();
        mockLogger.error.resetHistory();
        mockLogger.debug.resetHistory();
    });
    
    after(() => {
        sandbox.restore();
    });
    
    beforeEach(() => {
        // Reset all stubs
        sandbox.reset();
        
        // Create mock state sync service
        mockStateSyncService = {
            subscribe: sinon.stub(),
            unsubscribe: sinon.stub(),
            getState: sinon.stub().returns(JSON.parse(JSON.stringify(mockState))),
            getCurrentPlayerId: sinon.stub().returns('player1')
        };
        
        // Create mock game UI
        mockGameUI = {
            updateBoard: sinon.stub(),
            updateHands: sinon.stub(),
            updateScores: sinon.stub(),
            updatePlayerInfo: sinon.stub(),
            showLobby: sinon.stub(),
            showDealing: sinon.stub(),
            showBidding: sinon.stub(),
            showPlaying: sinon.stub(),
            showGameOver: sinon.stub()
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
    
    describe('initialize', () => {
        it('should set up event listeners', () => {
            uiIntegrationService.initialize();
            
            sinon.assert.calledWith(mockStateSyncService.subscribe, 'stateChange', sinon.match.func);
            sinon.assert.calledWith(mockStateSyncService.subscribe, 'connectionStatus', sinon.match.func);
        });
        
        it('should create UI elements', () => {
            // Create a fake document for testing
            const fakeDoc = {
                querySelector: sinon.stub()
            };
            fakeDoc.querySelector.withArgs('.connection-indicator').returns({});
            fakeDoc.querySelector.withArgs('.toast-container').returns({});
            
            // Replace the global document for this test
            const originalDocument = global.document;
            global.document = fakeDoc;
            
            uiIntegrationService.initialize();
            
            sinon.assert.calledWith(fakeDoc.querySelector, '.connection-indicator');
            sinon.assert.calledWith(fakeDoc.querySelector, '.toast-container');
            
            // Restore the original document
            global.document = originalDocument;
        });
        
        it('should add styles to the document', () => {
            const fakeDoc = {
                querySelectorAll: sinon.stub().returns([{}, {}])
            };
            
            const originalDocument = global.document;
            global.document = fakeDoc;
            
            uiIntegrationService.initialize();
            
            expect(fakeDoc.querySelectorAll('style')).to.have.length.greaterThan(0);
            
            global.document = originalDocument;
        });
    });
    
    describe('handleStateChange', () => {
        it('should update the game board', () => {
            const testState = JSON.parse(JSON.stringify(mockState));
            uiIntegrationService.handleStateChange(testState);
            
            sinon.assert.calledWith(mockGameUI.updateBoard, sinon.match(testState));
            sinon.assert.calledWith(mockGameUI.updateHands, mockState.players, mockState.currentPlayer);
            sinon.assert.calledWith(mockGameUI.updateScores, mockState.scores);
        });
        
        it('should update player info', () => {
            uiIntegrationService.handleStateChange(mockState);
            
            sinon.assert.calledWith(mockGameUI.updatePlayerInfo, {
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
            sinon.assert.calledOnce(mockGameUI.showLobby);
            
            // Test Dealing phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'DEALING'
            });
            sinon.assert.calledOnce(mockGameUI.showDealing);
            
            // Test Bidding phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'BIDDING'
            });
            sinon.assert.calledOnce(mockGameUI.showBidding);
            
            // Test Playing phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'PLAYING'
            });
            sinon.assert.calledOnce(mockGameUI.showPlaying);
            
            // Test Game Over phase
            uiIntegrationService.handleStateChange({
                ...mockState,
                gamePhase: 'GAME_OVER',
                winner: 'team1'
            });
            sinon.assert.calledOnce(mockGameUI.showGameOver);
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
            
            // Check if the toast was created and shown
            sinon.assert.calledWith(document.createElement, 'div');
            sinon.assert.calledWith(document.body.appendChild, sinon.match.instanceOf(Object));
            
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
