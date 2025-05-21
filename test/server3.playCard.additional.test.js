import assert from "assert";
import proxyquire from "proxyquire";

describe('Euchre Server Play Card Additional Tests', function() {
    let server;
    let gameState;
    let emittedMessages = [];

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

    describe('handlePlayCard additional scenarios', function() {
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
