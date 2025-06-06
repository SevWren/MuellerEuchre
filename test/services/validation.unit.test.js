/**
 * @file validation.unit.test.js - Unit tests for the Validation module in Euchre
 * @module test/validation.unit
 * @description Comprehensive test suite for the game validation logic in Euchre.
 * Tests cover the validation of card plays according to Euchre rules, including:
 * - Valid lead cards
 * - Following suit requirements
 * - Special card behaviors (bowers)
 * - Edge cases and error conditions
 * 
 * @requires chai
 * @requires assert
 * @requires ../../src/game/logic/validation.js
 * @requires ../../src/config/constants.js
 * @see {@link module:src/game/logic/validation} for the implementation being tested
 */

import { isValidPlay, serverIsValidPlay } from '../../src/game/logic/validation.js';
import { GAME_PHASES } from '../../src/config/constants.js';
import assert from 'assert';

/**
 * @description Test suite for the Validation Module in the Euchre game.
 * This module handles the validation of card plays according to Euchre rules,
 * including following suit, handling bowers, and special card behaviors.
 */
describe('Validation Module', function() {
    /** @type {Object} gameState - The game state object used across tests */
    let gameState;

    /**
     * @description Sets up a fresh game state before each test case.
     * Initializes player hands, current trick, and game state properties.
     */
    beforeEach(() => {
        // Setup a basic game state for testing with default values
        gameState = {
            currentPlayer: 'south',
            currentPhase: GAME_PHASES.PLAYING,
            trumpSuit: 'hearts',
            currentTrick: [],
            players: {
                south: {
                    hand: [
                        { suit: 'hearts', rank: 'J' }, // Right bower
                        { suit: 'diamonds', rank: 'J' }, // Left bower
                        { suit: 'hearts', rank: 'A' },
                        { suit: 'spades', rank: 'K' },
                        { suit: 'clubs', rank: 'Q' }
                    ]
                },
                north: { hand: [] },
                east: { hand: [] },
                west: { hand: [] }
            }
        };
    });

    /**
     * @description Test suite for the isValidPlay function.
     * Tests the validation of card plays during the game.
     */
    describe('isValidPlay', function() {
        /**
         * @test {isValidPlay}
         * @description Verifies that a valid lead card is accepted when it's the player's turn.
         */
        it('should validate a valid lead card', function() {
            const result = isValidPlay(gameState, 'south', { suit: 'spades', rank: 'K' });
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.message, 'Valid lead');
        });

        /**
         * @test {isValidPlay}
         * @description Verifies that a player can follow suit when required.
         */
        it('should validate following suit', function() {
            // Setup a trick where hearts was led
            gameState.currentTrick = [{
                player: 'west',
                card: { suit: 'hearts', rank: '10' }
            }];
            
            // Player must follow hearts
            const result = isValidPlay(gameState, 'south', { suit: 'hearts', rank: 'A' });
            assert.strictEqual(result.isValid, true);
        });

        /**
         * @test {isValidPlay}
         * @description Verifies that a player cannot play a card of a different suit
         * when they have a card of the suit that was led.
         */
        it('should invalidate not following suit when possible', function() {
            // Setup a trick where hearts was led
            gameState.currentTrick = [{
                player: 'west',
                card: { suit: 'hearts', rank: '10' }
            }];
            
            // Player tries to play spades when they have hearts
            const result = isValidPlay(gameState, 'south', { suit: 'spades', rank: 'K' });
            assert.strictEqual(result.isValid, false);
            assert.strictEqual(result.message, 'Must follow suit (hearts)');
        });

        /**
         * @test {isValidPlay}
         * @description Verifies that the left bower (jack of the same color as trump)
         * is treated as a trump card when following suit.
         */
        it('should handle left bower as trump', function() {
            // Setup a trick where trump (hearts) was led
            gameState.currentTrick = [{
                player: 'west',
                card: { suit: 'hearts', rank: '10' }
            }];
            
            // Left bower (diamonds J) should be valid as it's effectively a heart
            const result = isValidPlay(gameState, 'south', { suit: 'diamonds', rank: 'J' });
            assert.strictEqual(result.isValid, true);
        });

        /**
         * @test {isValidPlay}
         * @description Verifies that the right bower (jack of the trump suit)
         * is recognized as the highest card in the game.
         */
        it('should validate right bower as highest card', function() {
            // Setup a trick where hearts (trump) was led
            gameState.currentTrick = [{
                player: 'west',
                card: { suit: 'hearts', rank: 'A' }
            }];
            
            // Right bower (hearts J) should be valid
            const result = isValidPlay(gameState, 'south', { suit: 'hearts', rank: 'J' });
            assert.strictEqual(result.isValid, true);
        });

        /**
         * @test {isValidPlay}
         * @description Verifies that a player can play any card when they don't have
         * any cards of the suit that was led.
         */
        it('should validate when player has no cards of led suit', function() {
            // Update the player's hand to have no clubs
            gameState.players.south.hand = [
                { suit: 'hearts', rank: 'J' }, // Right bower
                { suit: 'diamonds', rank: 'J' }, // Left bower
                { suit: 'hearts', rank: 'A' },
                { suit: 'spades', rank: 'K' },
                { suit: 'diamonds', rank: 'Q' } // Changed from clubs to diamonds
            ];
            
            // Setup a trick where clubs was led
            gameState.currentTrick = [{
                player: 'west',
                card: { suit: 'clubs', rank: 'A' }
            }];
            
            // Player has no clubs, so any card is valid
            const result = isValidPlay(gameState, 'south', { suit: 'spades', rank: 'K' });
            assert.strictEqual(result.isValid, true);
        });
    });

    /**
     * @description Test suite for the serverIsValidPlay function.
     * Tests backward compatibility with the legacy function signature.
     */
    describe('serverIsValidPlay (backward compatibility)', function() {
        /**
         * @test {serverIsValidPlay}
         * @description Verifies that the function works with the legacy parameter order.
         */
        it('should work with the legacy function signature', function() {
            const result = serverIsValidPlay('south', { suit: 'spades', rank: 'K' }, gameState);
            assert.strictEqual(result, true);
        });

        /**
         * @test {serverIsValidPlay}
         * @description Verifies that the function throws an error when the gameState
         * parameter is missing.
         */
        it('should throw if gameState is missing', function() {
            assert.throws(
                () => serverIsValidPlay('south', { suit: 'spades', rank: 'K' }),
                /gameState is required/
            );
        });
    });
});
