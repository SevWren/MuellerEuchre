import assert from "assert";
import proxyquire from "proxyquire";

describe('Euchre Server Dealer Discard Functions', function() {
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

    describe('handleDealerDiscard', function() {
        it('should reject discard when not in AWAITING_DEALER_DISCARD phase', function() {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south = {
                id: 'fakeSocketId',
                hand: [{ id: 1, suit: 'hearts', value: 'A' }]
            };
            server.handleDealerDiscard('south', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(gameState.dealerHasDiscarded, undefined);
        });

        it('should reject discard from non-dealer player', function() {
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.north = {
                id: 'fakeSocketId',
                hand: [{ id: 1, suit: 'hearts', value: 'A' }]
            };
            server.handleDealerDiscard('north', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(gameState.dealerHasDiscarded, undefined);
        });

        it('should reject discard when hand size is not 6', function() {
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south = {
                id: 'fakeSocketId',
                name: 'Player 1',
                hand: [
                    { id: 1, suit: 'hearts', value: 'A' },
                    { id: 2, suit: 'hearts', value: 'K' },
                    { id: 3, suit: 'hearts', value: 'Q' },
                    { id: 4, suit: 'hearts', value: 'J' },
                    { id: 5, suit: 'hearts', value: '10' }
                ]
            };
            server.handleDealerDiscard('south', { id: 1, suit: 'hearts', value: 'A' });
            assert.strictEqual(emittedMessages.some(m => m.event === 'action_error'), true);
        });

        it('should successfully process valid dealer discard', function() {
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.playerWhoCalledTrump = 'west';
            gameState.kitty = [];
            gameState.players.south = {
                id: 'fakeSocketId',
                name: 'Player 1',
                hand: [
                    { id: 1, suit: 'hearts', value: 'A' },
                    { id: 2, suit: 'hearts', value: 'K' },
                    { id: 3, suit: 'hearts', value: 'Q' },
                    { id: 4, suit: 'hearts', value: 'J' },
                    { id: 5, suit: 'hearts', value: '10' },
                    { id: 6, suit: 'hearts', value: '9' }
                ]
            };
            gameState.players.west = {
                name: 'Player 2'
            };

            server.handleDealerDiscard('south', { id: 6, suit: 'hearts', value: '9' });
            
            assert.strictEqual(gameState.dealerHasDiscarded, true);
            assert.strictEqual(gameState.gamePhase, 'AWAITING_GO_ALONE');
            assert.strictEqual(gameState.currentPlayer, 'west');
            assert.strictEqual(gameState.kitty.length, 1);
            assert.strictEqual(gameState.players.south.hand.length, 5);
            assert.strictEqual(gameState.kitty[0].id, 6);
        });

        it('should reject discard of card not in hand', function() {
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south = {
                id: 'fakeSocketId',
                name: 'Player 1',
                hand: [
                    { id: 1, suit: 'hearts', value: 'A' },
                    { id: 2, suit: 'hearts', value: 'K' },
                    { id: 3, suit: 'hearts', value: 'Q' },
                    { id: 4, suit: 'hearts', value: 'J' },
                    { id: 5, suit: 'hearts', value: '10' },
                    { id: 6, suit: 'hearts', value: '9' }
                ]
            };
            
            server.handleDealerDiscard('south', { id: 7, suit: 'hearts', value: '8' });
            assert.strictEqual(emittedMessages.some(m => m.event === 'action_error'), true);
            assert.strictEqual(gameState.players.south.hand.length, 6);
        });
    });
});
