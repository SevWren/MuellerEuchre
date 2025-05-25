/**
 * @file startNewHand.unit.test.js - Unit tests for the StartNewHand module
 * @module StartNewHandUnitTest
 * @description Unit tests for the StartNewHand module
 * @requires chai
 * @see ../src/startNewHand.unit.js
 */

import { startNewHand, dealCards } from '../src/game/phases/startNewHand.js';
import { GAME_PHASES } from '../src/config/constants.js';
import assert from "assert";

// Helper to create a simple deck for testing
const createDeck = () => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    return deck;
};

describe('Start New Hand Module', function() {
    let gameState;
    
    // Set up test data before each test
    beforeEach(function() {
        gameState = {
            players: {
                north: { hand: [] },
                east: { hand: [] },
                south: { hand: [] },
                west: { hand: [] }
            },
            playerOrder: ['north', 'east', 'south', 'west'],
            dealer: 'north',
            initialDealerForSession: 'north',
            currentPhase: GAME_PHASES.ROUND_END,
            currentPlayer: 'east',
            deck: []
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
                /playerOrder must be a non-empty array/
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
            [null, undefined].forEach((state) => {
                let errorThrown = false;
                try {
                    startNewHand(state);
                } catch (e) {
                    errorThrown = true;
                    assert.match(e.message, /Invalid game state: gameState is required/);
                }
                assert.ok(errorThrown, 'Expected an error to be thrown');
            });
        });

        // Edge Case 4: Missing player objects
        it('should throw error when player objects are missing', function() {
            const stateWithMissingPlayers = {
                ...gameState,
                players: { north: { hand: [] } } // Missing other players
            };
            
            assert.throws(
                () => startNewHand(stateWithMissingPlayers),
                /players object is missing or invalid/
            );
        });
        
        // New test: Invalid dealer in playerOrder
        it('should throw error when dealer is not in playerOrder', function() {
            const stateWithInvalidDealer = {
                ...gameState,
                dealer: 'invalidPlayer',
                initialDealerForSession: 'invalidPlayer'
            };
            
            assert.throws(
                () => startNewHand(stateWithInvalidDealer),
                /Dealer not found in playerOrder/
            );
        });
        
        // Test basic deck creation and dealing
        it('should create a deck and deal cards successfully', function() {
            const state = {
                ...gameState,
                deck: createDeck()
            };
            
            const result = startNewHand(state);
            
            // Basic validation of the result
            assert.ok(Array.isArray(result.players.north.hand));
            assert.ok(Array.isArray(result.players.east.hand));
            assert.ok(Array.isArray(result.players.south.hand));
            assert.ok(Array.isArray(result.players.west.hand));
            assert.ok(Array.isArray(result.kitty));
            
            // Verify game phase was updated to DEALING
            assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
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
            // Should set phase to DEALING
            assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
        });

        // Edge Case 7: Non-standard player order
        it('should handle non-standard player order', function() {
            const customOrderState = {
                ...gameState,
                playerOrder: ['east', 'south', 'west', 'north'],
                dealer: 'east',
                currentPlayer: 'east'
            };
            
            const result = startNewHand(customOrderState);
            
            // Should set phase to DEALING
            assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
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
                dealer: 'invalid',
                initialDealerForSession: 'invalid'
            };
            
            assert.throws(
                () => startNewHand(invalidDealerState),
                /Dealer not found in playerOrder/
            );
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
                dealer: 'player0',
                currentPlayer: 'player1',
                initialDealerForSession: 'player0',
                players: manyPlayers.reduce((acc, p) => ({
                    ...acc,
                    [p]: { hand: [], tricksWon: 0 }
                }), {})
            };
            const result = startNewHand(manyPlayersState);
            // Should handle any number of players
            assert.strictEqual(result.playerOrder.length, 10);
            // Should set phase to DEALING
            assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
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
        it('should handle insufficient cards during dealing', function() {
            const state = {
                ...gameState,
                deck: [
                    // Not enough cards for all players + kitty
                    { rank: '9', suit: 'hearts' },
                    { rank: '10', suit: 'hearts' },
                    { rank: 'J', suit: 'hearts' },
                    { rank: 'Q', suit: 'hearts' },
                    { rank: 'K', suit: 'hearts' },
                    { rank: 'A', suit: 'hearts' }
                ]
            };
            
            assert.throws(
                () => dealCards(state),
                /Not enough cards to complete the deal/
            );
        });
        
        it('should handle missing current player in playerOrder', function() {
            const state = {
                ...gameState,
                playerOrder: ['north', 'east', 'south'], // Missing 'west'
                currentPlayer: 'west',
                deck: createDeck()
            };
            
            assert.throws(
                () => dealCards(state),
                /Current player west not found in playerOrder/
            );
        });
        
        it('should handle missing players during dealing', function() {
            const state = {
                ...gameState,
                playerOrder: ['north', 'east', 'south', 'west'],
                players: {
                    north: { hand: [] },
                    east: { hand: [] },
                    south: { hand: [] }
                    // west player is missing
                },
                deck: createDeck()
            };
            
            assert.throws(
                () => dealCards(state),
                /players object is missing or invalid/
            );
        });
        
        it('should handle partial deals when running out of cards', function() {
            const state = {
                ...gameState,
                deck: [
                    // Only 3 cards in the deck, not enough for a full deal
                    { rank: '9', suit: 'hearts' },
                    { rank: '10', suit: 'hearts' },
                    { rank: 'J', suit: 'hearts' }
                ]
            };
            
            assert.throws(
                () => dealCards(state),
                /Not enough cards to complete the deal/
            );
        });
        
        it('should deal cards to all players', function() {
            // First start a new hand to get a fresh deck
            const state = startNewHand(gameState);
            
            // Then deal cards
            const result = dealCards(state);
            
            // Each player should have 5 cards
            gameState.playerOrder.forEach(player => {
                assert.strictEqual(result.players[player].hand.length, 5);
            });
            
            // There should be one up card
            assert.ok(result.upCard);
            assert.strictEqual(typeof result.upCard.rank, 'string');
            assert.strictEqual(typeof result.upCard.suit, 'string');
            
            // The deck should be empty after dealing
            assert.strictEqual(result.deck.length, 0);
            
            // The kitty should contain the remaining cards
            assert.ok(Array.isArray(result.kitty));
            
            // Skip log verification as it's not critical for this test
            
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
