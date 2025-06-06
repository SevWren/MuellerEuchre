/**
 * @file server3.basic.unit.test.js - Unit tests for Euchre server basic functionality
 * @module test/server3.basic
 * @description Test suite for basic Euchre server functionality, including:
 * - Game state initialization
 * - Lobby and game phases
 * - Deck creation and shuffling
 * - Error handling for invalid actions
 * 
 * @requires chai
 * @requires ../../server3.mjs
 * @see {@link module:server3} for the implementation being tested
 * 
 * @test {gameState} - Test for game state initialization
 * @test {deck} - Test for deck creation and shuffling
 * @test {errorHandling} - Tests for error handling
 */

import { expect } from 'chai';
import { createTestServer } from './test-utils.js';
// Assuming createDeck and shuffleDeck are now correctly sourcing their constants
// from server3.mjs (which imports them from src/utils/deck.js -> src/config/constants.js)
import { createDeck, shuffleDeck } from '../../server3.mjs';

// Conditional global log mock - only if not already defined (e.g. by test runner setup)
// This is a temporary workaround. Ideally, logging is handled by importing the logger module
// and stubbing it with Sinon, or passed via dependency injection.
if (typeof global !== 'undefined' && typeof global.log === 'undefined') {
    global.log = (level, message) => {
        // No-op for these specific tests, assuming detailed logging isn't asserted here.
        // console.log(`[Global Mock Log] ${level}: ${message}`); // Uncomment for debugging
    };
}


describe('server3.mjs - Basic Functionality', function() {
    let server, gameState;

    beforeEach(() => {
        try {
            const result = createTestServer();
            ({ server, gameState } = result); // logStub is also returned by createTestServer if needed
        } catch (error) {
            console.error('Error in beforeEach of basic.unit.test.js:', error);
            throw error; // Re-throw to ensure test runner catches setup failures
        }
    });

    describe('Game Initialization', () => {
        it('should initialize with correct default game state', () => {
            expect(gameState).to.be.an('object');
            expect(gameState.gamePhase).to.equal('LOBBY'); // Assuming LOBBY is a string, not from imported GAME_PHASES
            expect(gameState.playerSlots).to.have.members(['south', 'west', 'north', 'east']);
            expect(gameState.players).to.have.all.keys('south', 'west', 'north', 'east');
            expect(gameState.team1Score).to.equal(0);
            expect(gameState.team2Score).to.equal(0);
        });
    });

    describe('Deck Functions', () => {
        it('should create a standard Euchre deck', () => {
            const deck = createDeck();
            expect(deck).to.be.an('array').with.lengthOf(24);
            
            const suitsInDeck = new Set(deck.map(card => card.suit));
            const valuesInDeck = new Set(deck.map(card => card.value));
            
            // Constants for assertion - these should ideally be imported from src/config/constants.js
            // to avoid magic strings/arrays if tests need to be very specific about them.
            // However, for testing createDeck, we rely on createDeck itself to use the correct constants.
            expect([...suitsInDeck]).to.have.members(['hearts', 'diamonds', 'clubs', 'spades']);
            expect([...valuesInDeck]).to.have.members(['9', '10', 'J', 'Q', 'K', 'A']);
        });

        it('should shuffle the deck', () => {
            const originalDeck = createDeck(); // Get a fresh deck
            const deckToShuffle = [...originalDeck]; // Create a copy for shuffling
            const shuffledDeck = shuffleDeck(deckToShuffle); // shuffleDeck should modify in place or return modified
            
            expect(shuffledDeck).to.have.lengthOf(originalDeck.length);
            // Ensure all original cards are present in the shuffled deck
            expect(shuffledDeck.map(c => c.id).sort()).to.deep.equal(originalDeck.map(c => c.id).sort());
            
            // Check that the order is different (statistically likely for a good shuffle)
            expect(shuffledDeck.map(c => c.id)).to.not.eql(originalDeck.map(c => c.id),
                "Shuffled deck should not be in the exact same order as original (rare chance of intermittent failure)");
        });
    });
});
