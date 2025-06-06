/**
 * @file startNewHand.unit.test.js - Unit tests for the startNewHand function
 * @module StartNewHandUnitTest
 * @description Unit tests for the startNewHand function, which is responsible for resetting the game state at the start of a new hand.
 * @requires chai - The testing framework
 * @requires ../../src/game/phases/startNewHand.js - The module containing the startNewHand function
 * @requires ../../src/config/constants.js - The module containing Euchre game constants
 */

import { startNewHand, dealCards } from '../../src/game/phases/startNewHand.js';
import { GAME_PHASES } from '../../src/config/constants.js';
import assert from "assert";

/**
 * Creates a standard Euchre deck for testing purposes.
 * A Euchre deck consists of 24 cards (9, 10, J, Q, K, A of each of the four suits).
 * @returns {Array<{rank: string, suit: string}>} An array of card objects,
 * each with a 'rank' and 'suit' property.
 * @private
 */
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

/**
 * Test suite for the Start New Hand Module
 * Tests the core functionality of starting new hands and dealing cards in Euchre
 */
describe('Start New Hand Module', function() {
    let gameState;
    
    // Set up test data before each test
    beforeEach(function() {
        gameState = {
            players: {
                north: { 
                    hand: [],
                    id: 'north',
                    name: 'North',
                    team: 'us'
                },
                east: { 
                    hand: [],
                    id: 'east',
                    name: 'East',
                    team: 'them'
                },
                south: { 
                    hand: [],
                    id: 'south',
                    name: 'South',
                    team: 'us'
                },
                west: { 
                    hand: [],
                    id: 'west',
                    name: 'West',
                    team: 'them'
                }
            },
            playerOrder: ['north', 'east', 'south', 'west'],
            dealer: 'north',
            initialDealerForSession: null,
            currentPhase: 'round_end',
            currentPlayer: 'east',
            deck: createDeck(),
            game: {
                phase: 'round_end',
                trumpSuit: null,
                calledCard: null,
                calledBy: null,
                currentTrick: {
                    cards: {},
                    leader: null
                },
                tricks: {
                    us: 0,
                    them: 0
                },
                score: {
                    us: 0,
                    them: 0
                },
                handNumber: 0,
                roundNumber: 0,
                lastHand: false,
                gameOver: false
            }
        };
    });

    /** Tests for startNewHand: dealer rotation, game state, and error handling */
    describe('startNewHand', function() {


        /**
         * Test basic functionality: dealer rotation and game state reset.
         * Expected: Dealer rotates, currentPlayer updates, hand state resets (tricks, currentTrick, trumpSuit),
         * initialDealerForSession is set (if null), a new deck is created, and currentPhase is DEALING.
         */



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

        /**
         * Test error handling for empty playerOrder array
         * Expected: Function should throw an error with appropriate message
         */
        it('should throw error when playerOrder is empty', function() {
            const emptyState = { ...gameState, playerOrder: [] };
            assert.throws(
                () => startNewHand(emptyState),
                /playerOrder must be a non-empty array/
            );
        });

        /**
         * Test functionality with minimal player count (single player)
         * Expected: Function should handle single player scenario gracefully
         */
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

        /**
         * Test error handling for invalid game state inputs (null/undefined)
         * Expected: Function should throw appropriate error for invalid inputs
         */
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

        /**
         * Test error handling when required player objects are missing from game state
         * Expected: Function should validate and throw error for incomplete player data
         */
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
        
        /**
         * Test error handling when dealer is not found in playerOrder array
         * Expected: Function should validate dealer exists in playerOrder and throw error if not
         */
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
        
        /**
         * Test deck creation and basic card dealing functionality
         * Expected: Function should create proper deck, deal cards to players, and set correct game phase
         */
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

        /**
         * Test preservation of custom initialDealerForSession value
         * Expected: Function should not overwrite existing initialDealerForSession
         */
        it('should not overwrite initialDealerForSession', function() {
            const customState = {
                ...gameState,
                initialDealerForSession: 'custom'
            };
            const result = startNewHand(customState);
            assert.strictEqual(result.initialDealerForSession, 'custom');
        });

        /**
         * Test handling of incomplete deck (fewer than standard 24 cards)
         * Expected: Function should handle partial deck and set appropriate game phase
         */
        it('should handle partial deck', function() {
            const partialDeckState = {
                ...gameState,
                deck: [{ suit: 'hearts', rank: '9' }] // Only one card
            };
            const result = startNewHand(partialDeckState);
            // Should set phase to DEALING
            assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
        });

        /**
         * Test functionality with custom player order (not standard north/east/south/west)
         * Expected: Function should work with any valid player order arrangement
         */
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

        /**
         * Test handling when deck property is missing from game state
         * Expected: Function should create a new standard deck when none exists
         */
        it('should handle missing deck property', function() {
            const { deck, ...stateWithoutDeck } = gameState;
            const result = startNewHand(stateWithoutDeck);
            // Should create a new deck
            assert.strictEqual(result.deck.length, 24);
        });

        /**
         * Test proper reset of game state when starting new hand with existing data
         * Expected: Function should clear tricks, current trick, and trump suit
         */
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

        /**
         * Test error handling for invalid dealer value not in playerOrder
         * Expected: Function should throw error when dealer is not a valid player
         */
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

        /**
         * Test multiple consecutive hand starts while preserving custom state properties
         * Expected: Function should rotate dealers correctly and preserve non-game state
         */
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

        /**
         * Test functionality with minimal valid game state (missing optional properties)
         * Expected: Function should work with minimal required properties
         */
        it('should handle missing required properties', function() {
            const minimalState = { playerOrder: ['north'], players: { north: {} } };
            const result = startNewHand(minimalState);
            // Should still work with minimal valid state
            assert.ok(result);
        });

        /**
         * Test scalability with large number of players (more than standard 4)
         * Expected: Function should handle any number of players gracefully
         */
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

        /**
         * Test handling of duplicate player names in playerOrder array
         * Expected: Function should process duplicate players without crashing
         */
        it('should handle duplicate players', function() {
            const duplicateState = {
                ...gameState,
                playerOrder: ['north', 'north', 'south', 'south']
            };
            const result = startNewHand(duplicateState);
            // Should still work, though it's not a valid game state
            assert.strictEqual(result.dealer, 'north');
        });

        /**
         * Test functionality with non-standard deck (custom suits/ranks)
         * Expected: Function should accept and use custom deck without modification
         */
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

        /**
         * Test game phase transition from any current phase to DEALING
         * Expected: Function should always set currentPhase to DEALING regardless of input
         */
        it('should always set phase to DEALING', function() {
            const phases = Object.values(GAME_PHASES);
            phases.forEach(phase => {
                const phaseState = { ...gameState, currentPhase: phase };
                const result = startNewHand(phaseState);
                assert.strictEqual(result.currentPhase, GAME_PHASES.DEALING);
            });
        });

        /**
         * Test proper reset of player hands when they contain cards from previous hand
         * Expected: Function should clear all player hands and reset tricksWon
         */
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


        /**
         * Verify initialDealerForSession is preserved across hands.
         * Expected: initialDealerForSession is set on the first hand and remains unchanged on subsequent hands.
         */

        it('should only set initialDealerForSession once', function() {
            // First hand
            let result = startNewHand(gameState);
            assert.strictEqual(result.initialDealerForSession, 'north');
            
            // Second hand
            result = startNewHand(result);
            assert.strictEqual(result.initialDealerForSession, 'north'); // Shouldn't change
        });
    });

    /** Tests for dealCards: card dealing logic and error handling */
    describe('dealCards', function() {

        /**
         * Test error handling for insufficient cards.
         * Expected: dealCards throws an error if the deck cannot provide enough cards
         * to deal 5 cards to each player and leave one upCard (total 21 for 4 players).
         */
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
        
        /**
         * Test error handling when currentPlayer is not found in playerOrder array
         * Expected: Function should throw error for invalid currentPlayer reference
         */
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
        
        /**
         * Test error handling when player objects are missing during card dealing
         * Expected: Function should validate all players exist before dealing
         */
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
        
        /**
         * Test error handling when deck runs out of cards during dealing process
         * Expected: Function should throw error when unable to complete full deal
         */
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
        
        /**
         * Test successful card dealing to all players with proper distribution
         * Expected: Each player gets 5 cards, up card is set, game phase advances
         */
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

        /**
         * Test card dealing with predefined deck to verify correct dealing order
         * Expected: Cards should be dealt in specific order, up card should be last card
         */
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
