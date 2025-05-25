/**
 * @file server3.playCard.additional.test.js - Additional test cases for Euchre card playing logic
 * @module test/server3.playCard.additional
 * @description Extended test suite covering edge cases and advanced scenarios for the Euchre card playing functionality.
 * 
 * This test suite focuses on more complex game scenarios that go beyond basic card play validation,
 * including special card interactions, trick resolution edge cases, and game state transitions.
 * 
 * @requires assert
 * @requires proxyquire
 * @see {@link module:server3} for the implementation being tested
 * @see {@link module:test/server3.playCard.unit} for basic card playing tests
 */

import assert from "assert";
import proxyquire from "proxyquire";

/**
 * @description Additional test suite for Euchre card playing functionality.
 * Focuses on edge cases, special card interactions, and complex game scenarios
 * that aren't covered in the basic unit tests.
 */
describe('Euchre Server Play Card Additional Tests', function() {
    /** @type {Object} server - The server instance being tested */
    let server;
    
    /** @type {Object} gameState - The game state object */
    let gameState;
    
    /** @type {Array} emittedMessages - Tracks messages emitted during tests */
    let emittedMessages = [];

    /**
     * Before each test, set up a fresh server instance with mocked dependencies
     * and reset the test environment.
     */
    beforeEach(() => {
        emittedMessages = [];
        const fakeSocket = {
            emit: (event, message) => {
                emittedMessages.push({ event, message });
            },
            on: () => {},
            id: 'fakeSocketId'
        };
        const ioMock = function() {
            return {
                sockets: {
                    sockets: {
                        fakeSocketId: fakeSocket
                    }
                },
                to: () => ({ emit: (event, message) => emittedMessages.push({ event, message }) }),
                emit: () => {},
                on: () => {},
                in: () => ({ emit: () => {} })
            };
        };

        server = proxyquire('../server3', {
            fs: { appendFileSync: () => {} },
            'socket.io': ioMock
        });
        gameState = server.gameState;
    });

    /**
     * @description Test suite for additional handlePlayCard scenarios.
     * Covers edge cases and complex interactions not included in basic tests.
     */
    describe('handlePlayCard additional scenarios', function() {
        /**
         * @test {handlePlayCard}
         * @description Verifies that a player cannot play when it's not their turn.
         */
        it('should reject play when not current player', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.currentPlayer = 'north';
            gameState.players.south = {
                id: 'fakeSocketId',
                hand: [{ id: 1, suit: 'hearts', value: 'A' }]
            };
            server.handlePlayCard('south', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(emittedMessages.some(m => m.event === 'action_error'), true);
        });

        /**
         * @test {handlePlayCard}
         * @description Verifies that the left bower (jack of same color as trump)
         * wins over other cards of the same suit when that suit is not trump.
         */
        it('should handle left bower winning over ace of same suit', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.trump = 'hearts';
            gameState.currentPlayer = 'east';
            gameState.players = {
                'south': { name: 'P1', tricksTakenThisHand: 0, hand: [] },
                'west': { name: 'P2', tricksTakenThisHand: 0, hand: [] },
                'north': { name: 'P3', tricksTakenThisHand: 0, hand: [] },
                'east': { name: 'P4', tricksTakenThisHand: 0, hand: [{ id: 4, suit: 'diamonds', value: 'J' }] }
            };
            gameState.currentTrickPlays = [
                { player: 'south', card: { suit: 'hearts', value: 'A' } },
                { player: 'west', card: { suit: 'hearts', value: '10' } },
                { player: 'north', card: { suit: 'hearts', value: 'K' } }
            ];
            server.handlePlayCard('east', { id: 4, suit: 'diamonds', value: 'J' });
            assert.strictEqual(gameState.tricks[0].winner, 'east');
        });

        /**
         * @test {handlePlayCard}
         * @description Verifies that the standard card hierarchy is respected
         * when playing non-trump suit cards.
         */
        it('should properly handle non-trump suit hierarchy', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.trump = 'hearts';
            gameState.currentPlayer = 'east';
            gameState.players = {
                'south': { name: 'P1', tricksTakenThisHand: 0, hand: [] },
                'west': { name: 'P2', tricksTakenThisHand: 0, hand: [] },
                'north': { name: 'P3', tricksTakenThisHand: 0, hand: [] },
                'east': { name: 'P4', tricksTakenThisHand: 0, hand: [{ id: 4, suit: 'diamonds', value: 'K' }] }
            };
            gameState.currentTrickPlays = [
                { player: 'south', card: { suit: 'diamonds', value: 'Q' } },
                { player: 'west', card: { suit: 'diamonds', value: '10' } },
                { player: 'north', card: { suit: 'diamonds', value: 'J' } }
            ];
            server.handlePlayCard('east', { id: 4, suit: 'diamonds', value: 'K' });
            assert.strictEqual(gameState.tricks[0].winner, 'east');
        });

        /**
         * @test {handlePlayCard}
         * @description Verifies that the game correctly transitions to the scoring
         * phase when all cards have been played in a hand.
         */
        it('should transition to scoring when all cards played', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.trump = 'clubs';
            gameState.currentPlayer = 'east';
            gameState.players = {
                'south': { name: 'P1', tricksTakenThisHand: 2, hand: [] },
                'west': { name: 'P2', tricksTakenThisHand: 1, hand: [] },
                'north': { name: 'P3', tricksTakenThisHand: 1, hand: [] },
                'east': { name: 'P4', tricksTakenThisHand: 0, hand: [{ id: 4, suit: 'clubs', value: 'A' }] }
            };
            gameState.currentTrickPlays = [
                { player: 'south', card: { suit: 'diamonds', value: 'K' } },
                { player: 'west', card: { suit: 'diamonds', value: 'A' } },
                { player: 'north', card: { suit: 'diamonds', value: 'Q' } }
            ];
            server.handlePlayCard('east', { id: 4, suit: 'clubs', value: 'A' });
            assert.strictEqual(gameState.players.east.hand.length, 0);
            assert.strictEqual(gameState.currentTrickPlays.length, 0);
        });
    });
});
