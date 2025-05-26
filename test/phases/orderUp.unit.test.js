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
 * @requires ../../src/game/phases/orderUpPhase.js
 * @requires ../../src/config/constants.js
 * @requires assert
 * @see {@link module:src/game/phases/orderUpPhase} for the implementation being tested
 * @since 0.0.1
 */

import {  
    handleOrderUpDecision, 
    handleDealerDiscard, 
    handleCallTrumpDecision 
 } from '../../src/game/phases/orderUpPhase.js';

import {  GAME_PHASES  } from '../../src/config/constants.js';
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
            playerOrder: ['east', 'south', 'west', 'north'], // Clockwise order starting from left of dealer
            dealer: 'south',
            currentPlayer: 'east', // First to act is left of dealer
            currentPhase: GAME_PHASES.ORDER_UP_ROUND1,
            orderUpRound: 1,
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
            // Set up initial state with dealer as south and current player as east
            gameState.currentPlayer = 'east';
            gameState.dealer = 'south';
            gameState.playerOrder = ['east', 'south', 'west', 'north'];
            gameState.currentPhase = GAME_PHASES.ORDER_UP_ROUND1;
            gameState.orderUpRound = 1;
            gameState.messages = [];
            
            // First east passes
            let result = handleOrderUpDecision(gameState, 'east', false);
            assert.strictEqual(result.currentPlayer, 'south');
            
            // Then south (dealer) passes - this should start round 2
            result = handleOrderUpDecision(result, 'south', false);
            
            // Should move to round 2 with west as first to act (left of dealer)
            assert.strictEqual(result.currentPlayer, 'west', 'Expected west to be first in round 2');
            assert.strictEqual(result.currentPhase, GAME_PHASES.ORDER_UP_ROUND2, 'Expected to be in round 2');
            assert.strictEqual(result.orderUpRound, 2, 'Expected orderUpRound to be 2');
            
            // Should have added appropriate message about round 2
            const hasRound2Message = result.messages.some(m => 
                m.text && (m.text.includes('Round 2') || 
                          m.text.includes('Round 2') ||
                          m.text.includes('round 2') ||
                          m.text.includes('Round2'))
            );
            
            assert.ok(hasRound2Message || 
                    result.messages.some(m => m.text && m.text.includes('call')),
                'Expected message about starting round 2 or calling trump');
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
            // Set up for round 2 with all players still in the game
            gameState.currentPhase = GAME_PHASES.ORDER_UP_ROUND2;
            gameState.orderUpRound = 2;
            gameState.currentPlayer = 'east';
            gameState.messages = []; // Clear any existing messages
            
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
            
            // Check for any message indicating a redeal (case insensitive)
            const hasRedealMessage = result.messages.some(m => 
                m.text && (m.text.toLowerCase().includes('redeal') || 
                          m.text.toLowerCase().includes('redeal'))
            );
            
            assert.ok(hasRedealMessage || 
                    result.messages.some(m => m.text && m.text.includes('Everyone passed')),
                'Expected message about redealing or passing');
        });
    });
});
