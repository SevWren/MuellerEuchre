/**
 * @file server3.scoreHand.unit.test.js - Unit tests for the Server3 ScoreHand module
 * @module Server3ScoreHandUnitTest
 * @description Unit tests for the Server3 ScoreHand module
 * @requires chai
 * @requires ../../server3.mjs
 */

import assert from "assert";
import proxyquire from "proxyquire";

describe('Euchre Server Score Hand Functions', function() {
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

        server = proxyquire('../../server3.mjs', {
            fs: { appendFileSync: () => {} },
            'socket.io': ioMock
        });
        gameState = server.gameState;
    });

    describe('scoreCurrentHand', function() {
        it('should award 4 points for going alone and taking all tricks', function() {
            gameState.maker = 1;
            gameState.goingAlone = true;
            gameState.players = {
                'south': { team: 1, tricksTakenThisHand: 5 },
                'west': { team: 2, tricksTakenThisHand: 0 },
                'north': { team: 1, tricksTakenThisHand: 0 },
                'east': { team: 2, tricksTakenThisHand: 0 }
            };
            gameState.playerSlots = ['south', 'west', 'north', 'east'];
            server.scoreCurrentHand();
            assert.strictEqual(gameState.team1Score, 4);
        });

        it('should award 2 points for euchre to defending team', function() {
            gameState.maker = 1;
            gameState.goingAlone = false;
            gameState.players = {
                'south': { team: 1, tricksTakenThisHand: 1 },
                'west': { team: 2, tricksTakenThisHand: 2 },
                'north': { team: 1, tricksTakenThisHand: 0 },
                'east': { team: 2, tricksTakenThisHand: 2 }
            };
            gameState.playerSlots = ['south', 'west', 'north', 'east'];
            server.scoreCurrentHand();
            assert.strictEqual(gameState.team2Score, 2);
        });

        it('should award 1 point for making 3 tricks', function() {
            gameState.maker = 2;
            gameState.goingAlone = false;
            gameState.players = {
                'south': { team: 1, tricksTakenThisHand: 2 },
                'west': { team: 2, tricksTakenThisHand: 2 },
                'north': { team: 1, tricksTakenThisHand: 0 },
                'east': { team: 2, tricksTakenThisHand: 1 }
            };
            gameState.playerSlots = ['south', 'west', 'north', 'east'];
            server.scoreCurrentHand();
            assert.strictEqual(gameState.team2Score, 1);
        });

        it('should end game when team reaches 10 points', function() {
            gameState.maker = 1;
            gameState.team1Score = 8;
            gameState.goingAlone = true;
            gameState.players = {
                'south': { team: 1, tricksTakenThisHand: 5 },
                'west': { team: 2, tricksTakenThisHand: 0 },
                'north': { team: 1, tricksTakenThisHand: 0 },
                'east': { team: 2, tricksTakenThisHand: 0 }
            };
            gameState.playerSlots = ['south', 'west', 'north', 'east'];
            server.scoreCurrentHand();
            assert.strictEqual(gameState.gamePhase, 'GAME_OVER');
            assert.strictEqual(gameState.winningTeam, 1);
            assert.strictEqual(gameState.team1Score, 12);
        });

        it('should handle zero tricks taken', function() {
            gameState.maker = 2;
            gameState.goingAlone = false;
            gameState.players = {
                'south': { team: 1, tricksTakenThisHand: 5 },
                'west': { team: 2, tricksTakenThisHand: 0 },
                'north': { team: 1, tricksTakenThisHand: 0 },
                'east': { team: 2, tricksTakenThisHand: 0 }
            };
            gameState.playerSlots = ['south', 'west', 'north', 'east'];
            server.scoreCurrentHand();
            assert.strictEqual(gameState.team1Score, 2);
        });

        it('should handle tied trick counts', function() {
            gameState.maker = 1;
            gameState.goingAlone = false;
            gameState.players = {
                'south': { team: 1, tricksTakenThisHand: 2 },
                'west': { team: 2, tricksTakenThisHand: 2 },
                'north': { team: 1, tricksTakenThisHand: 1 },
                'east': { team: 2, tricksTakenThisHand: 0 }
            };
            gameState.playerSlots = ['south', 'west', 'north', 'east'];
            server.scoreCurrentHand();
            assert.strictEqual(gameState.team1Score, 1);
        });
    });
});
