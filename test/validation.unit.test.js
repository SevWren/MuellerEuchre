import { isValidPlay, serverIsValidPlay } from '../src/game/logic/validation.js';
import { GAME_PHASES } from '../src/config/constants.js';
import assert from 'assert';

describe('Validation Module', function() {
    let gameState;

    beforeEach(() => {
        // Setup a basic game state for testing
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

    describe('isValidPlay', function() {
        it('should validate a valid lead card', function() {
            const result = isValidPlay(gameState, 'south', { suit: 'spades', rank: 'K' });
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.message, 'Valid lead');
        });

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

        it('should validate when player has no cards of led suit', function() {
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

    describe('serverIsValidPlay (backward compatibility)', function() {
        it('should work with the legacy function signature', function() {
            const result = serverIsValidPlay('south', { suit: 'spades', rank: 'K' }, gameState);
            assert.strictEqual(result, true);
        });

        it('should throw if gameState is missing', function() {
            assert.throws(
                () => serverIsValidPlay('south', { suit: 'spades', rank: 'K' }),
                /gameState is required/
            );
        });
    });
});
