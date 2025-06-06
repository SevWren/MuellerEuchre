/**
 * @file dealCards.unit.test.js - Unit tests for the dealCards function
 * @module DealCardsUnitTest
 * @description Unit tests for the dealCards function. Checks that the function correctly deals out the cards
 * to all players and sets up the kitty with 3 cards
 * @requires chai
 * @requires ../../../src/game/phases/startNewHand.js - The module containing the dealCards function
 * @requires ./testHelpers.js - Helper functions for unit testing
 */

import { dealCards } from '../../../src/game/phases/startNewHand.js';
import { createBasicGameState, createDeck } from './testHelpers.js';
import assert from 'assert';

describe('dealCards', function() {
    let gameState;
    
    beforeEach(function() {
        gameState = {
            ...createBasicGameState(),
            deck: createDeck()
        };
    });

    it('should deal cards to all players', function() {
        const result = dealCards(gameState);
        assert.strictEqual(result.players.north.hand.length, 5);
        assert.strictEqual(result.players.east.hand.length, 5);
        assert.strictEqual(result.players.south.hand.length, 5);
        assert.strictEqual(result.players.west.hand.length, 5);
    });

    it('should set up the kitty with 3 cards', function() {
        const result = dealCards(gameState);
        assert.strictEqual(result.kitty.length, 3);
    });

    // Add more test cases as needed. Keep file under 400 lines
});