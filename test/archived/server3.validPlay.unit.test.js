import assert from "assert";
import proxyquire from "proxyquire";

describe('Euchre Server Valid Play Functions', function() {
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

    describe('serverIsValidPlay additional cases', function() {
        it('should handle right bower following trump suit', function() {
            gameState.trump = 'hearts';
            gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'hearts', value: 'A' } }
            ];
            gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'J' },
                { id: 2, suit: 'spades', value: 'K' }
            ];
            const result = server.serverIsValidPlay('south', { id: 1, suit: 'hearts', value: 'J' });
            assert.strictEqual(result, true);
        });

        it('should validate play when led suit is left bower', function() {
            gameState.trump = 'hearts';
            gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'diamonds', value: 'J' } }
            ];
            gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: '10' },
                { id: 2, suit: 'clubs', value: 'K' }
            ];
            const result = server.serverIsValidPlay('south', { id: 1, suit: 'hearts', value: '10' });
            assert.strictEqual(result, true);
        });

        it('should reject off-suit play when holding led suit', function() {
            gameState.trump = 'spades';
            gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'diamonds', value: 'K' } }
            ];
            gameState.players.south.hand = [
                { id: 1, suit: 'diamonds', value: '9' },
                { id: 2, suit: 'hearts', value: 'A' }
            ];
            const result = server.serverIsValidPlay('south', { id: 2, suit: 'hearts', value: 'A' });
            assert.strictEqual(result, false);
        });

        it('should handle multiple cards of led suit in hand', function() {
            gameState.trump = 'clubs';
            gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'diamonds', value: 'Q' } }
            ];
            gameState.players.south.hand = [
                { id: 1, suit: 'diamonds', value: '10' },
                { id: 2, suit: 'diamonds', value: 'K' },
                { id: 3, suit: 'hearts', value: 'A' }
            ];
            const result = server.serverIsValidPlay('south', { id: 2, suit: 'diamonds', value: 'K' });
            assert.strictEqual(result, true);
        });

        it('should validate play when no cards match led suit including left bower', function() {
            gameState.trump = 'diamonds';
            gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'hearts', value: 'A' } }
            ];
            gameState.players.south.hand = [
                { id: 1, suit: 'diamonds', value: 'J' },
                { id: 2, suit: 'spades', value: 'K' },
                { id: 3, suit: 'clubs', value: 'Q' }
            ];
            const result = server.serverIsValidPlay('south', { id: 2, suit: 'spades', value: 'K' });
            assert.strictEqual(result, true);
        });
    });
});
