const assert = require('assert');
const proxyquire = require('proxyquire');

describe('Euchre Server Core Functions', function() {
    let server;
    let gameState;
    let DEBUG_LEVELS;
    let getNextPlayer, getPartner, cardToString, sortHand, getSuitColor, isRightBower, isLeftBower, getCardRank;

    beforeEach(() => {
        // Improved mock for socket.io (prevents io.on errors and mimics structure)
        const ioMock = function() {
            return {
                sockets: { sockets: {} },
                to: () => ({ emit: () => {} }),
                emit: () => {},
                on: () => {} // Add on() to prevent io.on is not a function
            };
        };
        server = proxyquire('../server3', {
            fs: { appendFileSync: () => {} },
            'socket.io': ioMock
        });
        // Extract functions and state
        gameState = server.gameState;
        DEBUG_LEVELS = server.DEBUG_LEVELS;
        getNextPlayer = server.getNextPlayer;
        getPartner = server.getPartner;
        cardToString = server.cardToString;
        sortHand = server.sortHand;
        getSuitColor = server.getSuitColor;
        isRightBower = server.isRightBower;
        isLeftBower = server.isLeftBower;
        getCardRank = server.getCardRank;
    });

    describe('getNextPlayer', function() {
        it('returns the next player in order', function() {
            assert.strictEqual(getNextPlayer('south'), 'west');
            assert.strictEqual(getNextPlayer('west'), 'north');
            assert.strictEqual(getNextPlayer('north'), 'east');
            assert.strictEqual(getNextPlayer('east'), 'south');
        });

        it('should skip partner when going alone (partner sits out)', function() {
            const roles = ['south', 'west', 'north', 'east'];
            const current = 'south';
            const goingAlone = true;
            const playerGoingAlone = 'south';
            const partnerSittingOut = 'north';
            const next = getNextPlayer(current, roles, goingAlone, playerGoingAlone, partnerSittingOut);
            assert.strictEqual(next, 'west');
            // Next after 'west' should be 'east', skipping 'north'
            assert.strictEqual(getNextPlayer('west', roles, goingAlone, playerGoingAlone, partnerSittingOut), 'east');
            // Next after 'east' should wrap to 'south', skipping 'north'
            assert.strictEqual(getNextPlayer('east', roles, goingAlone, playerGoingAlone, partnerSittingOut), 'south');
        });
    });

    describe('getPartner', function() {
        it('returns the correct partner', function() {
            assert.strictEqual(getPartner('south'), 'north');
            assert.strictEqual(getPartner('north'), 'south');
            assert.strictEqual(getPartner('east'), 'west');
            assert.strictEqual(getPartner('west'), 'east');
        });

        it('should return undefined for invalid role', function() {
            assert.strictEqual(getPartner('invalid'), undefined);
        });
    });

    describe('cardToString', function() {
        it('returns correct string', function() {
            assert.strictEqual(cardToString({ value: 'J', suit: 'hearts' }), 'J of hearts');
            assert.strictEqual(cardToString(null), 'N/A');
        });

        it('should handle incomplete card objects', function() {
            assert.strictEqual(cardToString({}), 'Unknown Card');
            assert.strictEqual(cardToString({suit: 'hearts'}), 'Unknown Card');
            assert.strictEqual(cardToString({value: 'A'}), 'Unknown Card');
        });
    });

    describe('sortHand', function() {
        it('sorts by suit and value', function() {
            const hand = [
                { value: 'A', suit: 'spades' },
                { value: '9', suit: 'hearts' },
                { value: 'K', suit: 'clubs' },
                { value: '10', suit: 'hearts' },
                { value: 'J', suit: 'diamonds' }
            ];
            sortHand(hand);
            assert.strictEqual(hand[0].suit, 'hearts');
            assert.strictEqual(hand[1].suit, 'hearts');
            assert.strictEqual(hand[2].suit, 'diamonds');
            assert.strictEqual(hand[3].suit, 'clubs');
            assert.strictEqual(hand[4].suit, 'spades');
        });

        it('should handle empty hand', function() {
            assert.deepStrictEqual(sortHand([], 'hearts'), []);
        });
        it('should handle hand with only one suit', function() {
            const hand = [
                {suit: 'hearts', value: 'A'},
                {suit: 'hearts', value: 'K'},
                {suit: 'hearts', value: 'Q'}
            ];
            const sorted = sortHand(hand, 'hearts');
            assert.strictEqual(sorted.length, 3);
            assert(sorted.every(card => card.suit === 'hearts'));
        });
    });

    describe('isRightBower', function() {
        it('and isLeftBower work as expected', function() {
            assert.strictEqual(isRightBower({ value: 'J', suit: 'hearts' }, 'hearts'), true);
            assert.strictEqual(isRightBower({ value: 'J', suit: 'spades' }, 'hearts'), false);
            assert.strictEqual(isLeftBower({ value: 'J', suit: 'diamonds' }, 'hearts'), true);
            assert.strictEqual(isLeftBower({ value: 'J', suit: 'hearts' }, 'hearts'), false);
        });

        it('should return false for non-Jack card', function() {
            assert.strictEqual(isRightBower({suit: 'hearts', value: 'A'}, 'hearts'), false);
        });
        it('should return false if trump is undefined', function() {
            assert.strictEqual(isRightBower({suit: 'hearts', value: 'J'}, undefined), false);
        });
    });

    describe('isLeftBower', function() {
        it('should return false for non-Jack card', function() {
            assert.strictEqual(isLeftBower({suit: 'diamonds', value: 'A'}, 'hearts'), false);
        });
        it('should return false if trump is undefined', function() {
            assert.strictEqual(isLeftBower({suit: 'diamonds', value: 'J'}, undefined), false);
        });
    });

    describe('getCardRank', function() {
        it('returns correct rank for right/left bower and trump', function() {
            assert.strictEqual(getCardRank({ value: 'J', suit: 'hearts' }, 'hearts', 'hearts'), 100); // right bower
            assert.strictEqual(getCardRank({ value: 'J', suit: 'diamonds' }, 'hearts', 'hearts'), 90); // left bower
            assert(getCardRank({ value: 'A', suit: 'hearts' }, 'hearts', 'hearts') > 80); // trump ace
            assert(getCardRank({ value: '9', suit: 'hearts' }, 'hearts', 'hearts') > 80); // trump 9
            assert(getCardRank({ value: 'A', suit: 'spades' }, 'spades', 'hearts') < 80); // not trump
        });

        it('should return 0 for non-trump/non-led suit and undefined led suit', function() {
            const card = {suit: 'clubs', value: '9'};
            assert.strictEqual(getCardRank(card, 'hearts', undefined), 0);
        });
    });

    describe('exports and gameState', function() {
        it('should export all expected functions', function() {
            const expected = [
                'getNextPlayer', 'getPartner', 'cardToString', 'sortHand',
                'getSuitColor', 'isRightBower', 'isLeftBower', 'getCardRank',
                'resetFullGame', 'gameState'
            ];
            expected.forEach(fn => {
                assert.ok(server[fn] !== undefined, fn + ' should be exported');
            });
        });
        it('should reset gameState to default structure', function() {
            server.resetFullGame();
            assert.ok(server.gameState);
            assert.ok(server.gameState.players);
            assert.strictEqual(typeof server.gameState.team1Score, 'number');
            assert.strictEqual(typeof server.gameState.team2Score, 'number');
            assert.strictEqual(server.gameState.gamePhase, 'LOBBY');
        });
    });
});
