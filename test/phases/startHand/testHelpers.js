/**
 * @file testHelpers.js - Test utilities for startHand module tests
 * @module test/phases/startHand/testHelpers
 * @description Provides reusable test utilities and mocks for Euchre game tests
 */

/**
 * Creates a standard Euchre deck for testing
 * @returns {Array} Array of card objects
 * @typedef {Object} Card
 * @property {string} rank - Card rank (9, 10, J, Q, K, A)
 * @property {string} suit - Card suit (hearts, diamonds, clubs, spades)
 * @example
 * [
 *   {rank: '9', suit: 'hearts'},
 *   {rank: '10', suit: 'hearts'},
 *   {rank: 'J', suit: 'hearts'},
 *   {rank: 'Q', suit: 'hearts'},
 *   {rank: 'K', suit: 'hearts'},
 *   {rank: 'A', suit: 'hearts'},
 *   // ...
 * ]
 */
export const createDeck = () => {
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
 * Creates a basic game state for testing
 * @returns {Object} Initial game state
 */
export const createBasicGameState = () => ({
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
    deck: [],
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
});