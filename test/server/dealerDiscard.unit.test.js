/**
 * @file dealerDiscard.unit.test.js - Unit tests for Euchre server dealer discard functionality
 * @module test/server/dealerDiscard.unit
 * @description 
 * Comprehensive test suite for the dealer discard functionality in the Euchre game server.
 * 
 * These tests verify that the server correctly handles the dealer's discard phase by:
 * - Validating discard attempts against game state
 * - Enforcing game rules (6-card hand requirement, dealer-only actions)
 * - Maintaining game state integrity during discards
 * - Properly handling error conditions and edge cases
 * - Emitting appropriate events to clients
 * 
 * Test Cases:
 * - Rejects discard when not in AWAITING_DEALER_DISCARD phase
 * - Rejects discard from non-dealer player
 * - Validates dealer has exactly 6 cards before discard
 * - Successfully processes valid dealer discard
 * - Rejects discard of card not in dealer's hand
 * 
 * @requires assert - Node.js assertion library
 * @requires chai - BDD/TDD assertion library
 * @requires sinon - Test spies, stubs and mocks
 * @requires ../../server3.mjs - Server implementation being tested
 * @see {@link module:server3} for the implementation being tested
 * @see {@link handleDealerDiscard} for the main function under test
 * @since 1.0.0
 */

import assert from 'assert';

// Remove these unused imports
//import { expect } from 'chai';
//import sinon from 'sinon';
import * as server3Module from '../../server3.mjs';

// Debug configuration
const DEBUG = Object.freeze({
    enabled: process.env.DEBUG_TESTS === 'true',
    log: function(...args) {
        if (this.enabled) {
            console.log('[DEBUG]', ...args);
        }
    },
    error: function(...args) {
        if (this.enabled) {
            console.error('[ERROR]', ...args);
        }
    }
});

// Import after DEBUG is defined to avoid reference error
const { DEBUG_LEVELS } = server3Module;

// Create a closure to store emitted messages
const createMockIo = (emittedMessages) => {
    return {
        to: () => ({
            emit: (event, message) => {
                // Store emitted messages for testing
                emittedMessages.push({ event, message });
            }
        }),
        emit: (event, message) => {
            // Store broadcast messages
            emittedMessages.push({ event, message, broadcast: true });
        },
        in: () => ({
            emit: (event, message) => {
                // Store room messages
                emittedMessages.push({ event, message, room: true });
            }
        })
    };
};

// Create a wrapper for the server module that will use our mock IO
function createServer(emittedMessages) {
    const ioMock = createMockIo(emittedMessages);
    
    return {
        ...server3Module,
        getIo: () => ioMock,
        gameState: null,
        io: ioMock
    };
}

describe('Euchre Server Dealer Discard Functions', function() {
    /** @type {Object} server - The server instance being tested */
    let server;
    
    /** @type {Object} gameState - The game state object */
    let gameState;
    
    /** @type {Object} ioMock - Mock IO instance */
    let ioMock;
    
    /** @type {Array} emittedMessages - Array to store emitted messages for testing */
    let emittedMessages = [];

    /**
     * @description Before each test, reset the test environment and set up mocks.
     * Initializes a clean server instance with a mocked socket.io interface.
     */
    beforeEach(async () => {
        emittedMessages = [];
        const fakeSocket = {
            emit: (event, message) => {
                emittedMessages.push({ event, message });
            },
            on: () => {},
            id: 'fakeSocketId'
        };
        
        // Create mock IO instance
        const ioMock = {
            sockets: {
                sockets: {
                    fakeSocketId: fakeSocket
                }
            },
            to: () => ({ emit: (event, message) => emittedMessages.push({ event, message }) }),
            emit: () => {},
            on: () => {},
            in: () => ({ emit: () => {} })
        };
        
        // Reset emitted messages
        emittedMessages.length = 0;
        
        // Create server instance with our emitted messages array
        server = createServer(emittedMessages);
        
        // Set up the test game state
        server.gameState = gameState;
        
        // Initialize game state with all required properties
        gameState = {
            gamePhase: 'LOBBY',
            playerSlots: ['south', 'west', 'north', 'east'],
            players: {
                south: { id: 'fakeSocketId', name: 'Player 1', hand: [] },
                west: { id: 'fakeSocketId2', name: 'Player 2', hand: [] },
                north: { id: 'fakeSocketId3', name: 'Player 3', hand: [] },
                east: { id: 'fakeSocketId4', name: 'Player 4', hand: [] }
            },
            messages: [],
            team1Score: 0,
            team2Score: 0,
            currentTrickPlays: [],
            tricksWon: { team1: 0, team2: 0 },
            kitty: [],
            dealer: null,
            currentPlayer: null,
            playerWhoCalledTrump: null,
            dealerHasDiscarded: false,
            // Add gameMessages array to prevent undefined errors
            gameMessages: []
        };
        
        // Set the game state on the server
        server.gameState = gameState;
        
        // Store the original function
        const originalHandleDealerDiscard = server.handleDealerDiscard;
        
        // Create a wrapper function that will use our test state
        server.handleDealerDiscard = function(dealerRole, cardToDiscard) {
            // Track emitted messages for this operation
            const messageCount = emittedMessages.length;
            DEBUG.log(`handleDealerDiscard called - dealer: ${dealerRole}, card:`, cardToDiscard);
            
            try {
                // Call the original function with our test's gameState
                const result = originalHandleDealerDiscard.call(this, dealerRole, cardToDiscard, gameState);
                
                DEBUG.log(`handleDealerDiscard completed - result: ${result}`);
                const newMessages = emittedMessages.slice(messageCount);
                if (newMessages.length > 0) {
                    DEBUG.log('Emitted messages:', newMessages);
                }
                
                // If the function failed and no error was emitted, add one
                if (result === false && !newMessages.some(m => m.event === 'action_error')) {
                    const errorMsg = 'An unknown error occurred';
                    emittedMessages.push({
                        event: 'action_error',
                        message: errorMsg,
                        to: gameState.players[dealerRole]?.id
                    });
                    if (getIo() && gameState.players[dealerRole]?.id) {
                        getIo().to(gameState.players[dealerRole].id).emit('action_error', errorMsg);
                    }
                }
                
                return result;
            } catch (error) {
                DEBUG.error('Error in handleDealerDiscard:', error);
                emittedMessages.push({
                    event: 'error',
                    message: error.message,
                    error: error
                });
                throw error;
            }
        };
    });

    /**
     * @description Test suite for the handleDealerDiscard function.
     * Tests various scenarios for the dealer discard functionality.
     */
        /**
         * Test suite for the handleDealerDiscard function.
         * Tests various scenarios for the dealer discard functionality.
         */
    describe('handleDealerDiscard', function() {
        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server rejects discard attempts
         * when the game is not in the AWAITING_DEALER_DISCARD phase.
         */
        it('should reject discard when not in AWAITING_DEALER_DISCARD phase', function() {
            // Setup test
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south.hand = [{ id: 1, suit: 'hearts', value: 'A' }];
            
            // Execute
            const result = server.handleDealerDiscard('south', { id: 1, suit: 'hearts', value: 'A' });
            
            // Verify
            assert.strictEqual(result, false, 'Should return false for wrong phase');
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server rejects discard attempts
         * from players who are not the current dealer.
         */
        it('should reject discard from non-dealer player', function() {
            // Setup test
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.north.hand = [{ id: 1, suit: 'hearts', value: 'A' }];
            
            // Execute
            const result = server.handleDealerDiscard('north', { id: 1, suit: 'hearts', value: 'A' });
            
            // Verify
            assert.strictEqual(result, false, 'Should return false for non-dealer player');
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server enforces the rule that the dealer
         * must have exactly 6 cards before discarding one.
         */
        it('should reject discard when hand size is not 6', function() {
            // Setup test
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'A' },
                { id: 2, suit: 'hearts', value: 'K' },
                { id: 3, suit: 'hearts', value: 'Q' },
                { id: 4, suit: 'hearts', value: 'J' },
                { id: 5, suit: 'hearts', value: '10' }
            ];
            
            // Clear any previous messages
            const messageCount = emittedMessages.length;
            
            // Execute
            const result = server.handleDealerDiscard('south', { id: 1, suit: 'hearts', value: 'A' });
            
            // Get new messages
            const newMessages = emittedMessages.slice(messageCount);
            
            // Verify
            assert.strictEqual(result, false, 'Should return false for invalid hand size');
            assert.ok(
                newMessages.some(m => m.event === 'action_error' && 
                    (m.message.includes('6 cards') || m.message.includes('invalid hand'))),
                'Should show error about needing exactly 6 cards. Got: ' + 
                JSON.stringify(newMessages, null, 2)
            );
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that a valid dealer discard is processed correctly,
         * updating the game state and transitioning to the next phase.
         */
        it('should successfully process valid dealer discard', function() {
            // Setup test
            gameState = {
                gamePhase: 'AWAITING_DEALER_DISCARD',
                dealer: 'south',
                currentPlayer: 'south',
                playerWhoCalledTrump: 'west',
                kitty: [],
                messages: [],
                players: {
                    south: {
                        id: 'south-1',
                        name: 'Player 1',
                        hand: [
                            { id: 1, suit: 'hearts', value: 'A' },
                            { id: 2, suit: 'hearts', value: 'K' },
                            { id: 3, suit: 'hearts', value: 'Q' },
                            { id: 4, suit: 'hearts', value: 'J' },
                            { id: 5, suit: 'hearts', value: '10' },
                            { id: 6, suit: 'hearts', value: '9' }
                        ]
                    },
                    west: {
                        id: 'west-1',
                        name: 'Player 2',
                        hand: []
                    },
                    north: {
                        id: 'north-1',
                        name: 'Player 3',
                        hand: []
                    },
                    east: {
                        id: 'east-1',
                        name: 'Player 4',
                        hand: []
                    }
                },
                playerSlots: ['south', 'west', 'north', 'east'],
                team1Score: 0,
                team2Score: 0,
                currentTrickPlays: [],
                tricksWon: { team1: 0, team2: 0 },
                dealerHasDiscarded: false
            };
            
            // Make sure the server is using our test state
            server.gameState = gameState;
            
            // Execute
            const result = server.handleDealerDiscard('south', { id: 6, suit: 'hearts', value: '9' });
            
            // Verify
            assert.strictEqual(result, true, 'Should return true for successful discard');
            assert.strictEqual(gameState.dealerHasDiscarded, true, 'dealerHasDiscarded should be set to true');
            assert.strictEqual(gameState.gamePhase, 'AWAITING_GO_ALONE', 'Should move to next phase');
            assert.strictEqual(gameState.currentPlayer, 'west', 'Current player should be set to player who called trump');
            assert.strictEqual(gameState.kitty.length, 1, 'Kitty should have one card');
            assert.strictEqual(gameState.players.south.hand.length, 5, 'Dealer should have one less card');
            assert.strictEqual(
                gameState.kitty[0].id, 6,
                'Discarded card should be in the kitty'
            );
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server prevents the dealer from discarding
         * a card that is not in their hand.
         */
        it('should reject discard of card not in hand', function() {
            // Setup test
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'A' },
                { id: 2, suit: 'hearts', value: 'K' },
                { id: 3, suit: 'hearts', value: 'Q' },
                { id: 4, suit: 'hearts', value: 'J' },
                { id: 5, suit: 'hearts', value: '10' },
                { id: 6, suit: 'hearts', value: '9' }
            ];
            
            // Clear any previous messages
            const messageCount = emittedMessages.length;
            
            // Execute
            const result = server.handleDealerDiscard('south', { id: 7, suit: 'hearts', value: '8' });
            
            // Get new messages
            const newMessages = emittedMessages.slice(messageCount);
            
            // Verify
            assert.strictEqual(result, false, 'Should return false for card not in hand');
            assert.ok(
                newMessages.some(m => m.event === 'action_error' && 
                    (m.message.includes('not found') || m.message.includes('not in hand'))),
                'Should show error about card not found in hand. Got: ' + 
                JSON.stringify(newMessages, null, 2)
            );
            assert.strictEqual(gameState.players.south.hand.length, 6, 'Hand size should remain unchanged');
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });
    });
});
