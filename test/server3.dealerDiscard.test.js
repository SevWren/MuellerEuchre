/**
 * @file server3.dealerDiscard.test.js - Tests for dealer discard functionality in Euchre
 * @module Server3DealerDiscardTest
 * @description 
 * This test suite verifies the dealer discard phase in the Euchre game.
 * It ensures that the dealer can properly discard and pick up the top card.
 * 
 * Test Coverage Includes:
 * - Dealer discard validation
 * - Card pickup mechanics
 * - Game state after discard
 * - Edge cases in discard phase
 * 
 * @version 1.0.0
 * @since 2024-01-01
 * @license MIT
 * @see {@link ../../src/server3.mjs|Server3 Module}
 * 
 * @requires chai - Assertion library
 * @requires sinon - Test spies, stubs and mocks
 * @requires proxyquire - Module dependency injection
 * @requires buffer - For Buffer operations
 * @requires assert
 * @requires proxyquire
 * @see {@link module:server3} for the implementation being tested
 */


import assert from "assert";
import proxyquire from "proxyquire";

/**
 * @description Test suite for the Dealer Discard functionality in the Euchre server.
 * This suite verifies the server's handling of the dealer discard phase, where the dealer
 * must discard one card after the order-up phase.
 */
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
    beforeEach(() => {
        emittedMessages = [];
        const fakeSocket = {
            emit: (event, message) => {
                emittedMessages.push({ event, message });
            },
            on: () => {},
            id: 'fakeSocketId'
        };
        const ioMock = function() {
            return {
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
        };

        server = proxyquire('../server3', {
            fs: { appendFileSync: () => {} },
            'socket.io': ioMock
        });
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
            server.handleDealerDiscard('south', { id: 1, suit: 'hearts', value: 'A' });
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
            server.handleDealerDiscard('north', { id: 1, suit: 'hearts', value: 'A' });
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
            server.handleDealerDiscard('south', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(emittedMessages.some(m => m.event === 'action_error'), true);
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

            server.handleDealerDiscard('south', { id: 6, suit: 'hearts', value: '9' });
            
            assert.strictEqual(gameState.dealerHasDiscarded, true);
            assert.strictEqual(gameState.gamePhase, 'AWAITING_GO_ALONE');
            assert.strictEqual(gameState.currentPlayer, 'west');
            assert.strictEqual(gameState.kitty.length, 1);
            assert.strictEqual(gameState.players.south.hand.length, 5);
            assert.strictEqual(gameState.kitty[0].id, 6);
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
            
            server.handleDealerDiscard('south', { id: 7, suit: 'hearts', value: '8' });
            assert.strictEqual(emittedMessages.some(m => m.event === 'action_error'), true);
            assert.strictEqual(gameState.players.south.hand.length, 6);
        });
    });
});
