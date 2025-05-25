import { startNewHand, dealCards } from '../src/game/phases/startNewHand.js';
import { GAME_PHASES } from '../src/config/constants.js';
import assert from "assert";

describe('Start New Hand Module', function() {
    let gameState;

    beforeEach(() => {
        // Setup a basic game state for testing
        gameState = {
            playerOrder: ['north', 'east', 'south', 'west'],
            dealer: 'north',
            initialDealerForSession: null,
            players: {
                north: { hand: [], tricksWon: 0 },
                east: { hand: [], tricksWon: 0 },
                south: { hand: [], tricksWon: 0 },
                west: { hand: [], tricksWon: 0 }
            },
            deck: [],
            currentPhase: GAME_PHASES.LOBBY,
            tricks: [/* some trick data */],
            currentTrick: [/* some card data */],
            trumpSuit: 'hearts'
        };
    });

    describe('startNewHand', function() {
        // Basic functionality
        it('should rotate dealer and set up a new hand', function() {
            const result = startNewHand(gameState);
            
            // Dealer should rotate to east (next player after north)
            assert.strictEqual(result.dealer, 'east');
            // Current player should be south (left of dealer)
            assert.strictEqual(result.currentPlayer, 'south');
            // Should have reset hand-specific state
            assert.strictEqual(result.tricks.length, 0);
            assert.strictEqual(result.currentTrick.length, 0);
            assert.strictEqual(result.trumpSuit, null);
            // Should have set initial dealer for session
            assert.strictEqual(result.initialDealerForSession, 'north');
            // Should have created a new deck
            assert.strictEqual(result.deck.length, 24); // 24 cards in a euchre deck
            // Should update game phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
        });

        // Edge Case 1: Empty player order
        it('should throw error when playerOrder is empty', function() {
            const emptyState = { ...gameState, playerOrder: [] };
            assert.throws(
                () => startNewHand(emptyState),
                /playerOrder cannot be empty/
            );
        });

        // Edge Case 2: Single player
        it('should work with a single player', function() {
            const singlePlayerState = {
                ...gameState,
                playerOrder: ['north'],
                players: { north: { hand: [], tricksWon: 0 } }
            };
            const result = startNewHand(singlePlayerState);
            assert.strictEqual(result.dealer, 'north');
            assert.strictEqual(result.currentPlayer, 'north');
        });

        // Edge Case 3: Null/undefined game state
        it('should throw error when gameState is null or undefined', function() {
            assert.throws(
                () => startNewHand(null),
                /gameState is required/
            );
            assert.throws(
                () => startNewHand(undefined),
                /gameState is required/
            );
        });

        // Edge Case 4: Missing player objects
        it('should handle missing player objects', function() {
            const stateWithMissingPlayers = {
                ...gameState,
                players: { north: { hand: [] } } // Missing other players
            };
            const result = startNewHand(stateWithMissingPlayers);
            // Should still work, but missing players won't be able to play
            assert.strictEqual(result.dealer, 'east');
        });

        // Edge Case 5: Custom initial dealer
        it('should not overwrite initialDealerForSession', function() {
            const customState = {
                ...gameState,
                initialDealerForSession: 'custom'
            };
            const result = startNewHand(customState);
            assert.strictEqual(result.initialDealerForSession, 'custom');
        });

        // Edge Case 6: Partial deck
        it('should handle partial deck', function() {
            const partialDeckState = {
                ...gameState,
                deck: [{ suit: 'hearts', rank: '9' }] // Only one card
            };
            const result = startNewHand(partialDeckState);
            // Should still create a new deck
            assert.strictEqual(result.deck.length, 24);
        });

        // Edge Case 7: Non-standard player order
        it('should handle non-standard player order', function() {
            const customOrderState = {
                ...gameState,
                playerOrder: ['east', 'south', 'west', 'north']
            };
            const result = startNewHand(customOrderState);
            // Dealer should rotate to south (next in custom order)
            assert.strictEqual(result.dealer, 'south');
        });

        // Edge Case 8: Missing deck property
        it('should handle missing deck property', function() {
            const { deck, ...stateWithoutDeck } = gameState;
            const result = startNewHand(stateWithoutDeck);
            // Should create a new deck
            assert.strictEqual(result.deck.length, 24);
        });

        // Edge Case 9: Non-empty game state
        it('should reset game state', function() {
            const nonEmptyState = {
                ...gameState,
                tricks: [1, 2, 3],
                currentTrick: [4, 5, 6],
                trumpSuit: 'hearts'
            };
            const result = startNewHand(nonEmptyState);
            assert.strictEqual(result.tricks.length, 0);
            assert.strictEqual(result.currentTrick.length, 0);
            assert.strictEqual(result.trumpSuit, null);
        });

        // Edge Case 10: Invalid dealer value
        it('should handle invalid dealer value', function() {
            const invalidDealerState = {
                ...gameState,
                dealer: 'invalid'
            };
            // Should default to first player in playerOrder
            const result = startNewHand(invalidDealerState);
            assert.strictEqual(result.dealer, 'east');
        });

        // Edge Case 11: Consecutive hands with custom state
        it('should handle multiple hands with custom state', function() {
            let result = startNewHand(gameState);
            assert.strictEqual(result.dealer, 'east');
            
            // Add some custom state
            result.customState = 'test';
            
            // Start another hand
            result = startNewHand(result);
            assert.strictEqual(result.dealer, 'south');
            // Custom state should be preserved
            assert.strictEqual(result.customState, 'test');
        });

        // Edge Case 12: Missing required properties
        it('should handle missing required properties', function() {
            const minimalState = { playerOrder: ['north'], players: { north: {} } };
            const result = startNewHand(minimalState);
            // Should still work with minimal valid state
            assert.ok(result);
        });

        // Edge Case 13: Large number of players
        it('should handle many players', function() {
            const manyPlayers = Array(10).fill().map((_, i) => `player${i}`);
            const manyPlayersState = {
                ...gameState,
                playerOrder: manyPlayers,
                players: manyPlayers.reduce((acc, p) => ({
                    ...acc,
                    [p]: { hand: [], tricksWon: 0 }
                }), {})
            };
            const result = startNewHand(manyPlayersState);
            // Should handle any number of players
            assert.strictEqual(result.playerOrder.length, 10);
        });

        // Edge Case 14: Duplicate players
        it('should handle duplicate players', function() {
            const duplicateState = {
                ...gameState,
                playerOrder: ['north', 'north', 'south', 'south']
            };
            const result = startNewHand(duplicateState);
            // Should still work, though it's not a valid game state
            assert.strictEqual(result.dealer, 'north');
        });

        // Edge Case 15: Custom card values
        it('should handle custom deck', function() {
            const customDeckState = {
                ...gameState,
                deck: [
                    { suit: 'stars', rank: '1' },
                    { suit: 'moons', rank: '2' }
                ]
            };
            const result = startNewHand(customDeckState);
            // Should use the custom deck as is
            assert.strictEqual(result.deck.length, 2);
        });

        // Edge Case 16: Game phase transitions
        it('should always set phase to DEALING', function() {
            const phases = Object.values(GAME_PHASES);
            phases.forEach(phase => {
                const phaseState = { ...gameState, currentPhase: phase };
                const result = startNewHand(phaseState);
                assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
            });
        });

        // Edge Case 17: Player with existing hand
        it('should reset player hands', function() {
            const withHands = {
                ...gameState,
                players: {
                    north: { hand: ['card1', 'card2'], tricksWon: 5 },
                    east: { hand: ['card3'], tricksWon: 3 },
                    south: { hand: ['card4', 'card5', 'card6'], tricksWon: 1 },
                    west: { hand: [], tricksWon: 0 }
                }
            };
            const result = startNewHand(withHands);
            // All hands should be reset
            Object.values(result.players).forEach(player => {
                assert.strictEqual(player.hand.length, 0);
            });
        });

        // Edge Case 18: Multiple sessions
        it('should only set initialDealerForSession once', function() {
            // First hand
            let result = startNewHand(gameState);
            assert.strictEqual(result.initialDealerForSession, 'north');
            
            // Second hand
            result = startNewHand(result);
            assert.strictEqual(result.initialDealerForSession, 'north'); // Shouldn't change
        });
    });

    describe('dealCards', function() {
        it('should deal cards to all players', function() {
            // First start a new hand to get a fresh deck
            let result = startNewHand(gameState);
            
            // Then deal cards
            result = dealCards(result);
            
            // Each player should have 5 cards
            Object.values(result.players).forEach(player => {
                assert.strictEqual(player.hand.length, 5);
            });
            
            // Should have set the up card and kitty
            assert.ok(result.upCard);
            assert.strictEqual(result.kitty.length, 3); // 24 cards - (4 players * 5 cards) - 1 up card = 3 cards in kitty
            
            // Should update game phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.ORDER_UP_ROUND1);
        });

        it('should handle dealing with a custom deck', function() {
            // Create a test deck with known cards
            const testDeck = [
                { suit: 'hearts', rank: '9' }, { suit: 'hearts', rank: '10' }, 
                { suit: 'hearts', rank: 'J' }, { suit: 'hearts', rank: 'Q' },
                { suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: 'A' },
                { suit: 'diamonds', rank: '9' }, { suit: 'diamonds', rank: '10' },
                { suit: 'diamonds', rank: 'J' }, { suit: 'diamonds', rank: 'Q' },
                { suit: 'diamonds', rank: 'K' }, { suit: 'diamonds', rank: 'A' },
                { suit: 'clubs', rank: '9' }, { suit: 'clubs', rank: '10' },
                { suit: 'clubs', rank: 'J' }, { suit: 'clubs', rank: 'Q' },
                { suit: 'clubs', rank: 'K' }, { suit: 'clubs', rank: 'A' },
                { suit: 'spades', rank: '9' }, { suit: 'spades', rank: '10' },
                { suit: 'spades', rank: 'J' }, { suit: 'spades', rank: 'Q' },
                { suit: 'spades', rank: 'K' }, { suit: 'spades', rank: 'A' }
            ];
            
            // Start a new hand with the test deck
            let result = startNewHand(gameState);
            result.deck = [...testDeck];
            
            // Deal cards
            result = dealCards(result);
            
            // Check that cards were dealt in the correct order
            // North should get the first 2 cards (hearts 9, 10)
            assert.deepStrictEqual(
                result.players.north.hand.slice(0, 2),
                [{ suit: 'hearts', rank: '9' }, { suit: 'hearts', rank: '10' }]
            );
            
            // Up card should be the last card in the deck (spades A)
            assert.deepStrictEqual(result.upCard, { suit: 'spades', rank: 'A' });
        });
    });
});
