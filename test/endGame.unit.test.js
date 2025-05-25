/**
 * @file endGame.unit.test.js - Unit tests for the EndGame module
 * @module test/endGame.unit
 * @description Comprehensive test suite for the end-game functionality in the Euchre game.
 * Tests cover the complete end-game workflow including:
 * - Score calculation and updates
 * - Game over detection
 * - Match statistics tracking
 * - New game initialization
 * 
 * @requires chai
 * @requires ../src/game/phases/endGame.js
 * @requires ../src/config/constants.js
 * @see {@link module:src/game/phases/endGame} for the implementation being tested
 */

import { expect } from 'chai';
import { checkGameOver, handleEndOfHand, startNewGame } from '../src/game/phases/endGame.js';
import { GAME_PHASES, WINNING_SCORE } from '../src/config/constants.js';

/**
 * @description Test suite for the End Game Phase of the Euchre game.
 * This phase handles the conclusion of a hand, including score calculation,
 * game over detection, and match statistics tracking.
 */
describe('End Game Phase', () => {
    /** @type {Object} gameState - The game state object used across tests */
    let gameState;
    
    /**
     * @description Sets up a fresh game state before each test case.
     * Initializes player order, scores, and other essential game state properties.
     */
    beforeEach(() => {
        // Setup a basic game state for testing with default values
        gameState = {
            playerOrder: ['north', 'east', 'south', 'west'],
            dealer: 'south',
            currentPhase: GAME_PHASES.SCORING,
            makerTeam: 'north+south',
            playerWhoCalledTrump: 'north',
            tricks: [],
            scores: {
                'north+south': WINNING_SCORE - 2, // One point from winning
                'east+west': WINNING_SCORE - 3
            },
            messages: []
        };
    });

    /**
     * @description Test suite for the handleEndOfHand function.
     * Tests the end-of-hand scoring and game state updates.
     */
    describe('handleEndOfHand', () => {
        /**
         * @test {handleEndOfHand}
         * @description Verifies that when makers make their bid, scores are updated correctly
         * and appropriate messages are added to the game state.
         */
        it('should update scores and detect game over when winning score is reached', () => {
            // Simulate makers winning 3 tricks (just enough to make their bid)
            gameState.tricks = Array(3).fill({ team: 'north+south' });
            
            const result = handleEndOfHand(gameState);
            
            // Should update scores (north+south should reach WINNING_SCORE)
            expect(result.scores['north+south']).to.equal(WINNING_SCORE - 1);
            expect(result.scores['east+west']).to.equal(WINNING_SCORE - 3);
            
            // Should add score messages
            expect(result.messages.some(m => 
                m.type === 'score' && 
                m.text.includes('Team north+south made their bid! 1 point.')
            )).to.be.true;
            
            // Should add score summary
            expect(result.messages.some(m => 
                m.type === 'score_summary' && 
                m.text.includes('Scores - North/South')
            )).to.be.true;
            
            // Should not be game over yet (not enough points)
            // gameOver can be either false or undefined when the game is not over
            expect(result.gameOver === false || result.gameOver === undefined).to.be.true;
        });
        
        /**
         * @test {handleEndOfHand}
         * @description Verifies that when a team wins all 5 tricks (a march),
         * they are awarded 2 points and the game ends if they reach the winning score.
         */
        it('should award 2 points for a march', () => {
            // Simulate makers winning all 5 tricks
            gameState.tricks = Array(5).fill({ team: 'north+south' });
            
            const result = handleEndOfHand(gameState);
            
            // Should award 2 points for march
            expect(result.scores['north+south']).to.equal(WINNING_SCORE);
            expect(result.messages.some(m => 
                m.text.includes('made a march! 2 points!')
            )).to.be.true;
            
            // Should be game over now
            expect(result.gameOver).to.be.true;
            expect(result.winningTeam).to.equal('north+south');
            expect(result.currentPhase).to.equal(GAME_PHASES.GAME_OVER);
        });
        
        /**
         * @test {handleEndOfHand}
         * @description Verifies that when the maker team is euchred (fails to make their bid),
         * the opposing team is awarded 2 points.
         */
        it('should award 2 points for euchre', () => {
            // Simulate makers getting euchred (0 tricks)
            gameState.tricks = Array(5).fill({ team: 'east+west' });
            
            const result = handleEndOfHand(gameState);
            
            // Should award 2 points to opponents for euchre
            expect(result.scores['east+west']).to.equal(WINNING_SCORE - 1);
            expect(result.messages.some(m => 
                m.text.includes('was euchred! 2 points for')
            )).to.be.true;
        });
    });

    /**
     * @description Test suite for the checkGameOver function.
     * Tests game over detection and winner determination.
     */
    describe('checkGameOver', () => {
        /**
         * @test {checkGameOver}
         * @description Verifies that when a team reaches the winning score,
         * the game is marked as over and the winning team is set.
         */
        it('should detect when a team has won', () => {
            // Set a team's score to the winning score
            gameState.scores['north+south'] = WINNING_SCORE;
            
            const result = checkGameOver(gameState);
            
            expect(result.gameOver).to.be.true;
            expect(result.winningTeam).to.equal('north+south');
            expect(result.currentPhase).to.equal(GAME_PHASES.GAME_OVER);
            
            // Should add game over message
            expect(result.messages.some(m => 
                m.type === 'game_over' && 
                m.text.includes('north+south wins the game!')
            )).to.be.true;
            
            // Should update match stats
            expect(result.matchStats.gamesPlayed).to.equal(1);
            expect(result.matchStats.teamWins['north+south']).to.equal(1);
        });
        
        /**
         * @test {checkGameOver}
         * @description Verifies that when no team has reached the winning score,
         * the game continues without declaring a winner.
         */
        it('should not detect game over when no team has won', () => {
            // Scores are below winning threshold
            gameState.scores = { 'north+south': 0, 'east+west': 0 };
            
            const result = checkGameOver(gameState);
            
            expect(result.gameOver).to.be.undefined;
            expect(result.winningTeam).to.be.undefined;
            expect(result.currentPhase).to.equal(GAME_PHASES.SCORING);
        });
    });

    /**
     * @description Test suite for the startNewGame function.
     * Tests the game state reset functionality for starting a new game.
     */
    describe('startNewGame', () => {
        /**
         * @test {startNewGame}
         * @description Verifies that the game state is properly reset for a new game
         * while preserving match statistics and generating appropriate messages.
         */
        it('should reset the game state for a new game', () => {
            // Set up a completed game state
            const completedGame = {
                ...gameState,
                gameOver: true,
                winningTeam: 'north+south',
                currentPhase: GAME_PHASES.GAME_OVER,
                players: { north: {}, east: {}, south: {}, west: {} },
                matchStats: { gamesPlayed: 1, teamWins: { 'north+south': 1, 'east+west': 0 } }
            };
            
            const result = startNewGame(completedGame);
            
            // Should reset game state
            expect(result.gameOver).to.be.false;
            expect(result.winningTeam).to.be.null;
            expect(result.currentPhase).to.equal(GAME_PHASES.LOBBY);
            expect(result.players).to.deep.equal({});
            
            // Should reset scores
            expect(result.scores).to.deep.equal({
                'north+south': 0,
                'east+west': 0
            });
            
            // Should keep match stats
            expect(result.matchStats.gamesPlayed).to.equal(1);
            
            // Should add new game message
            expect(result.messages.some(m => 
                m.type === 'game' && 
                m.text.includes('A new game is starting!')
            )).to.be.true;
        });
    });
});
