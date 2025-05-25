/**
 * @file server3.playCard.unit.test.js - Unit tests for Euchre card playing logic
 * @module test/server3.playCard.unit
 * @description Comprehensive test suite for the card playing functionality in the Euchre server.
 * 
 * This test suite verifies the core game mechanics related to playing cards, including:
 * - Validation of card plays according to Euchre rules
 * - Trick resolution and winner determination
 * - Game state transitions during play
 * - Special card behaviors (trump, left bower, etc.)
 * - Error handling for invalid plays
 * 
 * @requires chai
 * @requires module
 * @see {@link module:server3} for the implementation being tested
 * 
 * @test {serverIsValidPlay} - Tests for card play validation
 * @test {handlePlayCard} - Tests for handling card play actions
 * @test {determineTrickWinner} - Tests for trick resolution
 */
import { expect } from 'chai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the server module
import * as server3 from '../server3.mjs';
const { gameState, resetFullGame, log } = server3;

/**
 * @description Test suite for Euchre card playing functionality.
 * This suite focuses on the core game mechanics related to playing cards,
 * including validation, trick resolution, and game state management.
 */
describe('Euchre Server Play Card Functions', function() {
    /** @type {Object} gameState - Reference to the server's game state */
    const { gameState } = server3;
    
    /** @type {Object} originalGameState - Snapshot of game state before tests */
    let originalGameState;
    
    /**
     * Before all tests, save the original game state and set up test environment.
     */
    before(() => {
        // Save original game state
        originalGameState = { ...server3.gameState };
        // Set up test environment
        server3.resetFullGame();
    });
    
    after(() => {
        // Restore original game state after all tests
        Object.assign(server3.gameState, originalGameState);
    });
    
    /**
     * Before each test, reset the game state to a known good state.
     * This ensures test isolation and prevents state leakage between tests.
     */
    beforeEach(() => {
        // Reset game state before each test
        server3.resetFullGame();
        
        // Set up test-specific state
        server3.gameState.players = {
            south: { 
                id: 'south-socket',
                hand: [],
                name: 'South',
                team: 1,
                score: 0,
                tricksTaken: 0,
                isConnected: true
            },
            west: {
                id: 'west-socket',
                hand: [],
                name: 'West',
                team: 2,
                score: 0,
                tricksTaken: 0,
                isConnected: true
            },
            north: {
                id: 'north-socket',
                hand: [],
                name: 'North',
                team: 1,
                score: 0,
                tricksTaken: 0,
                isConnected: true
            },
            east: { 
                id: 'east-socket',
                hand: [],
                name: 'East',
                team: 2,
                score: 0,
                tricksTaken: 0,
                isConnected: true,
                tricksTakenThisHand: 0
            }
        };
        
        // Set up test phase with complete initial state
        server3.gameState = {
            gamePhase: 'PLAYING_TRICKS',
            currentPlayer: 'south',
            currentTrickPlays: [],
            tricks: [],
            trumpSuit: 'hearts',
            goingAlone: false,
            players: {
                south: { 
                    id: 'south-socket',
                    name: 'South',
                    team: 1,
                    hand: [],
                    score: 0,
                    tricksTaken: 0,
                    tricksTakenThisHand: 0,
                    isConnected: true
                },
                west: {
                    id: 'west-socket',
                    name: 'West',
                    team: 2,
                    hand: [],
                    score: 0,
                    tricksTaken: 0,
                    tricksTakenThisHand: 0,
                    isConnected: true
                },
                north: {
                    id: 'north-socket',
                    name: 'North',
                    team: 1,
                    hand: [],
                    score: 0,
                    tricksTaken: 0,
                    tricksTakenThisHand: 0,
                    isConnected: true
                },
                east: {
                    id: 'east-socket',
                    name: 'East',
                    team: 2,
                    hand: [],
                    score: 0,
                    tricksTaken: 0,
                    tricksTakenThisHand: 0,
                    isConnected: true
                }
            }
        };
    });
    
    after(() => {
        // Restore original game state after all tests
        Object.assign(server3.gameState, originalGameState);
    });

    /**
     * @description Test suite for the serverIsValidPlay function.
     * Verifies that the server correctly validates card plays according to Euchre rules.
     */
    describe('serverIsValidPlay', function() {
        /**
         * @test {serverIsValidPlay}
         * @description Verifies that playing a card not in the player's hand is rejected.
         */
        it('should reject card not in hand', function() {
            server3.gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'A' }
            ];
            const result = server3.serverIsValidPlay('south', { id: 2, suit: 'hearts', value: 'K' });
            expect(result).to.be.false;
        });

        /**
         * @test {serverIsValidPlay}
         * @description Verifies that any card can be played when leading a trick.
         */
        it('should allow any card when leading trick', function() {
            server3.gameState.currentTrickPlays = [];
            server3.gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'A' }
            ];
            const result = server3.serverIsValidPlay('south', { id: 1, suit: 'hearts', value: 'A' });
            expect(result).to.be.true;
        });

        /**
         * @test {serverIsValidPlay}
         * @description Verifies that the left bower is treated as a trump card
         * and must follow suit when possible.
         */
        it('should enforce following suit with left bower', function() {
            server3.gameState.trump = 'hearts';
            server3.gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'diamonds', value: 'A' } }
            ];
            server3.gameState.players.south.hand = [
                { id: 1, suit: 'diamonds', value: 'J' },
                { id: 2, suit: 'spades', value: 'A' }
            ];
            const result = server3.serverIsValidPlay('south', { id: 2, suit: 'spades', value: 'A' });
            expect(result).to.be.false;
        });

        /**
         * @test {serverIsValidPlay}
         * @description Verifies that a player can play an off-suit card
         * when they don't have any cards of the led suit.
         */
        it('should allow off-suit when no matching cards', function() {
            server3.gameState.trump = 'hearts';
            server3.gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'diamonds', value: 'A' } }
            ];
            server3.gameState.players.south.hand = [
                { id: 1, suit: 'clubs', value: 'K' },
                { id: 2, suit: 'spades', value: 'A' }
            ];
            const result = server3.serverIsValidPlay('south', { id: 2, suit: 'spades', value: 'A' });
            expect(result).to.be.true;
        });
    });

    /**
     * @description Test suite for the handlePlayCard function.
     * Verifies the complete card playing flow, including game state updates.
     */
    describe('handlePlayCard', function() {
        it('should reject play when not in PLAYING_TRICKS phase', function() {
            // Setup test state
            const testState = JSON.parse(JSON.stringify(server3.gameState));
            testState.gamePhase = 'LOBBY';
            testState.currentPlayer = 'south';
            testState.players.south.hand = [{ id: 1, suit: 'hearts', value: 'A' }];
            
            // Execute
            const result = server3.handlePlayCard.call({ gameState: testState }, 'south', { id: 1, suit: 'hearts', value: 'A' });
            
            // Verify
            expect(result).to.be.false;
            expect(testState.currentTrickPlays).to.have.lengthOf(0);
        });

        it('should complete trick and assign winner correctly', function() {
            // Setup test state
            const testState = JSON.parse(JSON.stringify(server3.gameState));
            testState.gamePhase = 'PLAYING_TRICKS';
            testState.trumpSuit = 'hearts';
            testState.currentPlayer = 'east';
            testState.players.south.hand = [];
            testState.players.west.hand = [];
            testState.players.north.hand = [];
            testState.players.east.hand = [{ id: 4, suit: 'hearts', value: 'A' }];
            testState.currentTrickPlays = [
                { player: 'south', card: { suit: 'diamonds', value: 'K' } },
                { player: 'west', card: { suit: 'diamonds', value: 'A' } },
                { player: 'north', card: { suit: 'diamonds', value: 'Q' } }
            ];
            
            // Execute
            const result = server3.handlePlayCard.call({ gameState: testState }, 'east', { id: 4, suit: 'hearts', value: 'A' });
            
            // Verify
            expect(result).to.be.true;
            expect(testState.tricks).to.have.lengthOf(1);
            expect(testState.tricks[0].winner).to.equal('east');
            expect(testState.currentTrickPlays).to.have.lengthOf(0);
        });

        it('should handle going alone scenario with 3 players', function() {
            // Setup test state
            const testState = JSON.parse(JSON.stringify(server3.gameState));
            testState.gamePhase = 'PLAYING_TRICKS';
            testState.trumpSuit = 'spades';
            testState.goingAlone = true;
            testState.currentPlayer = 'east';
            
            // Remove north player for going alone scenario
            delete testState.players.north;
            
            // Set up player hands
            testState.players.south.hand = [];
            testState.players.west.hand = [];
            testState.players.east.hand = [{ id: 3, suit: 'diamonds', value: 'K' }];
            
            testState.currentTrickPlays = [
                { player: 'south', card: { suit: 'diamonds', value: 'A' } },
                { player: 'west', card: { suit: 'diamonds', value: 'Q' } }
            ];
            
            // Execute
            const result = server3.handlePlayCard.call({ gameState: testState }, 'east', { id: 3, suit: 'diamonds', value: 'K' });
            
            // Verify
            expect(result).to.be.true;
            expect(testState.tricks).to.have.lengthOf(1);
            expect(testState.currentTrickPlays).to.have.lengthOf(0);
        });

        it('should handle right bower winning over ace of trump', function() {
            // Setup test state
            const testState = JSON.parse(JSON.stringify(server3.gameState));
            testState.gamePhase = 'PLAYING_TRICKS';
            testState.trumpSuit = 'hearts';
            testState.currentPlayer = 'east';
            
            // Set up player hands
            testState.players.south.hand = [];
            testState.players.west.hand = [];
            testState.players.north.hand = [];
            testState.players.east.hand = [{ id: 4, suit: 'hearts', value: 'J' }];
            
            testState.currentTrickPlays = [
                { player: 'south', card: { suit: 'hearts', value: 'A' } },
                { player: 'west', card: { suit: 'hearts', value: 'K' } },
                { player: 'north', card: { suit: 'hearts', value: 'Q' } }
            ];
            
            // Execute
            const result = server3.handlePlayCard.call({ gameState: testState }, 'east', { id: 4, suit: 'hearts', value: 'J' });
            
            // Verify
            expect(result).to.be.true;
            expect(testState.tricks[0].winner).to.equal('east');
            expect(testState.players.east.tricksTakenThisHand).to.equal(1);
        });
    });
});
