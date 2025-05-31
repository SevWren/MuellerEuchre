/**
 * @file goAlonePhase.unit.test.js - Unit tests for the Go Alone Phase in Euchre
 * @module goAlonePhase.unit
 * @description Comprehensive test suite for the "Go Alone" phase in the Euchre game.
 * Tests cover the functionality where a player can choose to play without their partner
 * for a chance to score additional points.
 * 
 * @requires assert
 * @requires ../../src/game/phases/goAlonePhase.js
 * @requires ../../src/config/constants.js
 * @see {@link module:src/game/phases/goAlonePhase} for the implementation being tested
 */

import {  handleGoAloneDecision  } from '../../src/game/phases/goAlonePhase.js';
import {  GAME_PHASES  } from '../../src/config/constants.js';
import assert from "assert";

/**
 * @description Test suite for the Go Alone Phase in the Euchre game.
 * This phase allows a player to declare they will play without their partner's
 * help, with the potential to earn extra points for their team.
 */
describe('Go Alone Phase', function() {
    /** @type {Object} gameState - The game state object used across tests */
    let gameState;
    
    /**
     * @description Sets up a fresh game state before each test case.
     * Initializes player order, dealer, and other essential game state properties.
     */
    beforeEach(() => {
        // Setup a basic game state for testing with default values
        gameState = {
            playerOrder: ['north', 'east', 'south', 'west'],
            dealer: 'south',
            currentPlayer: 'east', // Player who called trump
            currentPhase: GAME_PHASES.AWAITING_GO_ALONE,
            trumpSuit: 'hearts',
            makerTeam: 'east+west',
            playerWhoCalledTrump: 'east',
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
     * @description Test suite for the handleGoAloneDecision function.
     * Tests the decision-making logic when a player chooses to go alone or not.
     */
    describe('handleGoAloneDecision', function() {
        /**
         * @test {handleGoAloneDecision}
         * @description Verifies that when a player chooses to go alone, the game state
         * is updated correctly with the appropriate flags and messages.
         */
        it('should handle player choosing to go alone', function() {
            const result = handleGoAloneDecision(gameState, 'east', true);
            
            // Should set going alone flags
            assert.strictEqual(result.goingAlone, true);
            assert.strictEqual(result.playerGoingAlone, 'east');
            assert.strictEqual(result.partnerSittingOut, 'west');
            
            // Should update game phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.PLAYING);
            
            // Should set first player (left of dealer)
            assert.strictEqual(result.currentPlayer, 'west');
            assert.strictEqual(result.trickLeader, 'west');
            
            // Should add appropriate messages
            assert.ok(result.messages.some(m => 
                m.text.includes('east is going alone') && 
                m.text.includes('west will sit out')
            ));
            assert.ok(result.messages.some(m => 
                m.text.includes('Starting play') && 
                m.text.includes('west leads the first trick')
            ));
        });
        
        /**
         * @test {handleGoAloneDecision}
         * @description Verifies that when a player chooses to play with their partner,
         * the game state is updated accordingly without setting the go alone flags.
         */
        it('should handle player choosing to play with partner', function() {
            const result = handleGoAloneDecision(gameState, 'east', false);
            
            // Should set going alone flags to false
            assert.strictEqual(result.goingAlone, false);
            assert.strictEqual(result.playerGoingAlone, null);
            assert.strictEqual(result.partnerSittingOut, null);
            
            // Should update game phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.PLAYING);
            
            // Should set first player (left of dealer)
            assert.strictEqual(result.currentPlayer, 'west');
            assert.strictEqual(result.trickLeader, 'west');
            
            // Should add appropriate messages
            assert.ok(result.messages.some(m => 
                m.text.includes('east will play with their partner')
            ));
        });
        
        /**
         * @test {handleGoAloneDecision}
         * @description Verifies that an error is thrown if a player attempts to go alone
         * when the game is not in the AWAITING_GO_ALONE phase.
         
        it('should throw error if not the right phase', function() {
            gameState.currentPhase = GAME_PHASES.PLAYING;
            
            assert.throws(
                () => handleGoAloneDecision(gameState, 'east', true),
                /Invalid go alone attempt/
            );
        });
        
        /**
         * @test {handleGoAloneDecision}
         * @description Verifies that an error is thrown if a player attempts to make a
         * go alone decision when it's not their turn.
         */
        it('should throw error if not the current player', function() {
            assert.throws(
                () => handleGoAloneDecision(gameState, 'north', true),
                /Invalid go alone attempt/
            );
        });
    });
});
