const { scoreCurrentHand, resetGame } = require('../src/game/phases/scoring.js');
const { GAME_PHASES } = require('../src/config/constants.js');
const assert = require('assert');

describe('Scoring Module', function() {
    let gameState;

    beforeEach(() => {
        // Setup a basic game state for testing
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

    describe('scoreCurrentHand', function() {
        it('should award 1 point for making the bid (3 tricks)', function() {
            // Setup - makers take 3 tricks
            gameState.players.north.tricksWon = 2;
            gameState.players.south.tricksWon = 1;
            gameState.players.east.tricksWon = 1;
            gameState.players.west.tricksWon = 1;

            const result = scoreCurrentHand(gameState);
            
            assert.strictEqual(result.scores['north+south'], 1);
            assert.strictEqual(result.scores['east+west'], 0);
            assert.strictEqual(result.currentPhase, GAME_PHASES.BETWEEN_HANDS);
        });

        it('should award 2 points for a march (5 tricks)', function() {
            // Setup - makers take all 5 tricks
            gameState.players.north.tricksWon = 3;
            gameState.players.south.tricksWon = 2;

            const result = scoreCurrentHand(gameState);
            
            assert.strictEqual(result.scores['north+south'], 2);
            assert.strictEqual(result.scores['east+west'], 0);
        });

        it('should award 4 points for a lone hand march', function() {
            // Setup - going alone and taking all 5 tricks
            gameState.goingAlone = true;
            gameState.playerGoingAlone = 'north';
            gameState.players.north.tricksWon = 5;
            gameState.players.south.tricksWon = 0;

            const result = scoreCurrentHand(gameState);
            
            assert.strictEqual(result.scores['north+south'], 4);
        });

        it('should euchre the makers if they take < 3 tricks', function() {
            // Setup - makers take only 2 tricks
            gameState.players.north.tricksWon = 1;
            gameState.players.south.tricksWon = 1;
            gameState.players.east.tricksWon = 2;
            gameState.players.west.tricksWon = 1;

            const result = scoreCurrentHand(gameState);
            
            assert.strictEqual(result.scores['east+west'], 2);
            assert.strictEqual(result.scores['north+south'], 0);
        });

        it('should declare a winner if score reaches 10', function() {
            // Setup - makers have 9 points and make their bid
            gameState.scores = { 'north+south': 9, 'east+west': 5 };
            gameState.players.north.tricksWon = 3;
            gameState.players.south.tricksWon = 0;

            const result = scoreCurrentHand(gameState);
            
            assert.strictEqual(result.currentPhase, GAME_PHASES.GAME_OVER);
            assert.strictEqual(result.winner, 'north+south');
        });
    });

    describe('resetGame', function() {
        it('should reset the game state for a new game', function() {
            const result = resetGame({
                scores: { 'north+south': 5, 'east+west': 3 },
                dealer: 'east',
                currentPhase: GAME_PHASES.GAME_OVER,
                messages: ['Game over!']
            });
            
            assert.deepStrictEqual(result.scores, { 'north+south': 0, 'east+west': 0 });
            assert.strictEqual(result.currentPhase, GAME_PHASES.LOBBY);
            assert.strictEqual(result.messages[0].text, 'New game started! Waiting for players...');
        });
    });
});
