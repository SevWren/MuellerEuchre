/**
 * @file orderUpPhase.unit.test.js - Unit tests for the OrderUpPhase module
 * @module test/orderUpPhase.unit
 * @description Comprehensive test suite for the order-up phase functionality in the Euchre game.
 * Tests cover the complete order-up phase workflow including:
 * - Initial order-up decisions
 * - Dealer's discard phase
 * - Second round of calling trump
 * - Edge cases and invalid operations
 * 
 * @requires chai
 * @requires ../src/game/phases/orderUpPhase.js
 * @requires ../src/config/constants.js
 * @requires assert
 * @see {@link module:src/game/phases/orderUpPhase} for the implementation being tested
 */

import {  
    handleOrderUpDecision, 
    handleDealerDiscard, 
    handleCallTrumpDecision 
 } from '../src/game/phases/orderUpPhase.js';

import {  GAME_PHASES  } from '../src/config/constants.js';
import assert from "assert";

/**
 * @description Test suite for the Order Up Phase of the Euchre game.
 * This phase handles the process where players decide whether to 'order up' the face-up card
 * as the trump suit or pass the decision to the next player.
 */
describe('Order Up Phase', function() {
    /** @type {Object} gameState - The game state object used across tests */
    let gameState;
    
    /**
     * @description Sets up a fresh game state before each test case.
     * Initializes player order, dealer, current phase, and other essential game state properties.
     */
    beforeEach(() => {
        // Setup a basic game state for testing with default values
        gameState = {
            playerOrder: ['north', 'east', 'south', 'west'],
            dealer: 'south',
            currentPlayer: 'east', // First to act is left of dealer
            currentPhase: GAME_PHASES.ORDER_UP_ROUND1,
            upCard: { suit: 'hearts', rank: 'J' },
            kitty: [{ suit: 'diamonds', rank: '9' }], // Example card in kitty
            players: {
                north: { hand: [] },
                east: { hand: [] },
                south: { hand: [] },
                west: { hand: [] }
            },
            messages: []
        };
    });

    /**
     * @description Test suite for the handleOrderUpDecision function.
     * Tests the behavior when players decide to order up the face-up card or pass.
     */
    describe('handleOrderUpDecision', function() {
        /**
         * @test {handleOrderUpDecision}
         * @description Verifies that when a player orders up, the game state is updated correctly
         * with the trump suit, maker team, and transitions to the dealer discard phase.
         */
        it('should handle a player ordering up', function() {
            const result = handleOrderUpDecision(gameState, 'east', true);
            
            // Should set trump and maker team
            assert.strictEqual(result.trumpSuit, 'hearts');
            assert.strictEqual(result.makerTeam, 'east+west');
            assert.strictEqual(result.playerWhoCalledTrump, 'east');
            
            // Should move to dealer discard phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.AWAITING_DEALER_DISCARD);
            assert.strictEqual(result.currentPlayer, 'south'); // Dealer's turn to discard
            
            // Should have added the up card to dealer's hand
            assert.strictEqual(result.players.south.hand.length, 1);
            assert.deepStrictEqual(result.players.south.hand[0], { suit: 'hearts', rank: 'J' });
            
            // Should have added appropriate messages
            assert.ok(result.messages.some(m => m.text.includes('east ordered up')));
            assert.ok(result.messages.some(m => m.text.includes('Trump is hearts')));
        });
        
        /**
         * @test {handleOrderUpDecision}
         * @description Verifies that when a player passes, the turn moves to the next player
         * and the order-up phase continues.
         */
        it('should handle a player passing', function() {
            const result = handleOrderUpDecision(gameState, 'east', false);
            
            // Should move to next player
            assert.strictEqual(result.currentPlayer, 'south');
            assert.strictEqual(result.currentPhase, GAME_PHASES.ORDER_UP_ROUND1);
            
            // Should have added appropriate message
            assert.ok(result.messages.some(m => m.text.includes('east passed')));
        });
        
/**
         * @test {handleOrderUpDecision}
         * @description Verifies that when all players pass in the first round,
         * the game correctly transitions to the second round of calling trump.
         */
        it('should handle dealer passing and start round 2', function() {
            // First east passes
            let result = handleOrderUpDecision(gameState, 'east', false);
            // Then south passes
            result = handleOrderUpDecision(result, 'south', false);
            // Then west passes
            result = handleOrderUpDecision(result, 'west', false);
            // Then north (dealer) passes - should start round 2
            result = handleOrderUpDecision(result, 'north', false);
            
            // Should move to round 2 with east as first to act
            assert.strictEqual(result.currentPlayer, 'east');
            assert.strictEqual(result.currentPhase, GAME_PHASES.ORDER_UP_ROUND2);
            
            // Should have added appropriate message
            assert.ok(result.messages.some(m => m.text.includes('Starting Round 2')));
        });
    });

    /**
     * @description Test suite for the handleDealerDiscard function.
     * Tests the dealer's card discard phase that occurs after a player orders up.
     */
    describe('handleDealerDiscard', function() {
        /**
         * @description Sets up the game state after a player has ordered up,
         * preparing for the dealer's discard phase.
         */
        beforeEach(() => {
            // Set up state after someone ordered up
            gameState = handleOrderUpDecision(gameState, 'east', true);
        });
        
        /**
         * @test {handleDealerDiscard}
         * @description Verifies that when the dealer discards a card, it is removed
         * from their hand, added to the kitty, and the game transitions to the go-alone phase.
         */
        it('should handle dealer discarding a card', function() {
            // Add some cards to dealer's hand (including the up card that was added)
            gameState.players.south.hand = [
                { suit: 'hearts', rank: 'J' }, // Up card that was added
                { suit: 'clubs', rank: '9' },
                { suit: 'diamonds', rank: '10' },
                { suit: 'spades', rank: 'Q' },
                { suit: 'hearts', rank: '10' },
                { suit: 'clubs', rank: 'K' }
            ];
            
            const cardToDiscard = { suit: 'clubs', rank: '9' };
            const result = handleDealerDiscard(gameState, 'south', cardToDiscard);
            
            // Should have removed the discarded card from hand
            assert.strictEqual(result.players.south.hand.length, 5);
            assert.ok(!result.players.south.hand.some(c => 
                c.suit === cardToDiscard.suit && c.rank === cardToDiscard.rank
            ));
            
            // Should have added the card to the kitty
            assert.strictEqual(result.kitty.length, 2);
            assert.ok(result.kitty.some(c => 
                c.suit === cardToDiscard.suit && c.rank === cardToDiscard.rank
            ));
            
            // Should move to go alone phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.AWAITING_GO_ALONE);
            assert.strictEqual(result.currentPlayer, 'east'); // Player who called trump
        });
    });

    /**
     * @description Test suite for the handleCallTrumpDecision function.
     * Tests the second round of calling trump when all players pass in the first round.
     */
    describe('handleCallTrumpDecision', function() {
        /**
         * @description Sets up the game state for the second round of calling trump.
         */
        beforeEach(() => {
            // Set up state for round 2
            gameState.currentPhase = GAME_PHASES.ORDER_UP_ROUND2;
            gameState.currentPlayer = 'east';
        });
        
        /**
         * @test {handleCallTrumpDecision}
         * @description Verifies that when a player calls trump in the second round,
         * the game state is updated with the new trump suit and transitions to the go-alone phase.
         */
        it('should handle a player calling trump', function() {
            const result = handleCallTrumpDecision(gameState, 'east', 'spades');
            
            // Should set trump and maker team
            assert.strictEqual(result.trumpSuit, 'spades');
            assert.strictEqual(result.makerTeam, 'east+west');
            assert.strictEqual(result.playerWhoCalledTrump, 'east');
            
            // Should move to go alone phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.AWAITING_GO_ALONE);
            assert.strictEqual(result.currentPlayer, 'east');
            
            // Should have added appropriate message
            assert.ok(result.messages.some(m => m.text.includes('east called spades as trump')));
        });
        
        /**
         * @test {handleCallTrumpDecision}
         * @description Verifies that the game prevents a player from calling the
         * same suit that was turned down in the first round.
         */
        it('should prevent calling the turned-down suit', function() {
            // The turned-down suit is 'diamonds' (from kitty[0] in beforeEach)
            assert.throws(
                () => handleCallTrumpDecision(gameState, 'east', 'diamonds'),
                /Cannot call the suit of the turned-down card/
            );
        });
        
        /**
         * @test {handleCallTrumpDecision}
         * @description Verifies that when all players pass in the second round,
         * the game triggers a redeal by moving to the between-hands phase.
         */
        it('should handle all players passing and trigger redeal', function() {
            // East passes
            let result = handleCallTrumpDecision(gameState, 'east', null);
            // South passes
            result = handleCallTrumpDecision(result, 'south', null);
            // West passes
            result = handleCallTrumpDecision(result, 'west', null);
            // North (dealer) passes - should trigger redeal
            result = handleCallTrumpDecision(result, 'north', null);
            
            // Should move to between hands phase for redeal
            assert.strictEqual(result.currentPhase, GAME_PHASES.BETWEEN_HANDS);
            
            // Should have added appropriate message
            assert.ok(result.messages.some(m => m.text.includes('Everyone passed. Redealing')));
        });
    });
});
