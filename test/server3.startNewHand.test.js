import assert from "assert";
import proxyquire from "proxyquire";

describe('Euchre Server Start New Hand Tests', function() {
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

        gameState.playerSlots = ['north', 'east', 'south', 'west'];
        gameState.players = {
            'north': { name: 'P1', hand: ['card1'], tricksTakenThisHand: 2 },
            'east': { name: 'P2', hand: ['card2'], tricksTakenThisHand: 1 },
            'south': { name: 'P3', hand: ['card3'], tricksTakenThisHand: 1 },
            'west': { name: 'P4', hand: ['card4'], tricksTakenThisHand: 1 }
        };
    });

    describe('startNewHand', function() {
        it('should reset all player hands and tricks taken', function() {
            server.startNewHand();
            for (const role of gameState.playerSlots) {
                assert.strictEqual(gameState.players[role].tricksTakenThisHand, 0);
                assert.strictEqual(gameState.players[role].hand.length, 5);
            }
        });

        it('should properly rotate dealer when not first hand', function() {
            gameState.initialDealerForSession = 'north';
            gameState.dealer = 'north';
            server.startNewHand();
            assert.strictEqual(gameState.dealer, 'east');
        });

        it('should set initial dealer on first hand', function() {
            gameState.initialDealerForSession = null;
            gameState.dealer = 'south';
            server.startNewHand();
            assert.strictEqual(gameState.initialDealerForSession, 'south');
            assert.strictEqual(gameState.dealer, 'south');
        });

        it('should reset game state variables', function() {
            gameState.trump = 'hearts';
            gameState.maker = 'north';
            gameState.goingAlone = true;
            gameState.playerGoingAlone = 'south';
            
            server.startNewHand();
            
            assert.strictEqual(gameState.trump, null);
            assert.strictEqual(gameState.maker, null);
            assert.strictEqual(gameState.goingAlone, false);
            assert.strictEqual(gameState.playerGoingAlone, null);
            assert.strictEqual(gameState.orderUpRound, 1);
            assert.strictEqual(gameState.dealerHasDiscarded, false);
            assert.deepStrictEqual(gameState.tricks, []);
            assert.deepStrictEqual(gameState.currentTrickPlays, []);
        });

        it('should deal correct number of cards to kitty', function() {
            server.startNewHand();
            assert.strictEqual(gameState.kitty.length, 4);
        });

        it('should set up-card and transition to ORDER_UP_ROUND1', function() {
            server.startNewHand();
            assert.notStrictEqual(gameState.upCard, null);
            assert.strictEqual(gameState.gamePhase, 'ORDER_UP_ROUND1');
            assert.strictEqual(gameState.currentPlayer, server.getNextPlayer(gameState.dealer));
        });
    });
});
