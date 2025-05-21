const { startNewHand, dealCards } = require('../src/game/phases/startNewHand.js');
const { GAME_PHASES } = require('../src/config/constants.js');
const assert = require('assert');

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
            currentPhase: GAME_PHASES.LOBBY
        };
    });

    describe('startNewHand', function() {
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

        it('should handle multiple hand rotations', function() {
            // First hand
            let result = startNewHand(gameState);
            assert.strictEqual(result.dealer, 'east');
            
            // Second hand
            result = startNewHand(result);
            assert.strictEqual(result.dealer, 'south');
            
            // Third hand
            result = startNewHand(result);
            assert.strictEqual(result.dealer, 'west');
            
            // Fourth hand (should wrap around)
            result = startNewHand(result);
            assert.strictEqual(result.dealer, 'north');
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
