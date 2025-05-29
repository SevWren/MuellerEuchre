/**
 * @file server3.dealerDiscard.test.js - Test suite for Euchre server dealer discard functionality
 * @module test/server3.dealerDiscard
 * @description Comprehensive test suite for the dealer discard functionality in the Euchre game.
 * Ensures that the server correctly handles the dealer's discard phase by:
 * - Validating discard attempts
 * - Enforcing game rules during the discard phase
 * - Updating game state appropriately
 * - Emitting correct events to clients
 * 
 * @requires assert
 * @requires chai
 * @requires ../server3.mjs
 * @see {@link module:server3} for the implementation being tested
 */

import assert from 'assert';
import { expect } from 'chai';
import sinon from 'sinon';
import * as server3Module from '../../server3.mjs';

describe('Euchre Server Dealer Discard Functions', function() {
    /** @type {Object} server - The server instance being tested */
    let server;
    
    /** @type {Object} gameState - The game state object used in tests */
    let gameState;
    
    /** @type {Array} emittedMessages - Tracks messages emitted during tests */
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
        
        // Create server instance and inject mocks
        server = Object.create(server3Module);
        server.io = ioMock;
        server.gameState = {
            gamePhase: 'LOBBY',
            playerSlots: ['south', 'west', 'north', 'east'],
            players: {
                south: {},  // Initialize south player object
                west: {},   // Initialize west player object
                north: {},  // Initialize north player object
                east: {}    // Initialize east player object
            },
            messages: [],
            team1Score: 0,
            team2Score: 0,
            currentTrickPlays: [],
            tricksWon: { team1: 0, team2: 0 }
        };
        
        // Initialize gameState reference
        gameState = server.gameState;
    });

    /**
     * @description Test suite for the handleDealerDiscard function.
     * Tests various scenarios for the dealer discard functionality.
     */
    describe('handleDealerDiscard', function() {
        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server rejects discard attempts
         * when the game is not in the AWAITING_DEALER_DISCARD phase.
         */
        it('should reject discard when not in AWAITING_DEALER_DISCARD phase', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south = {
                id: 'fakeSocketId',
                hand: [{ id: 1, suit: 'hearts', value: 'A' }]
            };
            const result = server.handleDealerDiscard('south', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(result, false);
            assert.strictEqual(gameState.dealerHasDiscarded, undefined);
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server rejects discard attempts
         * from players who are not the current dealer.
         */
        it('should reject discard from non-dealer player', function() {
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.north = {
                id: 'fakeSocketId',
                hand: [{ id: 1, suit: 'hearts', value: 'A' }]
            };
            const result = server.handleDealerDiscard('north', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(result, false);
            assert.strictEqual(gameState.dealerHasDiscarded, undefined);
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server enforces the rule that the dealer
         * must have exactly 6 cards before discarding one.
         */
        it('should reject discard when hand size is not 6', function() {
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south = {
                id: 'fakeSocketId',
                name: 'Player 1',
                hand: [
                    { id: 1, suit: 'hearts', value: 'A' },
                    { id: 2, suit: 'hearts', value: 'K' },
                    { id: 3, suit: 'hearts', value: 'Q' },
                    { id: 4, suit: 'hearts', value: 'J' },
                    { id: 5, suit: 'hearts', value: '10' }
                ]
            };
            const result = server.handleDealerDiscard('south', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(result, false);
            assert.strictEqual(
                emittedMessages.some(m => m.event === 'action_error' && m.message === 'Dealer must have exactly 6 cards to discard'),
                true
            );
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that a valid dealer discard is processed correctly,
         * updating the game state and transitioning to the next phase.
         */
        it('should successfully process valid dealer discard', function() {
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.playerWhoCalledTrump = 'west';
            gameState.kitty = [];
            gameState.players.south = {
                id: 'fakeSocketId',
                name: 'Player 1',
                hand: [
                    { id: 1, suit: 'hearts', value: 'A' },
                    { id: 2, suit: 'hearts', value: 'K' },
                    { id: 3, suit: 'hearts', value: 'Q' },
                    { id: 4, suit: 'hearts', value: 'J' },
                    { id: 5, suit: 'hearts', value: '10' },
                    { id: 6, suit: 'hearts', value: '9' }
                ]
            };
            gameState.players.west = {
                name: 'Player 2'
            };

            const result = server.handleDealerDiscard('south', { id: 6, suit: 'hearts', value: '9' });
            assert.strictEqual(result, true);
            assert.strictEqual(gameState.dealerHasDiscarded, true);
            assert.strictEqual(gameState.gamePhase, 'AWAITING_GO_ALONE');
            assert.strictEqual(gameState.currentPlayer, 'west');
            assert.strictEqual(gameState.kitty.length, 1);
            assert.strictEqual(gameState.players.south.hand.length, 5);
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server prevents the dealer from discarding
         * a card that is not in their hand.
         */
        it('should reject discard of card not in hand', function() {
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south = {
                id: 'fakeSocketId',
                name: 'Player 1',
                hand: [
                    { id: 1, suit: 'hearts', value: 'A' },
                    { id: 2, suit: 'hearts', value: 'K' },
                    { id: 3, suit: 'hearts', value: 'Q' },
                    { id: 4, suit: 'hearts', value: 'J' },
                    { id: 5, suit: 'hearts', value: '10' },
                    { id: 6, suit: 'hearts', value: '9' }
                ]
            };
            
            const result = server.handleDealerDiscard('south', { id: 7, suit: 'hearts', value: '8' });
            assert.strictEqual(result, false);
            assert.strictEqual(emittedMessages.some(m => m.event === 'action_error'), true);
            assert.strictEqual(gameState.players.south.hand.length, 6);
        });
    });
});
