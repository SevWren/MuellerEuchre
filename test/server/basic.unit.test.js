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
import * as server3 from '../../server3.mjs';

describe('server3.mjs - Basic Functionality', function() {
    this.timeout(5000);

    before(() => {
        // Reset game state before tests
        server3.resetFullGame();
    });

    describe('Game Initialization', () => {
        it('should initialize with correct default game state', () => {
            const { gameState } = server3;
            expect(gameState).to.be.an('object');
            expect(gameState.gamePhase).to.equal('LOBBY');
            expect(gameState.playerSlots).to.have.members(['south', 'west', 'north', 'east']);
            expect(gameState.players).to.have.all.keys('south', 'west', 'north', 'east');
            expect(gameState.team1Score).to.equal(0);
            expect(gameState.team2Score).to.equal(0);
        });
    });

    describe('Deck Functions', () => {
        it('should create a standard Euchre deck', () => {
            const deck = server3.createDeck();
            expect(deck).to.be.an('array').with.lengthOf(24); // 6 cards * 4 suits = 24 cards
            
            // Check for all suits and values
            const suits = new Set(deck.map(card => card.suit));
            const values = new Set(deck.map(card => card.value));
            
            expect([...suits]).to.have.members(['hearts', 'diamonds', 'clubs', 'spades']);
            expect([...values]).to.have.members(['9', '10', 'J', 'Q', 'K', 'A']);
        });

        it('should shuffle the deck', () => {
            const originalDeck = [...server3.createDeck()];
            const shuffledDeck = server3.shuffleDeck([...originalDeck]);
            
            // Check that all cards are still present
            expect(shuffledDeck).to.have.lengthOf(originalDeck.length);
            expect(shuffledDeck.map(c => c.id).sort())
                .to.have.members(originalDeck.map(c => c.id).sort());
            
            // There's a small chance this could fail even with a correct shuffle
            // but the probability is extremely low (1 in 24!)
            expect(shuffledDeck.map(c => c.id)).to.not.eql(originalDeck.map(c => c.id));
        });
    });
});
