const { checkGameOver, handleEndOfHand, startNewGame } = require('../src/game/phases/endGame.js');
const { GAME_PHASES, WINNING_SCORE } = require('../src/config/constants.js');
const assert = require('assert');

describe('End Game Phase', function() {
    let gameState;
    
    beforeEach(() => {
        // Setup a basic game state for testing
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

    describe('handleEndOfHand', function() {
        it('should update scores and detect game over when winning score is reached', function() {
            // Simulate makers winning 3 tricks (just enough to make their bid)
            gameState.tricks = Array(3).fill({ team: 'north+south' });
            
            const result = handleEndOfHand(gameState);
            
            // Should update scores (north+south should reach WINNING_SCORE)
            assert.strictEqual(result.scores['north+south'], WINNING_SCORE - 1);
            assert.strictEqual(result.scores['east+west'], WINNING_SCORE - 3);
            
            // Should add score messages
            assert.ok(result.messages.some(m => 
                m.type === 'score' && 
                m.text.includes('Team north+south made their bid! 1 point.')
            ));
            
            // Should add score summary
            assert.ok(result.messages.some(m => 
                m.type === 'score_summary' && 
                m.text.includes('Scores - North/South')
            ));
            
            // Should not be game over yet (not enough points)
            assert.strictEqual(result.gameOver, false);
        });
        
        it('should award 2 points for a march', function() {
            // Simulate makers winning all 5 tricks
            gameState.tricks = Array(5).fill({ team: 'north+south' });
            
            const result = handleEndOfHand(gameState);
            
            // Should award 2 points for march
            assert.strictEqual(result.scores['north+south'], WINNING_SCORE);
            assert.ok(result.messages.some(m => 
                m.text.includes('made a march! 2 points!')
            ));
            
            // Should be game over now
            assert.strictEqual(result.gameOver, true);
            assert.strictEqual(result.winningTeam, 'north+south');
            assert.strictEqual(result.currentPhase, GAME_PHASES.GAME_OVER);
        });
        
        it('should award 2 points for euchre', function() {
            // Simulate makers getting euchred (0 tricks)
            gameState.tricks = Array(5).fill({ team: 'east+west' });
            
            const result = handleEndOfHand(gameState);
            
            // Should award 2 points to opponents for euchre
            assert.strictEqual(result.scores['east+west'], WINNING_SCORE - 1);
            assert.ok(result.messages.some(m => 
                m.text.includes('was euchred! 2 points for')
            ));
        });
    });

    describe('checkGameOver', function() {
        it('should detect when a team has won', function() {
            // Set a team's score to the winning score
            gameState.scores['north+south'] = WINNING_SCORE;
            
            const result = checkGameOver(gameState);
            
            assert.strictEqual(result.gameOver, true);
            assert.strictEqual(result.winningTeam, 'north+south');
            assert.strictEqual(result.currentPhase, GAME_PHASES.GAME_OVER);
            
            // Should add game over message
            assert.ok(result.messages.some(m => 
                m.type === 'game_over' && 
                m.text.includes('north+south wins the game!')
            ));
            
            // Should update match stats
            assert.strictEqual(result.matchStats.gamesPlayed, 1);
            assert.strictEqual(result.matchStats.teamWins['north+south'], 1);
        });
        
        it('should not detect game over when no team has won', function() {
            // Scores are below winning threshold
            gameState.scores = { 'north+south': 0, 'east+west': 0 };
            
            const result = checkGameOver(gameState);
            
            assert.strictEqual(result.gameOver, undefined);
            assert.strictEqual(result.winningTeam, undefined);
            assert.strictEqual(result.currentPhase, GAME_PHASES.SCORING);
        });
    });

    describe('startNewGame', function() {
        it('should reset the game state for a new game', function() {
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
            assert.strictEqual(result.gameOver, false);
            assert.strictEqual(result.winningTeam, null);
            assert.strictEqual(result.currentPhase, GAME_PHASES.LOBBY);
            assert.deepStrictEqual(result.players, {});
            
            // Should reset scores
            assert.deepStrictEqual(result.scores, {
                'north+south': 0,
                'east+west': 0
            });
            
            // Should keep match stats
            assert.strictEqual(result.matchStats.gamesPlayed, 1);
            
            // Should add new game message
            assert.ok(result.messages.some(m => 
                m.type === 'game' && 
                m.text.includes('A new game is starting!')
            ));
        });
    });
});
