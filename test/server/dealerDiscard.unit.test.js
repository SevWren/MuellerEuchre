import assert from 'assert';

// Verify if we should remove these unused imports
//import { expect } from 'chai';
//import sinon from 'sinon';

import { handleDealerDiscard } from '../../src/game/phases/biddingPhase.js';
import {
    CardNotInHandError,
    InvalidPhaseError,
    NotPlayersTurnError,
    InvalidDiscardError
} from '../../src/game/logic/errors.js';


describe('Euchre Server Dealer Discard Functions', function() {
    /** @type {Object} gameState - The game state object */
    let gameState;

    /**
     * @description Before each test, reset the test environment and set up mocks.
     * Initializes a clean server instance with a mocked socket.io interface.
     */
    beforeEach(async () => {
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
            gameMessages: [],
            turnCard: null, // Added as per rework plan
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
            gameState.players.south.hand = [{ id: 'H1A', suit: 'hearts', value: 'A' }]; // Card ID as string
            gameState.turnCard = { id: 'D1K', suit: 'diamonds', value: 'K' }; // Example turn card

            // Execute and Verify
            assert.throws(() => {
                handleDealerDiscard(gameState, 'south', 'H1A');
            }, InvalidPhaseError, 'Should throw InvalidPhaseError for wrong phase');
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
            gameState.currentPlayer = 'south'; // Current player is dealer
            gameState.players.north.hand = [{ id: 'H1A', suit: 'hearts', value: 'A' }];
            gameState.turnCard = { id: 'D1K', suit: 'diamonds', value: 'K' };


            // Execute and Verify
            assert.throws(() => {
                handleDealerDiscard(gameState, 'north', 'H1A'); // Attempt by 'north'
            }, NotPlayersTurnError, 'Should throw NotPlayersTurnError for non-dealer player');
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server enforces the rule that the dealer
         * must have exactly 6 cards (after picking up the turn card) before discarding one.
         */
        it('should reject discard when hand size is not 6 (after including turnCard)', function() {
            // Setup test
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.turnCard = { id: 'C1A', suit: 'clubs', value: 'A' }; // Turn card to be picked up
            gameState.players.south.hand = [ // Hand currently has 4 cards, + turn card = 5
                { id: 'H1A', suit: 'hearts', value: 'A' },
                { id: 'H1K', suit: 'hearts', value: 'K' },
                { id: 'H1Q', suit: 'hearts', value: 'Q' },
                { id: 'H1J', suit: 'hearts', value: 'J' },
            ];
            
            // Execute and Verify
            assert.throws(() => {
                handleDealerDiscard(gameState, 'south', 'H1A');
            }, InvalidDiscardError, 'Should throw InvalidDiscardError for invalid hand size');
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that a valid dealer discard is processed correctly,
         * updating the game state and transitioning to the next phase.
         */
        it('should successfully process valid dealer discard', function() {
            // Setup test
            const turnCardToPickup = { id: 'S19', suit: 'spades', value: '9' };
            gameState = {
                ...gameState, // Spread previous default gameState
                gamePhase: 'AWAITING_DEALER_DISCARD',
                dealer: 'south',
                currentPlayer: 'south',
                playerWhoCalledTrump: 'west', // west ordered up south (dealer)
                turnCard: turnCardToPickup,
                players: {
                    ...gameState.players,
                    south: {
                        id: 'south-1',
                        name: 'Player 1',
                        hand: [ // Dealer's hand before picking up turnCard (5 cards)
                            { id: 'H1A', suit: 'hearts', value: 'A' },
                            { id: 'H1K', suit: 'hearts', value: 'K' },
                            { id: 'H1Q', suit: 'hearts', value: 'Q' },
                            { id: 'H1J', suit: 'hearts', value: 'J' },
                            { id: 'H1T', suit: 'hearts', value: '10' },
                        ]
                    },
                    west: { id: 'west-1', name: 'Player 2', hand: [] },
                    north: { id: 'north-1', name: 'Player 3', hand: [] },
                    east: { id: 'east-1', name: 'Player 4', hand: [] }
                },
                dealerHasDiscarded: false // Ensure this is false before the operation
            };
            
            const cardToDiscardId = 'H1T'; // Dealer discards '10 of Hearts'

            // Execute
            const nextGameState = handleDealerDiscard(gameState, 'south', cardToDiscardId);
            
            // Verify
            assert.ok(nextGameState, 'Should return a new game state object');
            assert.strictEqual(nextGameState.dealerHasDiscarded, true, 'dealerHasDiscarded should be set to true');
            assert.strictEqual(nextGameState.gamePhase, 'GOING_ALONE_DECISION', 'Should move to GOING_ALONE_DECISION phase');
            assert.strictEqual(nextGameState.currentPlayer, 'west', 'Current player should be set to player who called trump');
            assert.strictEqual(nextGameState.players.south.hand.length, 5, 'Dealer should have 5 cards after discard');
            assert.ok(nextGameState.players.south.hand.some(card => card.id === turnCardToPickup.id), 'Dealer hand should contain the picked up turnCard');
            assert.ok(!nextGameState.players.south.hand.some(card => card.id === cardToDiscardId), 'Dealer hand should not contain the discarded card');
            assert.strictEqual(nextGameState.turnCard, null, 'turnCard should be null in the new state');
            // Kitty check is removed as per rework plan: "The concept of a kitty being explicitly updated... is not present"
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
            gameState.turnCard = { id: 'S1A', suit: 'spades', value: 'A' }; // Turn card
            gameState.players.south.hand = [ // Hand has 5 cards, + turn card = 6
                { id: 'H1A', suit: 'hearts', value: 'A' },
                { id: 'H1K', suit: 'hearts', value: 'K' },
                { id: 'H1Q', suit: 'hearts', value: 'Q' },
                { id: 'H1J', suit: 'hearts', value: 'J' },
                { id: 'H1T', suit: 'hearts', value: '10' },
            ];
            const cardNotInHandId = 'D1K'; // Diamond King is not in hand

            // Execute and Verify
            assert.throws(() => {
                handleDealerDiscard(gameState, 'south', cardNotInHandId);
            }, CardNotInHandError, 'Should throw CardNotInHandError for card not in hand');
            
            // Original gameState should be unchanged by the failed attempt
            assert.strictEqual(gameState.players.south.hand.length, 5, 'Hand size should remain unchanged');
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });
    });
});
