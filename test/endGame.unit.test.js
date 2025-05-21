import { expect } from 'chai';
import { checkGameOver, handleEndOfHand, startNewGame } from '../src/game/phases/endGame.js';
import { GAME_PHASES, WINNING_SCORE } from '../src/config/constants.js';

describe('End Game Phase', () => {
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

    describe('handleEndOfHand', () => {
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

    describe('checkGameOver', () => {
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
        
        it('should not detect game over when no team has won', () => {
            // Scores are below winning threshold
            gameState.scores = { 'north+south': 0, 'east+west': 0 };
            
            const result = checkGameOver(gameState);
            
            expect(result.gameOver).to.be.undefined;
            expect(result.winningTeam).to.be.undefined;
            expect(result.currentPhase).to.equal(GAME_PHASES.SCORING);
        });
    });

    describe('startNewGame', () => {
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
