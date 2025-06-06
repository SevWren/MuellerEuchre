/**
 * @file startNewHand.unit.test.js - Unit tests for the startNewHand function
 * @module StartNewHandUnitTest
 * @description Unit tests for the startNewHand function, which is responsible for resetting the game state at the start of a new hand.
 * @requires chai - The testing framework
 * @requires ../../src/game/phases/startNewHand.js - The module containing the startNewHand function
 * @requires ../../src/config/constants.js - The module containing Euchre game constants
 * @requires ./testHelpers.js - The module containing test helper functions
 */

import { startNewHand } from '../../../src/game/phases/startNewHand.js';
import { GAME_PHASES } from '../../../src/config/constants.js';
import { createBasicGameState, createDeck } from './testHelpers.js';
import assert from 'assert';

describe('startNewHand', function() {
    let gameState;
    
    beforeEach(function() {
        gameState = createBasicGameState();
    });

    it('should rotate dealer and set current player', function() {
        const result = startNewHand(gameState);
        assert.strictEqual(result.dealer, 'east');
        assert.strictEqual(result.currentPlayer, 'south');
    });

    it('should initialize a new deck if none provided', function() {
        const result = startNewHand(gameState);
        assert.strictEqual(result.deck.length, 24);
    });

    it('should use existing deck if provided', function() {
        const customDeck = createDeck();
        const result = startNewHand({ ...gameState, deck: customDeck });
        assert.deepStrictEqual(result.deck, customDeck);
    });

    it('should handle multiple hands with custom state', function() {
        // First hand - initial dealer is 'north' from createBasicGameState
        let result = startNewHand({
            ...gameState,
            dealer: 'north',
            initialDealerForSession: null
        });
        
        // First rotation: north -> east
        assert.strictEqual(result.dealer, 'east');
        
        // Add custom state for second hand
        const customState = {
            ...result, // Use the result from first hand
            customField: 'test',
            game: {
                ...result.game,
                customGameField: 123
            }
        };
        
        // Second hand - dealer should rotate from east to south
        result = startNewHand(customState);
        
        // Verify dealer rotation and custom state preservation
        assert.strictEqual(result.dealer, 'south');
        assert.strictEqual(result.customField, 'test');
        assert.strictEqual(result.game.customGameField, 123);
    });

    it('should set initialDealerForSession on first hand', function() {
        const result = startNewHand(gameState);
        assert.strictEqual(result.initialDealerForSession, 'north');
    });

    it('should preserve initialDealerForSession across hands', function() {
        // First hand
        let result = startNewHand(gameState);
        assert.strictEqual(result.initialDealerForSession, 'north');
        
        // Second hand
        result = startNewHand({
            ...gameState,
            dealer: 'east',
            initialDealerForSession: 'north'
        });
        
        // Should still have original initial dealer
        assert.strictEqual(result.initialDealerForSession, 'north');
    });

    it('should reset game phase to DEALING', function() {
        // Create a game state with a non-DEALING phase
        const testState = {
            ...gameState,
            currentPhase: GAME_PHASES.PLAYING
        };
        
        // Call startNewHand which should reset the phase to DEALING
        const result = startNewHand(testState);
        
        // Verify the phase was reset at the root level
        assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
    });
});