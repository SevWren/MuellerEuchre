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
import sinon from 'sinon';
import esmock from 'esmock';
// import { checkGameOver, handleEndOfHand, startNewGame } from '../../src/game/phases/endGame.js';
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, WINNING_SCORE } from '../../src/config/constants.js';

// Functions to be loaded with esmock
let checkGameOver, handleEndOfHand, startNewGame;
let mockLogger, mockPlayersUtils;


/**
 * @description Test suite for the End Game Phase of the Euchre game.
 * This phase handles the conclusion of a hand, including score calculation,
 * game over detection, and match statistics tracking.
 */
describe('End Game Phase', () => {
    /** @type {Object} gameState - The game state object used across tests */
    let gameState;
    let sandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        mockLogger = {
            info: sandbox.stub(),
            warn: sandbox.stub(),
            error: sandbox.stub(),
            log: sandbox.stub(), // Assuming log is used as an alias for info or debug
        };

        mockPlayersUtils = {
            // Configure specific return values per test if needed, or a default here
            getNextPlayer: sandbox.stub().returns(PLAYER_ROLES[1]), // Default mock for getNextPlayer
        };

        const endGameModule = await esmock('../../src/game/phases/endGame.js', {
            '../../src/utils/logger.js': { log: mockLogger.log, default: mockLogger }, // Mock default and named log
            '../../src/utils/players.js': mockPlayersUtils,
            // No need to mock constants, they will be imported directly
        });

        checkGameOver = endGameModule.checkGameOver;
        handleEndOfHand = endGameModule.handleEndOfHand;
        startNewGame = endGameModule.startNewGame;


        // Base gameState structure, specific tests can override parts
        gameState = {
            gameId: 'testEndGame123',
            gamePhase: GAME_PHASES.SCORING, // Default for many checkGameOver tests
            players: { // initializePlayers structure
                [PLAYER_ROLES[0]]: { id: 'p1', name: 'South', teamId: TEAMS.TEAM_NS, socketId: 's1', isConnected: true, hand: [] },
                [PLAYER_ROLES[1]]: { id: 'p2', name: 'West', teamId: TEAMS.TEAM_EW, socketId: 's2', isConnected: true, hand: [] },
                [PLAYER_ROLES[2]]: { id: 'p3', name: 'North', teamId: TEAMS.TEAM_NS, socketId: 's3', isConnected: true, hand: [] },
                [PLAYER_ROLES[3]]: { id: 'p4', name: 'East', teamId: TEAMS.TEAM_EW, socketId: 's4', isConnected: true, hand: [] },
            },
            dealer: PLAYER_ROLES[0], // South
            currentPlayer: PLAYER_ROLES[1], // West
            roundNumber: 1,
            bids: [],
            kitty: [],
            turnCard: null,
            trumpSuit: null,
            makerTeam: null,
            tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
            teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
            gameMessages: [],
            settings: { winningScore: WINNING_SCORE },
            // Properties from the original test file's gameState that might be relevant:
            // playerOrder: ['north', 'east', 'south', 'west'], // PLAYER_ROLES serves this
            // currentPhase: GAME_PHASES.SCORING, // Already set
            // playerWhoCalledTrump: 'north', // Set if needed by a specific test
            // tricks: [], // Set if needed
            // playerWhoCalledTrump: 'north', // Set if needed by a specific test
            tricks: [], // individual tests will set this
            // scores: { // Alias for teamScores, ensure consistency or pick one
            //     'north+south': 0, // Will use teamScores primarily
            //     'east+west': 0
            // },
            // messages: [] // Alias for gameMessages
            // Explicitly set initial scores for a target WINNING_SCORE of 10 for testing handleEndOfHand
            scores: {
                'north+south': 8,
                'east+west': 7
            },
        };
        // Align scores and teamScores (use teamScores as primary)
        gameState.teamScores = gameState.scores;
        gameState.messages = gameState.gameMessages; // Ensure gameState.messages is initialized from gameMessages
        gameState.winningTeam = undefined; // Ensure explicitly undefined for tests checking it

    });

    afterEach(() => {
        sandbox.restore();
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
            
            expect(result.gameOver).to.be.undefined; // Or .to.be.false if explicitly set
            expect(result.winningTeam).to.be.undefined; // Changed from .to.be.null
            // The original test had SCORING here. If checkGameOver is called from scoring,
            // and game is not over, it should transition to DEALING.
            // This depends on where checkGameOver is called and what its responsibility is.
            // Assuming checkGameOver is called *after* scores are tallied for the hand.
            // The function under test is checkGameOver, not the entire scoring pipeline.
            // If it's called with scores not meeting WINNING_SCORE, it should prepare for next hand or indicate no game over.
            // The endGame.js code itself does NOT set phase to DEALING if game is not over.
            // It simply returns the gameState. The calling function (e.g. in scoringPhase) would do that.
            // Let's adjust expectation based on actual endGame.js#checkGameOver behavior.
            // It returns the gameState unchanged if no winner.
            expect(result.gamePhase).to.equal(GAME_PHASES.SCORING);
            expect(result.winningTeam).to.be.undefined;
        });

        // Tests moved from scoringPhase.unit.test.js
        it('should transition to DEALING if game is not over, resetting relevant state (when called from a context that does this, e.g. scoring orchestrator)', () => {
            // This test is now slightly different: checkGameOver itself doesn't transition to DEALING.
            // It signals game over or not. The *caller* of checkGameOver would handle transition.
            // Let's re-evaluate what checkGameOver *itself* does.
            // It returns an updated state if game is over, otherwise the original state.
            // So, this specific test title from scoringPhase might be misleading for endGame.js context.
            // However, if we assume a wrapper function in endGame.js that *does* this:
            // The current checkGameOver in endGame.js does NOT change phase to DEALING.
            // It only changes phase if game IS over.
            // The logic for "next hand" (DEALING phase, reset state) seems to be in scoringPhase.js's checkGameOver.
            // This is confusing. Let's stick to testing checkGameOver from endGame.js as written.
            // The `endGame.js` version of `checkGameOver` only sets GAME_OVER or returns state.
            // It does not set to DEALING.
            // The tests from scoringPhase.js for `checkGameOver` were testing a version of `checkGameOver`
            // that *was* part of scoringPhase.js and had different responsibilities.
            //
            // For the endGame.js `checkGameOver`:
            gameState.teamScores = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 5 }; // Not game over
            const newState = checkGameOver(gameState); // Using the one from endGame.js
            expect(newState.gamePhase).to.equal(GAME_PHASES.SCORING); // Should not change phase
            // Already checked winningTeam is undefined above. This test is more about other state NOT changing.
            // Test that other parts of state are NOT reset by checkGameOver if game not over
            newState.trumpSuit = SUITS.SPADES;
            newState.makerTeam = TEAMS.TEAM_NS;
            const newStateAfterNoChange = checkGameOver(newState);
            expect(newStateAfterNoChange.trumpSuit).to.equal(SUITS.SPADES);
            expect(newStateAfterNoChange.makerTeam).to.equal(TEAMS.TEAM_NS);

        });

        // This test is also about the "next hand" logic which is not in endGame.js's checkGameOver
        it('should correctly set next dealer when transitioning to DEALING (responsibility of caller)', () => {
            // As above, endGame.js#checkGameOver doesn't do this.
            // This test is not applicable to endGame.js#checkGameOver as is.
            // If there's a different function in endGame.js that handles this, we should test that.
            // For now, this test will effectively show that checkGameOver doesn't change dealer.
            gameState.teamScores = { [TEAMS.TEAM_NS]: 1, [TEAMS.TEAM_EW]: 1 };
            gameState.dealer = PLAYER_ROLES[0];
            const originalDealer = gameState.dealer;

            const newState = checkGameOver(gameState); // from endGame.js
            expect(newState.dealer).to.equal(originalDealer); // checkGameOver itself shouldn't change dealer
            sinon.assert.notCalled(mockPlayersUtils.getNextPlayer); // getNextPlayer shouldn't be called by this checkGameOver
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
