/**
 * @file startNewHand.edge.unit.test.js - Edge case tests for startNewHand function
 * @module StartNewHandEdgeUnitTest
 * @description Unit tests for edge cases and error conditions in startNewHand
 * @requires chai
 * @requires ../../src/game/phases/startNewHand.js
 * @requires ../../src/config/constants.js
 * @requires ./testHelpers.js
 * @see {@link module:src/game/phases/startNewHand} for the implementation being tested
 */

import { startNewHand } from '../../../src/game/phases/startNewHand.js';
import { createBasicGameState, createDeck } from './testHelpers.js';
import assert from 'assert';

describe('startNewHand Edge Cases', function() {
    let gameState;
    
    beforeEach(function() {
        gameState = createBasicGameState();
    });

    it('should handle custom deck with minimum required cards', function() {
        // Minimum deck for testing: 24 cards (6 per player * 4 players)
        const minimalDeck = createDeck().slice(0, 24);
        const result = startNewHand({
            ...gameState,
            deck: [...minimalDeck] // Make a copy to avoid mutation
        });
        
        // After startNewHand, the deck should still have 24 cards (they're not dealt until dealCards is called)
        assert.strictEqual(result.deck.length, 24);
    });

    it('should handle game state with additional custom properties', function() {
        const customState = {
            ...gameState,
            customProperty: 'test',
            nested: {
                custom: 'value'
            },
            game: {
                ...gameState.game,
                customGameProperty: 123
            }
        };

        const result = startNewHand(customState);
        
        // Should preserve custom properties
        assert.strictEqual(result.customProperty, 'test');
        assert.strictEqual(result.nested.custom, 'value');
        assert.strictEqual(result.game.customGameProperty, 123);
    });

    it('should handle different initial dealer positions', function() {
        // Test all possible dealer positions
        const positions = ['north', 'east', 'south', 'west'];
        
        positions.forEach((dealer, index) => {
            const nextDealer = positions[(index + 1) % positions.length];
            const nextPlayer = positions[(index + 2) % positions.length];
            
            const result = startNewHand({
                ...gameState,
                dealer,
                playerOrder: [...positions] // Ensure consistent player order
            });
            
            assert.strictEqual(result.dealer, nextDealer);
            assert.strictEqual(result.currentPlayer, nextPlayer);
        });
    });

    it('should handle custom player order', function() {
        const customOrder = ['west', 'south', 'east', 'north'];
        const result = startNewHand({
            ...gameState,
            playerOrder: customOrder,
            dealer: 'south'
        });
        
        // Next dealer should be 'east' in the custom order
        assert.strictEqual(result.dealer, 'east');
        // Current player should be 'north' (next after dealer in custom order)
        assert.strictEqual(result.currentPlayer, 'north');
    });
});
