/**
 * @file server3.orderUp.unit.test.js - Unit tests for the Server3 OrderUp module
 * @module Server3OrderUpUnitTest
 * @description Unit tests for the Server3 OrderUp module
 * @requires chai
 * @requires ../../server3.mjs
 */

import assert from "assert";
import sinon from "sinon";
import { createTestServer } from './test-utils.js';

describe('Order Up Functionality', function() {
    let server, gameState, mockIo;

    beforeEach(() => {
        ({ server, gameState, mockIo } = createTestServer());

        // Additional setup specific to orderUp tests
        gameState.gamePhase = 'ORDER_UP_ROUND1';
        gameState.currentPlayer = 'west';
        gameState.dealer = 'south';
        gameState.upCard = { id: 'AH', suit: 'hearts', value: 'A' };
    });

    describe('handleOrderUpDecision', function() {
        it('should allow player to order up', function() {
            // Current player is the one after the dealer (since dealer was set to 'south' by default)
            const playerRole = gameState.currentPlayer; // Should be 'west'
            
            // Player orders up
            handleOrderUpDecision(playerRole, true);
            
            // Verify game state
            assert.strictEqual(gameState.trump, gameState.upCard.suit);
            assert.strictEqual(gameState.maker, gameState.players[playerRole].team);
            assert.strictEqual(gameState.playerWhoCalledTrump, playerRole);
            assert.strictEqual(gameState.gamePhase, 'AWAITING_DEALER_DISCARD');
            assert.strictEqual(gameState.currentPlayer, gameState.dealer);
            
            // Verify dealer received the up card
            assert.strictEqual(gameState.players[gameState.dealer].hand.length, 6);
            assert.strictEqual(gameState.upCard, null);
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/ordered up/)));
            assert(logStub.calledWith(sinon.match(/Trump is/)));
        });

        it('should handle player passing', function() {
            const playerRole = gameState.currentPlayer; // 'west'
            
            // Player passes
            handleOrderUpDecision(playerRole, false);
            
            // Verify game state
            assert.strictEqual(gameState.trump, null);
            assert.strictEqual(gameState.currentPlayer, 'north'); // Next player
            assert.strictEqual(gameState.gamePhase, 'ORDER_UP_ROUND1');
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/passed/)));
        });

        it('should advance to round 2 if all pass in round 1', function() {
            // Simulate all players passing in round 1
            const firstPlayer = gameState.currentPlayer; // 'west'
            
            // West passes
            handleOrderUpDecision(firstPlayer, false);
            
            // North passes
            handleOrderUpDecision('north', false);
            
            // East passes
            handleOrderUpDecision('east', false);
            
            // Dealer (south) passes - should trigger round 2
            handleOrderUpDecision('south', false);
            
            // Verify game state
            assert.strictEqual(gameState.orderUpRound, 2);
            assert.strictEqual(gameState.gamePhase, 'ORDER_UP_ROUND2');
            assert.strictEqual(gameState.currentPlayer, 'west'); // First player after dealer
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/Round 2 of bidding/)));
        });

        it('should redeal if all pass in round 2', function() {
            // Set up for round 2
            gameState.orderUpRound = 2;
            gameState.gamePhase = 'ORDER_UP_ROUND2';
            gameState.currentPlayer = 'west';
            
            // Mock startNewHand to verify it's called
            const startNewHandSpy = sinon.spy(server, 'startNewHand');
            
            // All players pass in round 2
            handleOrderUpDecision('west', false);
            handleOrderUpDecision('north', false);
            handleOrderUpDecision('east', false);
            handleOrderUpDecision('south', false);
            
            // Verify game state
            assert(startNewHandSpy.calledOnce);
            assert(logStub.calledWith(sinon.match(/Redealing/)));
            
            startNewHandSpy.restore();
        });

        it('should prevent ordering up when not in the correct phase', function() {
            // Change to a different phase
            gameState.gamePhase = 'PLAYING_TRICKS';
            
            // Try to order up
            handleOrderUpDecision('west', true);
            
            // Verify no changes were made
            assert.strictEqual(gameState.trump, null);
            assert(logStub.calledWith(sinon.match(/Invalid order up attempt/)));
        });

        it('should prevent ordering up when not the current player\'s turn', function() {
            // Current player is 'west'
            
            // Try to order up as a different player
            handleOrderUpDecision('east', true);
            
            // Verify no changes were made
            assert.strictEqual(gameState.trump, null);
            assert(logStub.calledWith(sinon.match(/Invalid order up attempt/)));
        });
    });
});
