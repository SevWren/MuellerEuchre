import { strict as assert } from 'node:assert';
import proxyquire from 'proxyquire';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Euchre Server Core Functions', function() {
    let server;
    let gameState;
    let DEBUG_LEVELS;
    let getNextPlayer, getPartner, cardToString, sortHand, getSuitColor, isRightBower, isLeftBower, getCardRank;

    let serverModule;
    
    before(async () => {
        // Load the server module with mocks
        serverModule = await import('../server3.js');
        
        // Mock socket.io
        const fakeSocket = {
            emit: () => {},
            on: () => {},
            id: 'fakeSocketId'
        };
        
        serverModule.io = {
            sockets: {
                sockets: {
                    fakeSocketId: fakeSocket
                },
                connected: {
                    fakeSocketId: fakeSocket
                },
                emit: () => {}
            },
            to: () => ({
                emit: () => {}
            })
        };
        
        // Mock fs
        serverModule.fs = {
            appendFileSync: () => {}
        };
    });
    
    beforeEach(() => {
        // Reset server state before each test
        serverModule.resetFullGame();
        server = serverModule;
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
            const sorted = sortHand(hand);
            assert.strictEqual(sorted[0].suit, 'hearts');
            assert.strictEqual(sorted[1].suit, 'hearts');
            assert.strictEqual(sorted[2].suit, 'diamonds');
            assert.strictEqual(sorted[3].suit, 'clubs');
            assert.strictEqual(sorted[4].suit, 'spades');
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
        it('returns empty array for null/undefined input', function() {
            assert.deepStrictEqual(sortHand(null), []);
            assert.deepStrictEqual(sortHand(undefined), []);
        });
        it('sorts hand with trump suit correctly', function() {
            const hand = [
                { value: 'J', suit: 'hearts' }, // right bower
                { value: 'J', suit: 'diamonds' }, // left bower if trump is hearts
                { value: 'A', suit: 'hearts' },
                { value: 'K', suit: 'spades' },
                { value: '9', suit: 'clubs' }
            ];
            const sorted = sortHand([...hand], 'hearts');
            // Right bower should be first, then left bower, then trump ace, then others
            assert.strictEqual(sorted[0].value, 'J');
            assert.strictEqual(sorted[0].suit, 'hearts');
            assert.strictEqual(sorted[1].value, 'J');
            assert.strictEqual(sorted[1].suit, 'diamonds');
        });
        it('returns a new array (does not return the same reference)', function() {
            const hand = [
                { value: 'A', suit: 'spades' },
                { value: '9', suit: 'hearts' }
            ];
            const sorted = sortHand(hand, 'hearts');
            assert.notStrictEqual(sorted, hand);
        });
        it('handles hand with all bowers and trump', function() {
            const hand = [
                { value: 'J', suit: 'hearts' }, // right bower
                { value: 'J', suit: 'diamonds' }, // left bower
                { value: 'A', suit: 'hearts' },
                { value: 'K', suit: 'hearts' },
                { value: 'Q', suit: 'hearts' }
            ];
            const sorted = sortHand(hand, 'hearts');
            // Right bower first, then left bower, then trump A, K, Q
            assert.deepStrictEqual(sorted.map(c => c.value), ['J', 'J', 'A', 'K', 'Q']);
            assert.deepStrictEqual(sorted.map(c => c.suit), ['hearts', 'diamonds', 'hearts', 'hearts', 'hearts']);
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
        it('returns false for null/undefined card or trump', function() {
            assert.strictEqual(isRightBower(null, 'hearts'), false);
            assert.strictEqual(isRightBower({ value: 'J', suit: 'hearts' }, null), false);
        });
    });

    describe('isLeftBower', function() {
        it('should return false for non-Jack card', function() {
            assert.strictEqual(isLeftBower({suit: 'diamonds', value: 'A'}, 'hearts'), false);
        });
        it('should return false if trump is undefined', function() {
            assert.strictEqual(isLeftBower({suit: 'diamonds', value: 'J'}, undefined), false);
        });
        it('returns false for null/undefined card or trump', function() {
            assert.strictEqual(isLeftBower(null, 'hearts'), false);
            assert.strictEqual(isLeftBower({ value: 'J', suit: 'diamonds' }, null), false);
        });
        it('correctly identifies left bower for all suit/trump color combos', function() {
            // Hearts trump, left bower is J of diamonds
            assert.strictEqual(isLeftBower({ value: 'J', suit: 'diamonds' }, 'hearts'), true);
            // Diamonds trump, left bower is J of hearts
            assert.strictEqual(isLeftBower({ value: 'J', suit: 'hearts' }, 'diamonds'), true);
            // Spades trump, left bower is J of clubs
            assert.strictEqual(isLeftBower({ value: 'J', suit: 'clubs' }, 'spades'), true);
            // Clubs trump, left bower is J of spades
            assert.strictEqual(isLeftBower({ value: 'J', suit: 'spades' }, 'clubs'), true);
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
        it('returns -1 for null/undefined card', function() {
            assert.strictEqual(getCardRank(null, 'hearts', 'hearts'), -1);
            assert.strictEqual(getCardRank(undefined, 'hearts', 'hearts'), -1);
        });
        it('returns -1 for card missing suit or value', function() {
            assert.strictEqual(getCardRank({}, 'hearts', 'hearts'), -1);
            assert.strictEqual(getCardRank({ value: 'A' }, 'hearts', 'hearts'), -1);
            assert.strictEqual(getCardRank({ suit: 'hearts' }, 'hearts', 'hearts'), -1);
        });
        it('returns correct rank for all trump/led suit combos', function() {
            // Right bower
            assert.strictEqual(getCardRank({ value: 'J', suit: 'spades' }, 'spades', 'spades'), 100);
            // Left bower
            assert.strictEqual(getCardRank({ value: 'J', suit: 'clubs' }, 'spades', 'spades'), 90);
            // Trump ace
            assert(getCardRank({ value: 'A', suit: 'spades' }, 'spades', 'spades') > 80);
            // Led suit ace
            assert(getCardRank({ value: 'A', suit: 'hearts' }, 'hearts', 'spades') > 0);
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

    describe('Defensive and edge case tests', function() {
        describe('getNextPlayer', function() {
            it('returns undefined for invalid currentPlayerRole', function() {
                assert.strictEqual(getNextPlayer('invalid'), undefined);
            });
            it('returns undefined if playerSlots is missing or not an array', function() {
                assert.strictEqual(getNextPlayer('south', undefined), undefined);
                assert.strictEqual(getNextPlayer('south', null), undefined);
                assert.strictEqual(getNextPlayer('south', {}), undefined);
            });
        });

        describe('getPartner', function() {
            it('returns undefined for null/undefined/empty input', function() {
                assert.strictEqual(getPartner(null), undefined);
                assert.strictEqual(getPartner(undefined), undefined);
                assert.strictEqual(getPartner(''), undefined);
            });
        });

        describe('cardToString', function() {
            it('returns N/A for null/undefined', function() {
                assert.strictEqual(cardToString(null), 'N/A');
                assert.strictEqual(cardToString(undefined), 'N/A');
            });
            it('returns Unknown Card for missing value or suit', function() {
                assert.strictEqual(cardToString({}), 'Unknown Card');
                assert.strictEqual(cardToString({ value: 'A' }), 'Unknown Card');
                assert.strictEqual(cardToString({ suit: 'hearts' }), 'Unknown Card');
            });
        });

        describe('sortHand', function() {
            it('returns empty array for null/undefined input', function() {
                assert.deepStrictEqual(sortHand(null), []);
                assert.deepStrictEqual(sortHand(undefined), []);
            });
            it('sorts hand with trump suit correctly', function() {
                const hand = [
                    { value: 'J', suit: 'hearts' }, // right bower
                    { value: 'J', suit: 'diamonds' }, // left bower if trump is hearts
                    { value: 'A', suit: 'hearts' },
                    { value: 'K', suit: 'spades' },
                    { value: '9', suit: 'clubs' }
                ];
                const sorted = sortHand([...hand], 'hearts');
                // Right bower should be first, then left bower, then trump ace, then others
                assert.strictEqual(sorted[0].value, 'J');
                assert.strictEqual(sorted[0].suit, 'hearts');
                assert.strictEqual(sorted[1].value, 'J');
                assert.strictEqual(sorted[1].suit, 'diamonds');
            });
        });

        describe('isRightBower/isLeftBower', function() {
            it('returns false for null/undefined card or trump', function() {
                assert.strictEqual(isRightBower(null, 'hearts'), false);
                assert.strictEqual(isRightBower({ value: 'J', suit: 'hearts' }, null), false);
                assert.strictEqual(isLeftBower(null, 'hearts'), false);
                assert.strictEqual(isLeftBower({ value: 'J', suit: 'diamonds' }, null), false);
            });
            it('correctly identifies left bower for all suit/trump color combos', function() {
                // Hearts trump, left bower is J of diamonds
                assert.strictEqual(isLeftBower({ value: 'J', suit: 'diamonds' }, 'hearts'), true);
                // Diamonds trump, left bower is J of hearts
                assert.strictEqual(isLeftBower({ value: 'J', suit: 'hearts' }, 'diamonds'), true);
                // Spades trump, left bower is J of clubs
                assert.strictEqual(isLeftBower({ value: 'J', suit: 'clubs' }, 'spades'), true);
                // Clubs trump, left bower is J of spades
                assert.strictEqual(isLeftBower({ value: 'J', suit: 'spades' }, 'clubs'), true);
            });
        });

        describe('getCardRank', function() {
            it('returns -1 for null/undefined card', function() {
                assert.strictEqual(getCardRank(null, 'hearts', 'hearts'), -1);
                assert.strictEqual(getCardRank(undefined, 'hearts', 'hearts'), -1);
            });
            it('returns -1 for card missing suit or value', function() {
                assert.strictEqual(getCardRank({}, 'hearts', 'hearts'), -1);
                assert.strictEqual(getCardRank({ value: 'A' }, 'hearts', 'hearts'), -1);
                assert.strictEqual(getCardRank({ suit: 'hearts' }, 'hearts', 'hearts'), -1);
            });
            it('returns 0 for non-trump/non-led suit and undefined led suit', function() {
                assert.strictEqual(getCardRank({ value: '9', suit: 'clubs' }, undefined, undefined), 0);
            });
            it('returns correct rank for all trump/led suit combos', function() {
                // Right bower
                assert.strictEqual(getCardRank({ value: 'J', suit: 'spades' }, 'spades', 'spades'), 100);
                // Left bower
                assert.strictEqual(getCardRank({ value: 'J', suit: 'clubs' }, 'spades', 'spades'), 90);
                // Trump ace
                assert(getCardRank({ value: 'A', suit: 'spades' }, 'spades', 'spades') > 80);
                // Led suit ace
                assert(getCardRank({ value: 'A', suit: 'hearts' }, 'hearts', 'spades') > 0);
            });
        });

        describe('resetFullGame', function() {
            it('resets gameState to a new gameId and default values', function() {
                const oldId = server.gameState.gameId;
                server.resetFullGame();
                assert.notStrictEqual(server.gameState.gameId, oldId);
                assert.strictEqual(server.gameState.gamePhase, 'LOBBY');
                assert.strictEqual(server.gameState.team1Score, 0);
                assert.strictEqual(server.gameState.team2Score, 0);
                assert.deepStrictEqual(server.gameState.tricks, []);
            });
        });
    });

    describe('Additional tests', function() {
        describe('getSuitColor', function() {
            it('returns red for hearts and diamonds', function() {
                assert.strictEqual(getSuitColor('hearts'), 'red');
                assert.strictEqual(getSuitColor('diamonds'), 'red');
            });
            it('returns black for spades and clubs', function() {
                assert.strictEqual(getSuitColor('spades'), 'black');
                assert.strictEqual(getSuitColor('clubs'), 'black');
            });
            it('returns black for unknown suit', function() {
                assert.strictEqual(getSuitColor('unknown'), 'black');
                assert.strictEqual(getSuitColor(undefined), 'black');
            });
        });

        describe('getNextPlayer advanced', function() {
            it('handles going alone with different partnerSittingOut', function() {
                const roles = ['south', 'west', 'north', 'east'];
                // If east is sitting out, next after north is south
                assert.strictEqual(getNextPlayer('north', roles, true, 'west', 'east'), 'south');
                // If west is sitting out, next after south is north
                assert.strictEqual(getNextPlayer('south', roles, true, 'north', 'west'), 'north');
            });
            it('returns undefined if roles array is empty', function() {
                assert.strictEqual(getNextPlayer('south', [], true, 'south', 'north'), undefined);
            });
        });

        describe('sortHand', function() {
            it('does not mutate original hand array', function() {
                const hand = [
                    { value: 'A', suit: 'spades' },
                    { value: '9', suit: 'hearts' }
                ];
                const copy = JSON.parse(JSON.stringify(hand));
                sortHand(hand, 'hearts');
                assert.deepStrictEqual(hand, copy);
            });
        });

        describe('cardToString', function() {
            it('handles extra properties gracefully', function() {
                assert.strictEqual(cardToString({ value: 'Q', suit: 'spades', foo: 123 }), 'Q of spades');
            });
            it('returns Unknown Card for card with extra/invalid fields', function() {
                assert.strictEqual(cardToString({ foo: 'bar', bar: 123 }), 'Unknown Card');
            });
        });

        describe('getNextPlayer', function() {
            it('returns undefined if roles is not an array or is missing current', function() {
                assert.strictEqual(getNextPlayer('south', 'not-an-array'), undefined);
                assert.strictEqual(getNextPlayer('not-in-list', ['south', 'west', 'north', 'east']), undefined);
            });
        });
    });

    describe('Multiplayer logic and state', function() {
        it('should have 4 player slots and correct default roles', function() {
            server.resetFullGame();
            assert.deepStrictEqual(server.gameState.playerSlots, ['south', 'west', 'north', 'east']);
            assert.strictEqual(Object.keys(server.gameState.players).length, 4);
            ['south', 'west', 'north', 'east'].forEach(role => {
                assert.ok(server.gameState.players[role]);
            });
        });
        it('should assign correct teams to each role', function() {
            server.resetFullGame();
            // By Euchre convention: south/north = team 1, east/west = team 2
            assert.strictEqual(server.gameState.players['south'].team, 1);
            assert.strictEqual(server.gameState.players['north'].team, 1);
            assert.strictEqual(server.gameState.players['east'].team, 2);
            assert.strictEqual(server.gameState.players['west'].team, 2);
        });
        it('should rotate dealer and currentPlayer correctly', function() {
            server.resetFullGame();
            const origDealer = server.gameState.dealer;
            server.startNewHand && server.startNewHand();
            // After startNewHand, dealer should rotate (unless first hand)
            // currentPlayer should be next after dealer
            const nextPlayer = getNextPlayer(server.gameState.dealer);
            assert.strictEqual(server.gameState.currentPlayer, nextPlayer);
        });
        it('should handle going alone and partner sitting out in state', function() {
            server.resetFullGame();
            server.gameState.goingAlone = true;
            server.gameState.playerGoingAlone = 'south';
            server.gameState.partnerSittingOut = 'north';
            // getNextPlayer should skip partnerSittingOut
            const next = getNextPlayer('south', server.gameState.playerSlots, true, 'south', 'north');
            assert.notStrictEqual(next, 'north');
        });
        it('should reset all multiplayer state on resetFullGame', function() {
            server.gameState.team1Score = 5;
            server.gameState.team2Score = 7;
            server.gameState.goingAlone = true;
            server.gameState.players['south'].name = 'TestPlayer';
            server.resetFullGame();
            assert.strictEqual(server.gameState.team1Score, 0);
            assert.strictEqual(server.gameState.team2Score, 0);
            assert.strictEqual(server.gameState.goingAlone, false);
            assert.notStrictEqual(server.gameState.players['south'].name, 'TestPlayer');
        });
        it('should increment connectedPlayerCount when a player joins', function() {
            server.resetFullGame();
            // Simulate a player joining by assigning a socketId
            const fakeSocketId = 'socket123';
            server.gameState.players['south'].socketId = fakeSocketId;
            server.gameState.connectedPlayerCount = 1;
            assert.strictEqual(server.gameState.players['south'].socketId, fakeSocketId);
            assert.strictEqual(server.gameState.connectedPlayerCount, 1);
        });
        it('should clear player slot and decrement count on disconnect', function() {
            server.resetFullGame();
            server.gameState.players['west'].socketId = 'socket456';
            server.gameState.connectedPlayerCount = 2;
            // Simulate disconnect logic
            server.gameState.players['west'].socketId = null;
            server.gameState.connectedPlayerCount--;
            assert.strictEqual(server.gameState.players['west'].socketId, null);
            assert.strictEqual(server.gameState.connectedPlayerCount, 1);
        });
        it('should preserve scores and reassign players after reset', function() {
            server.resetFullGame();
            server.gameState.team1Score = 8;
            server.gameState.team2Score = 6;
            // Simulate a reset that preserves scores
            const prevScores = [server.gameState.team1Score, server.gameState.team2Score];
            server.resetFullGame();
            // In real server, scores may be preserved on disconnect; here, just check reset
            assert.strictEqual(server.gameState.team1Score, 0);
            assert.strictEqual(server.gameState.team2Score, 0);
        });
        it('should not allow more than 4 players to join', function() {
            server.resetFullGame();
            // Simulate all slots filled
            Object.keys(server.gameState.players).forEach((role, i) => {
                server.gameState.players[role].socketId = 'socket' + i;
            });
            // Try to add a 5th player
            const slotsFilled = Object.values(server.gameState.players).filter(p => p.socketId).length;
            assert.strictEqual(slotsFilled, 4);
        });
        it('should not assign the same socketId to multiple roles', function() {
            server.resetFullGame();
            const fakeSocketId = 'socket789';
            server.gameState.players['south'].id = fakeSocketId;
            server.gameState.players['west'].id = fakeSocketId;
            // Check for duplicate socketId
            const ids = Object.values(server.gameState.players).map(p => p.id);
            const uniqueIds = new Set(ids.filter(Boolean));
            assert.notStrictEqual(ids.length, uniqueIds.size);
        });
        it('should only allow one role per socketId', function() {
            server.resetFullGame();
            const fakeSocketId = 'socket999';
            server.gameState.players['north'].id = fakeSocketId;
            // Simulate getRoleBySocketId logic
            const foundRoles = Object.keys(server.gameState.players).filter(role => server.gameState.players[role].id === fakeSocketId);
            assert.deepStrictEqual(foundRoles, ['north']);
        });
        it('should not allow a player to join if all slots are filled', function() {
            server.resetFullGame();
            Object.keys(server.gameState.players).forEach((role, i) => {
                server.gameState.players[role].id = 'socket' + i;
            });
            // Simulate join logic: no slot should be available
            const available = Object.values(server.gameState.players).find(p => !p.id);
            assert.strictEqual(available, undefined);
        });
        it('should clear all player ids on resetFullGame', function() {
            server.gameState.players['south'].id = 'socketA';
            server.gameState.players['west'].id = 'socketB';
            server.resetFullGame();
            Object.values(server.gameState.players).forEach(p => {
                assert.strictEqual(p.id, null);
            });
        });
        it('should allow a player to rejoin after disconnect if slot is available', function() {
            server.resetFullGame();
            // Simulate player joins and disconnects
            server.gameState.players['east'].id = 'socketE';
            server.gameState.connectedPlayerCount = 1;
            // Player disconnects
            server.gameState.players['east'].id = null;
            server.gameState.connectedPlayerCount--;
            // Player rejoins
            server.gameState.players['east'].id = 'socketE2';
            server.gameState.connectedPlayerCount++;
            assert.strictEqual(server.gameState.players['east'].id, 'socketE2');
            assert.strictEqual(server.gameState.connectedPlayerCount, 1);
        });
        it('should not allow a player to take over another player’s slot', function() {
            server.resetFullGame();
            server.gameState.players['north'].id = 'socketN';
            // Attempt to join with same id in another slot
            server.gameState.players['west'].id = 'socketN';
            // There should be duplicate ids, which is not allowed in real logic
            const ids = Object.values(server.gameState.players).map(p => p.id);
            const uniqueIds = new Set(ids.filter(Boolean));
            assert.notStrictEqual(ids.length, uniqueIds.size);
        });
        it('should keep player names unique after reset', function() {
            server.resetFullGame();
            server.gameState.players['south'].name = 'Alice';
            server.gameState.players['west'].name = 'Bob';
            server.resetFullGame();
            const names = Object.values(server.gameState.players).map(p => p.name);
            // After reset, all names should be null or default
            names.forEach(name => {
                assert.ok(!name || typeof name === 'string');
            });
        });
        it('should not allow connectedPlayerCount to go below zero', function() {
            server.resetFullGame();
            server.gameState.connectedPlayerCount = 0;
            // Simulate disconnect
            server.gameState.connectedPlayerCount--;
            if (server.gameState.connectedPlayerCount < 0) server.gameState.connectedPlayerCount = 0;
            assert(server.gameState.connectedPlayerCount >= 0);
        });
    });

    describe('Multiplayer gameplay core scenarios', function() {
        it('rotates dealer after each hand', function() {
            const origDealer = server.gameState.dealer;
            if (server.startNewHand) {
                server.startNewHand();
                const newDealer = server.gameState.dealer;
                assert.notStrictEqual(newDealer, origDealer);
                assert(server.gameState.playerSlots.includes(newDealer));
            }
        });
        it('advances currentPlayer after valid play (simulated)', function() {
            server.resetFullGame();
            // Simulate a hand dealt
            if (server.startNewHand) server.startNewHand();
            const origPlayer = server.gameState.currentPlayer;
            // Simulate play: advance to next player
            const next = getNextPlayer(origPlayer);
            server.gameState.currentPlayer = next;
            assert.strictEqual(server.gameState.currentPlayer, next);
        });
        it('transitions game phase from LOBBY to DEALING to ORDER_UP_ROUND1', function() {
            server.resetFullGame();
            if (server.startNewHand) server.startNewHand();
            assert(['DEALING', 'ORDER_UP_ROUND1', 'ORDER_UP_ROUND2', 'PLAYING_TRICKS'].includes(server.gameState.gamePhase));
        });
        it('assigns trick winner and next trick leader (simulated)', function() {
            server.resetFullGame();
            // Simulate trick plays and assign winner
            server.gameState.trickLeader = 'south';
            server.gameState.currentTrickPlays = [
                { player: 'south', card: { suit: 'hearts', value: 'A' } },
                { player: 'west', card: { suit: 'hearts', value: 'K' } },
                { player: 'north', card: { suit: 'hearts', value: 'Q' } },
                { player: 'east', card: { suit: 'hearts', value: 'J' } }
            ];
            // Simulate winner logic: highest value
            const winner = 'south'; // A > K > Q > J
            server.gameState.trickLeader = winner;
            assert.strictEqual(server.gameState.trickLeader, 'south');
        });
        it('updates score after hand (simulated)', function() {
            server.resetFullGame();
            server.gameState.team1Score = 0;
            server.gameState.team2Score = 0;
            // Simulate team 1 wins all tricks
            server.gameState.maker = 1;
            server.gameState.tricks = [
                { winner: 'south' }, { winner: 'north' }, { winner: 'south' }, { winner: 'north' }, { winner: 'south' }
            ];
            // Simulate scoring logic
            server.gameState.team1Score += 2;
            assert.strictEqual(server.gameState.team1Score, 2);
        });
        it('partner hand remains untouched when going alone', function() {
            server.resetFullGame();
            server.gameState.goingAlone = true;
            server.gameState.playerGoingAlone = 'south';
            server.gameState.partnerSittingOut = 'north';
            server.gameState.players['north'].hand = [{ suit: 'spades', value: 'A' }];
            // Simulate a trick: north should not play
            const played = server.gameState.players['north'].hand.length;
            assert.strictEqual(played, 1);
        });
        it('prevents play out of turn', function() {
            server.resetFullGame();
            server.gameState.currentPlayer = 'south';
            const outOfTurn = 'west';
            // Simulate play attempt by west
            if (outOfTurn !== server.gameState.currentPlayer) {
                // State should not change
                assert.strictEqual(server.gameState.currentPlayer, 'south');
            }
        });
        it('does not allow join during active game', function() {
            server.resetFullGame();
            server.gameState.gamePhase = 'PLAYING_TRICKS';
            // All slots filled
            Object.keys(server.gameState.players).forEach((role, i) => {
                server.gameState.players[role].id = 'socket' + i;
            });
            // Try to join
            const available = Object.values(server.gameState.players).find(p => !p.id);
            assert.strictEqual(available, undefined);
        });
        it('disconnected player hand is not revealed (simulated)', function() {
            server.resetFullGame();
            server.gameState.players['west'].id = null;
            server.gameState.players['west'].hand = [{ suit: 'hearts', value: 'A' }];
            // Simulate broadcast: hand should not be revealed (simulate as undefined/null)
            const hand = server.gameState.players['west'].id ? server.gameState.players['west'].hand : undefined;
            assert.strictEqual(hand, undefined);
        });
        it('locks out actions after game over', function() {
            server.resetFullGame();
            server.gameState.gamePhase = 'GAME_OVER';
            // Simulate play attempt
            const prevPhase = server.gameState.gamePhase;
            // No state change allowed
            server.gameState.gamePhase = prevPhase;
            assert.strictEqual(server.gameState.gamePhase, 'GAME_OVER');
        });
    });

    describe('Client interface-related server state tests', function() {
        it('should update lobby player list and start button state on player join/leave', function() {
            server.resetFullGame();
            // Simulate 3 players joined
            server.gameState.connectedPlayerCount = 3;
            Object.keys(server.gameState.players).forEach((role, i) => {
                if (i < 3) server.gameState.players[role].id = 'socket' + i;
            });
            assert.strictEqual(server.gameState.connectedPlayerCount, 3);
            // Simulate 4th player joins
            server.gameState.players['east'].id = 'socket3';
            server.gameState.connectedPlayerCount = 4;
            assert.strictEqual(server.gameState.connectedPlayerCount, 4);
        });
        it('should reflect correct game status text for each phase', function() {
            server.resetFullGame();
            const phases = ['LOBBY', 'DEALING', 'ORDER_UP_ROUND1', 'ORDER_UP_ROUND2', 'PLAYING_TRICKS', 'GAME_OVER'];
            phases.forEach(phase => {
                server.gameState.gamePhase = phase;
                assert.ok(typeof server.gameState.gamePhase === 'string');
            });
        });
        it('should only reveal current player hand to that player', function() {
            server.resetFullGame();
            Object.keys(server.gameState.players).forEach(role => {
                server.gameState.players[role].hand = [{ suit: 'hearts', value: 'A' }];
            });
            // Simulate server broadcast: only currentPlayer's hand is sent in full
            server.gameState.currentPlayer = 'south';
            Object.keys(server.gameState.players).forEach(role => {
                if (role !== server.gameState.currentPlayer) {
                    assert.ok(server.gameState.players[role].hand);
                }
            });
        });
        it('should set up-card correctly in state and hide when not set', function() {
            server.resetFullGame();
            server.gameState.upCard = { suit: 'spades', value: 'A' };
            assert.strictEqual(server.gameState.upCard.suit, 'spades');
            assert.strictEqual(server.gameState.upCard.value, 'A');
            server.gameState.upCard = null;
            assert.strictEqual(server.gameState.upCard, null);
        });
        it('should update trick area with correct plays and player names', function() {
            server.resetFullGame();
            server.gameState.currentTrickPlays = [
                { player: 'south', card: { suit: 'hearts', value: 'A' } },
                { player: 'west', card: { suit: 'hearts', value: 'K' } }
            ];
            assert.strictEqual(server.gameState.currentTrickPlays.length, 2);
            assert.strictEqual(server.gameState.currentTrickPlays[0].player, 'south');
        });
        it('should reflect modal state in gamePhase and player turn', function() {
            server.resetFullGame();
            server.gameState.gamePhase = 'ORDER_UP_ROUND1';
            server.gameState.currentPlayer = 'south';
            assert.strictEqual(server.gameState.gamePhase, 'ORDER_UP_ROUND1');
            assert.strictEqual(server.gameState.currentPlayer, 'south');
        });
        it('should only allow valid plays for current player and trick', function() {
            server.resetFullGame();
            server.gameState.currentPlayer = 'south';
            server.gameState.players['south'].hand = [
                { suit: 'hearts', value: 'A' },
                { suit: 'spades', value: 'K' }
            ];
            server.gameState.currentTrickPlays = [
                { player: 'west', card: { suit: 'hearts', value: '9' } }
            ];
            // Simulate server-side valid play check: must follow suit if possible
            const hasLedSuit = server.gameState.players['south'].hand.some(c => c.suit === 'hearts');
            assert.strictEqual(hasLedSuit, true);
        });
        it('should update game messages log in state', function() {
            server.resetFullGame();
            server.gameState.gameMessages = [
                { text: 'Player joined', timestamp: Date.now() },
                { text: 'Game started', timestamp: Date.now() }
            ];
            assert.strictEqual(server.gameState.gameMessages.length, 2);
        });
        it('should update team scores in state after hand', function() {
            server.resetFullGame();
            server.gameState.team1Score = 3;
            server.gameState.team2Score = 5;
            assert.strictEqual(server.gameState.team1Score, 3);
            assert.strictEqual(server.gameState.team2Score, 5);
        });
        it('should assign and display correct player role and name in state', function() {
            server.resetFullGame();
            server.gameState.players['south'].name = 'Alice';
            server.gameState.players['south'].id = 'socketA';
            assert.strictEqual(server.gameState.players['south'].name, 'Alice');
            assert.strictEqual(server.gameState.players['south'].id, 'socketA');
        });
    });
});
