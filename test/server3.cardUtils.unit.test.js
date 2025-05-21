import assert from "assert";
import proxyquire from "proxyquire";

describe('Euchre Server Card Utility Functions', function() {
    let server;

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
    });

    describe('cardToString', function() {
        it('should handle null card', function() {
            assert.strictEqual(server.cardToString(null), 'N/A');
        });

        it('should handle undefined card', function() {
            assert.strictEqual(server.cardToString(undefined), 'N/A');
        });

        it('should handle malformed card object', function() {
            assert.strictEqual(server.cardToString({}), 'Unknown Card');
        });

        it('should format valid card correctly', function() {
            const card = { value: 'A', suit: 'hearts' };
            assert.strictEqual(server.cardToString(card), 'A of hearts');
        });
    });

    describe('sortHand', function() {
        it('should handle non-array input', function() {
            assert.deepStrictEqual(server.sortHand(null), []);
        });

        it('should sort by suit order without trump', function() {
            const hand = [
                { suit: 'spades', value: 'A' },
                { suit: 'hearts', value: 'K' }
            ];
            const sorted = server.sortHand(hand);
            assert.strictEqual(sorted[0].suit, 'hearts');
        });

        it('should prioritize right bower', function() {
            const hand = [
                { suit: 'hearts', value: 'A' },
                { suit: 'hearts', value: 'J' }
            ];
            const sorted = server.sortHand(hand, 'hearts');
            assert.strictEqual(sorted[0].value, 'J');
        });

        it('should identify left bower correctly', function() {
            const hand = [
                { suit: 'diamonds', value: 'J' },
                { suit: 'hearts', value: 'K' }
            ];
            const sorted = server.sortHand(hand, 'hearts');
            assert.strictEqual(sorted[0].suit, 'diamonds');
        });
    });

    describe('getCardRank', function() {
        it('should handle invalid card input', function() {
            assert.strictEqual(server.getCardRank(null), -1);
        });

        it('should rank right bower highest', function() {
            const card = { suit: 'hearts', value: 'J' };
            assert.strictEqual(server.getCardRank(card, 'diamonds', 'hearts'), 100);
        });

        it('should rank left bower second highest', function() {
            const card = { suit: 'diamonds', value: 'J' };
            assert.strictEqual(server.getCardRank(card, 'clubs', 'hearts'), 90);
        });

        it('should rank led suit higher than off-suit', function() {
            const card = { suit: 'clubs', value: 'A' };
            assert.strictEqual(server.getCardRank(card, 'clubs', 'hearts'), 6);
        });

        it('should handle no trump or led suit', function() {
            const card = { suit: 'clubs', value: 'A' };
            assert.strictEqual(server.getCardRank(card), 0);
        });
    });
});
