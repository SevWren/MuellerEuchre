import assert from "assert";
import proxyquire from "proxyquire";

describe('Euchre Server Play Card Functions', function() {
    let server;
    let gameState;

    beforeEach(() => {
        const fakeSocket = {
            emit: () => {},
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
                to: () => ({ emit: () => {} }),
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

    describe('serverIsValidPlay', function() {
        it('should reject card not in hand', function() {
            gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'A' }
            ];
            const result = server.serverIsValidPlay('south', { id: 2, suit: 'hearts', value: 'K' });
            assert.strictEqual(result, false);
        });

        it('should allow any card when leading trick', function() {
            gameState.currentTrickPlays = [];
            gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'A' }
            ];
            const result = server.serverIsValidPlay('south', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(result, true);
        });

        it('should enforce following suit with left bower', function() {
            gameState.trump = 'hearts';
            gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'diamonds', value: 'A' } }
            ];
            gameState.players.south.hand = [
                { id: 1, suit: 'diamonds', value: 'J' },
                { id: 2, suit: 'spades', value: 'A' }
            ];
            const result = server.serverIsValidPlay('south', { id: 2, suit: 'spades', value: 'A' });
            assert.strictEqual(result, false);
        });

        it('should allow off-suit when no matching cards', function() {
            gameState.trump = 'hearts';
            gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'diamonds', value: 'A' } }
            ];
            gameState.players.south.hand = [
                { id: 1, suit: 'clubs', value: 'K' },
                { id: 2, suit: 'spades', value: 'A' }
            ];
            const result = server.serverIsValidPlay('south', { id: 2, suit: 'spades', value: 'A' });
            assert.strictEqual(result, true);
        });
    });

    describe('handlePlayCard', function() {
        it('should reject play when not in PLAYING_TRICKS phase', function() {
            gameState.gamePhase = 'LOBBY';
            gameState.currentPlayer = 'south';
            gameState.players.south = {
                id: 'fakeSocketId',
                hand: [{ id: 1, suit: 'hearts', value: 'A' }]
            };
            server.handlePlayCard('south', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(gameState.currentTrickPlays.length, 0);
        });

        it('should complete trick and assign winner correctly', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.trump = 'hearts';
            gameState.currentPlayer = 'east';
            gameState.players = {
                'south': { name: 'P1', tricksTakenThisHand: 0, hand: [] },
                'west': { name: 'P2', tricksTakenThisHand: 0, hand: [] },
                'north': { name: 'P3', tricksTakenThisHand: 0, hand: [] },
                'east': { name: 'P4', tricksTakenThisHand: 0, hand: [{ id: 4, suit: 'hearts', value: 'A' }] }
            };
            gameState.currentTrickPlays = [
                { player: 'south', card: { suit: 'diamonds', value: 'K' } },
                { player: 'west', card: { suit: 'diamonds', value: 'A' } },
                { player: 'north', card: { suit: 'diamonds', value: 'Q' } }
            ];
            server.handlePlayCard('east', { id: 4, suit: 'hearts', value: 'A' });
            assert.strictEqual(gameState.tricks.length, 1);
            assert.strictEqual(gameState.tricks[0].winner, 'east');
        });

        it('should handle going alone scenario with 3 players', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.trump = 'spades';
            gameState.goingAlone = true;
            gameState.currentPlayer = 'east';
            gameState.players = {
                'south': { name: 'P1', tricksTakenThisHand: 0, hand: [] },
                'west': { name: 'P2', tricksTakenThisHand: 0, hand: [] },
                'east': { name: 'P4', tricksTakenThisHand: 0, hand: [{ id: 3, suit: 'diamonds', value: 'K' }] }
            };
            gameState.currentTrickPlays = [
                { player: 'south', card: { suit: 'diamonds', value: 'A' } },
                { player: 'west', card: { suit: 'diamonds', value: 'Q' } }
            ];
            server.handlePlayCard('east', { id: 3, suit: 'diamonds', value: 'K' });
            assert.strictEqual(gameState.tricks.length, 1);
            assert.strictEqual(gameState.currentTrickPlays.length, 0);
        });

        it('should handle right bower winning over ace of trump', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.trump = 'hearts';
            gameState.currentPlayer = 'east';
            gameState.players = {
                'south': { name: 'P1', tricksTakenThisHand: 0, hand: [] },
                'west': { name: 'P2', tricksTakenThisHand: 0, hand: [] },
                'north': { name: 'P3', tricksTakenThisHand: 0, hand: [] },
                'east': { name: 'P4', tricksTakenThisHand: 0, hand: [{ id: 4, suit: 'hearts', value: 'J' }] }
            };
            gameState.currentTrickPlays = [
                { player: 'south', card: { suit: 'hearts', value: 'A' } },
                { player: 'west', card: { suit: 'hearts', value: 'K' } },
                { player: 'north', card: { suit: 'hearts', value: 'Q' } }
            ];
            server.handlePlayCard('east', { id: 4, suit: 'hearts', value: 'J' });
            assert.strictEqual(gameState.tricks[0].winner, 'east');
        });
    });
});
