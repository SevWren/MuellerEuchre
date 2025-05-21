const { handlePlayCard } = require('../src/game/phases/playPhase.js');
const { GAME_PHASES } = require('../src/config/constants.js');
const assert = require('assert');

describe('Play Phase', function() {
    let gameState;
    
    beforeEach(() => {
        // Setup a basic game state for testing
        gameState = {
            playerOrder: ['north', 'east', 'south', 'west'],
            dealer: 'south',
            currentPlayer: 'north',
            currentPhase: GAME_PHASES.PLAYING,
            trumpSuit: 'hearts',
            makerTeam: 'north+south',
            playerWhoCalledTrump: 'north',
            trickLeader: 'north',
            currentTrick: [],
            tricks: [],
            players: {
                north: { 
                    hand: [
                        { suit: 'hearts', rank: 'J' }, // Right bower (highest)
                        { suit: 'diamonds', rank: 'J' }, // Left bower (2nd highest)
                        { suit: 'hearts', rank: 'A' },
                        { suit: 'clubs', rank: '10' },
                        { suit: 'spades', rank: 'Q' }
                    ] 
                },
                east: { 
                    hand: [
                        { suit: 'hearts', rank: 'K' },
                        { suit: 'diamonds', rank: 'A' },
                        { suit: 'clubs', rank: 'A' },
                        { suit: 'spades', rank: 'A' },
                        { suit: 'hearts', rank: 'Q' }
                    ] 
                },
                south: { 
                    hand: [
                        { suit: 'hearts', rank: '10' },
                        { suit: 'diamonds', rank: 'K' },
                        { suit: 'clubs', rank: 'K' },
                        { suit: 'spades', rank: 'K' },
                        { suit: 'hearts', rank: '9' }
                    ] 
                },
                west: { 
                    hand: [
                        { suit: 'diamonds', rank: 'Q' },
                        { suit: 'diamonds', rank: '10' },
                        { suit: 'clubs', rank: 'Q' },
                        { suit: 'spades', rank: 'Q' },
                        { suit: 'clubs', rank: '9' }
                    ] 
                }
            },
            messages: []
        };
    });

    describe('handlePlayCard', function() {
        it('should handle first card of a trick', function() {
            const cardToPlay = { suit: 'clubs', rank: '10' };
            const result = handlePlayCard(gameState, 'north', cardToPlay);
            
            // Should update current trick
            assert.strictEqual(result.currentTrick.length, 1);
            assert.deepStrictEqual(result.currentTrick[0].card, cardToPlay);
            
            // Should remove card from player's hand
            assert.strictEqual(result.players.north.hand.length, 4);
            assert.ok(!result.players.north.hand.some(c => 
                c.suit === cardToPlay.suit && c.rank === cardToPlay.rank
            ));
            
            // Should update current player to next in rotation
            assert.strictEqual(result.currentPlayer, 'east');
            
            // Should add message about the play
            assert.ok(result.messages.some(m => 
                m.type === 'play' && 
                m.player === 'north' &&
                m.text.includes('north plays 10 of clubs')
            ));
        });
        
        it('should complete a trick when all players have played', function() {
            // North leads
            let result = handlePlayCard(gameState, 'north', { suit: 'clubs', rank: '10' });
            // East follows suit
            result = handlePlayCard(result, 'east', { suit: 'clubs', rank: 'A' });
            // South follows suit
            result = handlePlayCard(result, 'south', { suit: 'clubs', rank: 'K' });
            // West follows suit
            result = handlePlayCard(result, 'west', { suit: 'clubs', rank: 'Q' });
            
            // Should have completed the trick
            assert.strictEqual(result.tricks.length, 1);
            assert.strictEqual(result.currentTrick.length, 0);
            
            // East should have won with the Ace of clubs
            assert.strictEqual(result.tricks[0].winner, 'east');
            assert.strictEqual(result.tricks[0].team, 'east+west');
            
            // Should have added message about trick completion
            assert.ok(result.messages.some(m => 
                m.type === 'trick' && 
                m.winner === 'east' &&
                m.text.includes('east wins the trick for Team east+west!')
            ));
            
            // Next trick should be led by the winner
            assert.strictEqual(result.currentPlayer, 'east');
            assert.strictEqual(result.trickLeader, 'east');
        });
        
        it('should handle trump cards correctly', function() {
            // North leads with non-trump
            let result = handlePlayCard(gameState, 'north', { suit: 'clubs', rank: '10' });
            // East plays a trump (hearts is trump)
            result = handlePlayCard(result, 'east', { suit: 'hearts', rank: 'K' });
            // South must follow suit (clubs)
            result = handlePlayCard(result, 'south', { suit: 'clubs', rank: 'K' });
            // West must follow suit (clubs)
            result = handlePlayCard(result, 'west', { suit: 'clubs', rank: 'Q' });
            
            // East should win with the trump
            assert.strictEqual(result.tricks[0].winner, 'east');
        });
        
        it('should handle left bower as trump', function() {
            // North leads with non-trump
            let result = handlePlayCard(gameState, 'north', { suit: 'diamonds', rank: 'J' }); // Left bower
            // East plays a trump (hearts is trump)
            result = handlePlayCard(result, 'east', { suit: 'hearts', rank: 'K' });
            
            // North's left bower should count as trump and win
            assert.strictEqual(result.currentTrick[0].card.suit, 'diamonds');
            
            result = handlePlayCard(result, 'south', { suit: 'diamonds', rank: 'K' });
            result = handlePlayCard(result, 'west', { suit: 'diamonds', rank: 'Q' });
            
            // North should win with left bower (counts as trump)
            assert.strictEqual(result.tricks[0].winner, 'north');
        });
        
        it('should enforce following suit', function() {
            // North leads with clubs
            let result = handlePlayCard(gameState, 'north', { suit: 'clubs', rank: '10' });
            
            // East tries to play a spade but has clubs
            assert.throws(
                () => handlePlayCard(result, 'east', { suit: 'spades', rank: 'A' }),
                /Must follow suit/
            );
        });
        
        it('should handle end of hand', function() {
            // Simulate last trick
            gameState.players.north.hand = [{ suit: 'hearts', rank: 'J' }];
            gameState.players.east.hand = [{ suit: 'hearts', rank: 'K' }];
            gameState.players.south.hand = [{ suit: 'hearts', rank: '10' }];
            gameState.players.west.hand = [{ suit: 'hearts', rank: 'Q' }];
            
            // Play the last trick
            let result = handlePlayCard(gameState, 'north', { suit: 'hearts', rank: 'J' });
            result = handlePlayCard(result, 'east', { suit: 'hearts', rank: 'K' });
            result = handlePlayCard(result, 'south', { suit: 'hearts', rank: '10' });
            result = handlePlayCard(result, 'west', { suit: 'hearts', rank: 'Q' });
            
            // Should move to scoring phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.SCORING);
        });
    });
});
