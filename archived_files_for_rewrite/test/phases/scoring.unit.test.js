/**
 * @file scoring.unit.test.js - Unit tests for the Scoring module in Euchre
 * @module test/scoring.unit
 * @description Comprehensive test suite for the scoring system in the Euchre game.
 * Tests cover the complete scoring workflow including:
 * - Standard scoring for making the bid (1 point)
 * - March (2 points for taking all 5 tricks)
 * - Lone hand scoring (4 points for a lone march)
 * - Euchre scenarios (2 points for the opposing team)
 * - Game reset functionality
 * 
 * @requires chai
 * @requires ../../src/game/phases/scoring.js
 * @requires ../../src/config/constants.js
 * @see {@link module:src/game/phases/scoring} for the implementation being tested
 * @since 0.0.1
 */

import { expect } from 'chai';
import { scoreCurrentHand, resetGame } from '../../src/game/phases/scoring.js';
import { GAME_PHASES } from '../../src/config/constants.js';

/**
 * @description Test suite for the Scoring Module in the Euchre game.
 * This module handles all scoring-related functionality including point calculation,
 * win conditions, and game state transitions based on trick outcomes.
 */
describe('Scoring Module', () => {
    /** @type {Object} gameState - The game state object used across tests */
    let gameState;

    /**
     * @description Sets up a fresh game state before each test case.
     * Initializes player order, scores, and other essential game state properties.
     */
    beforeEach(() => {
        // Setup a basic game state for testing with default values
          gameState = {
               currentPhase: GAME_PHASES.PLAYING,
               dealer: 'south',
               makerTeam: 'north+south',
               goingAlone: false,
               playerGoingAlone: null,
               playerOrder: ['north', 'east', 'south', 'west'],
               players: {
                    north: { tricksWon: 0 },
                    south: { tricksWon: 0 },
                    east: { tricksWon: 0 },
                    west: { tricksWon: 0 }
               },
               messages: []
          };
     });

    /**
     * @description Test suite for the scoreCurrentHand function.
     * Tests various scoring scenarios based on tricks won by each team.
     */
    describe('scoreCurrentHand', () => {
        /**
         * @test {scoreCurrentHand}
         * @description Verifies that when the maker team wins exactly 3 tricks,
         * they are awarded 1 point and the game transitions to BETWEEN_HANDS phase.
         */
        it('should award 1 point for making the bid (3 tricks)', () => {
               // Setup - makers take 3 tricks
               gameState.players.north.tricksWon = 2;
               gameState.players.south.tricksWon = 1;
               gameState.players.east.tricksWon = 1;
               gameState.players.west.tricksWon = 1;

               const result = scoreCurrentHand(gameState);
               
               expect(result.scores['north+south']).to.equal(1);
               expect(result.scores['east+west']).to.equal(0);
               expect(result.currentPhase).to.equal(GAME_PHASES.BETWEEN_HANDS);
          });

        /**
         * @test {scoreCurrentHand}
         * @description Verifies that when the maker team wins all 5 tricks (a march),
         * they are awarded 2 points.
         */
        it('should award 2 points for a march (5 tricks)', () => {
               // Setup - makers take all 5 tricks
               gameState.players.north.tricksWon = 3;
               gameState.players.south.tricksWon = 2;

               const result = scoreCurrentHand(gameState);
               
               expect(result.scores['north+south']).to.equal(2);
               expect(result.scores['east+west']).to.equal(0);
          });

        /**
         * @test {scoreCurrentHand}
         * @description Verifies that when a player goes alone and their team wins all 5 tricks,
         * they are awarded 4 points (lone march).
         */
        it('should award 4 points for a lone hand march', () => {
               // Setup - going alone and taking all 5 tricks
               gameState.goingAlone = true;
               gameState.playerGoingAlone = 'north';
               gameState.players.north.tricksWon = 5;
               gameState.players.south.tricksWon = 0;

               const result = scoreCurrentHand(gameState);
               
               expect(result.scores['north+south']).to.equal(4);
          });

        /**
         * @test {scoreCurrentHand}
         * @description Verifies that when the maker team wins fewer than 3 tricks,
         * the opposing team is awarded 2 points (euchre).
         */
        it('should euchre the makers if they take < 3 tricks', () => {
               // Setup - makers take only 2 tricks
               gameState.players.north.tricksWon = 1;
               gameState.players.south.tricksWon = 1;
               gameState.players.east.tricksWon = 2;
               gameState.players.west.tricksWon = 1;

               const result = scoreCurrentHand(gameState);
               
               expect(result.scores['east+west']).to.equal(2);
               expect(result.scores['north+south']).to.equal(0);
          });

        /**
         * @test {scoreCurrentHand}
         * @description Verifies that when a team's score reaches or exceeds 10 points,
         * the game transitions to GAME_OVER phase with the winning team declared.
         */
        it('should declare a winner if score reaches 10', () => {
               // Setup - makers have 9 points and make their bid
               gameState.scores = { 'north+south': 9, 'east+west': 5 };
               gameState.players.north.tricksWon = 3;
               gameState.players.south.tricksWon = 0;

               const result = scoreCurrentHand(gameState);
               
               expect(result.currentPhase).to.equal(GAME_PHASES.GAME_OVER);
               expect(result.winner).to.equal('north+south');
          });
     });

    /**
     * @description Test suite for the resetGame function.
     * Tests the game state reset functionality for starting a new game.
     */
    describe('resetGame', () => {
        /**
         * @test {resetGame}
         * @description Verifies that the game state is properly reset for a new game,
         * including score reset and appropriate phase transition.
         */
        it('should reset the game state for a new game', () => {
               const result = resetGame({
                    scores: { 'north+south': 5, 'east+west': 3 },
                    dealer: 'east',
                    currentPhase: GAME_PHASES.GAME_OVER,
                    messages: ['Game over!']
               });
               
               expect(result.scores).to.deep.equal({ 'north+south': 0, 'east+west': 0 });
               expect(result.currentPhase).to.equal(GAME_PHASES.LOBBY);
               expect(result.messages).to.deep.equal([{
                    type: 'game',
                    text: 'New game started! Waiting for players...'
               }]);
          });
     });
});
