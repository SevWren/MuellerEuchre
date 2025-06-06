/**
 * @file server3.socket.unit.test.js - Unit tests for the Server3 Socket module
 * @module Server3SocketUnitTest
 * @description Unit tests for the Server3 Socket module
 * @requires chai
 * @requires ../../server3.mjs
 */

import assert from "assert";
import sinon from "sinon";
import { expect } from 'chai';
import { createTestServer } from './test-utils.js';

describe('Socket.IO Event Handlers', function() {
    let server, gameState, mockIo, mockSockets;

    beforeEach(() => {
        ({ server, gameState, mockIo, mockSockets } = createTestServer());
        
        // Set up test players
        gameState.playerSlots.forEach((role, index) => {
            gameState.players[role].id = `socket-${index}`;
            gameState.players[role].name = role.charAt(0).toUpperCase() + role.slice(1);
        });
    });

    describe('connection', function() {
        it('should assign a role to a connecting player in LOBBY phase', function() {
            // Simulate connection
            const socket = { 
                id: 'new-socket-id',
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Verify the player was assigned a role
            let assigned = false;
            gameState.playerSlots.forEach(role => {
                if (gameState.players[role].id === 'new-socket-id') {
                    assigned = true;
                }
            });
            
            assert(assigned, 'Player was not assigned a role');
            assert(socket.emit.calledWith('assign_role'));
            assert.strictEqual(gameState.connectedPlayerCount, 1);
        });

        it('should handle full game by not assigning a role', function() {
            // Fill all player slots
            gameState.playerSlots.forEach((role, index) => {
                gameState.players[role].id = `socket-${index}`;
                gameState.connectedPlayerCount = 4;
            });
            
            // Simulate connection
            const socket = { 
                id: 'new-socket-id',
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Verify the player was not assigned a role
            let assigned = false;
            gameState.playerSlots.forEach(role => {
                if (gameState.players[role].id === 'new-socket-id') {
                    assigned = true;
                }
            });
            
            assert(!assigned, 'Player was incorrectly assigned a role');
            assert(socket.emit.calledWith('game_full'));
        });
    });

    describe('request_start_game', function() {
        it('should start a new game when 4 players are connected', function() {
            // Set up 4 connected players
            gameState.connectedPlayerCount = 4;
            
            // Mock the socket
            const socket = { 
                id: 'socket-0',
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Set up the request_start_game handler
            let startGameHandler;
            socket.on.callsFake((event, handler) => {
                if (event === 'request_start_game') {
                    startGameHandler = handler;
                }
            });
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Mock startNewHand
            const startNewHandSpy = sinon.spy(server, 'startNewHand');
            
            // Trigger the start game request
            startGameHandler();
            
            // Verify the game started
            assert(startNewHandSpy.calledOnce);
            assert(logStub.calledWith(sinon.match(/Game start requested/)));
            
            startNewHandSpy.restore();
        });

        it('should not start a game with fewer than 4 players', function() {
            // Set up only 3 connected players
            gameState.connectedPlayerCount = 3;
            
            // Mock the socket
            const socket = { 
                id: 'socket-0',
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Set up the request_start_game handler
            let startGameHandler;
            socket.on.callsFake((event, handler) => {
                if (event === 'request_start_game') {
                    startGameHandler = handler;
                }
            });
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Mock startNewHand
            const startNewHandSpy = sinon.spy(server, 'startNewHand');
            
            // Trigger the start game request
            startGameHandler();
            
            // Verify the game did not start
            assert(!startNewHandSpy.called);
            assert(socket.emit.calledWith('action_error', 'Need 4 players to start.'));
            
            startNewHandSpy.restore();
        });
    });

    describe('disconnect', function() {
        it('should handle player disconnection in LOBBY phase', function() {
            // Set up a connected player
            const playerRole = 'south';
            const socketId = 'test-socket-id';
            gameState.players[playerRole].id = socketId;
            gameState.connectedPlayerCount = 1;
            
            // Mock the socket
            const socket = { 
                id: socketId,
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Set up the disconnect handler
            let disconnectHandler;
            socket.on.callsFake((event, handler) => {
                if (event === 'disconnect') {
                    disconnectHandler = handler;
                }
            });
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Trigger the disconnect handler
            disconnectHandler();
            
            // Verify the player was removed
            assert.strictEqual(gameState.players[playerRole].id, null);
            assert.strictEqual(gameState.connectedPlayerCount, 0);
            assert(logStub.calledWith(sinon.match(/User disconnected/)));
        });

        it('should handle player disconnection during active game', function() {
            // Set up an active game
            const playerRole = 'south';
            const socketId = 'test-socket-id';
            gameState.players[playerRole].id = socketId;
            gameState.connectedPlayerCount = 4;
            gameState.gamePhase = 'PLAYING_TRICKS';
            
            // Mock the socket
            const socket = { 
                id: socketId,
                emit: sinon.stub(),
                on: sinon.stub()
            };
            
            // Set up the disconnect handler
            let disconnectHandler;
            socket.on.callsFake((event, handler) => {
                if (event === 'disconnect') {
                    disconnectHandler = handler;
                }
            });
            
            // Trigger the connection handler
            mockIo.connectionCallback(socket);
            
            // Trigger the disconnect handler
            disconnectHandler();
            
            // Verify the game state was reset
            assert.strictEqual(gameState.gamePhase, 'LOBBY');
            assert.strictEqual(gameState.connectedPlayerCount, 0);
            assert(logStub.calledWith(sinon.match(/Game reset due to disconnection/)));
        });
    });

    describe('Socket Server', () => {
        let server, mockSocket, mockGameState;

        beforeEach(() => {
            mockSocket = {
                id: 'test-socket-id',
                emit: sinon.stub(),
                on: sinon.stub(),
                join: sinon.stub(),
                leave: sinon.stub()
            };

            mockGameState = {
                players: {},
                connectedPlayerCount: 0
            };

            server = initializeSocket(mockSocket, mockGameState);
        });

        afterEach(() => {
            sinon.restore();
        });

        describe('Connection handling', () => {
            it('should handle new socket connections', () => {
                const connectHandler = server.connectionHandler;
                connectHandler(mockSocket);

                expect(mockSocket.on.calledWith('disconnect')).to.be.true;
                expect(mockSocket.on.calledWith('game:join')).to.be.true;
            });

            it('should clean up on socket disconnect', () => {
                const disconnectHandler = mockSocket.on.args.find(([event]) => event === 'disconnect')[1];
                
                mockGameState.players = {
                    'south': { id: mockSocket.id }
                };
                mockGameState.connectedPlayerCount = 1;

                disconnectHandler();

                expect(mockGameState.connectedPlayerCount).to.equal(0);
                expect(mockSocket.emit.calledWith('player:disconnected')).to.be.true;
            });
        });

        describe('Game events', () => {
            beforeEach(() => {
                mockSocket = {
                    id: 'test-socket-id',
                    emit: sinon.stub(),
                    on: sinon.stub(),
                    join: sinon.stub(),
                    leave: sinon.stub(),
                    to: sinon.stub().returns({
                        emit: sinon.stub()
                    })
                };
            });

            it('should broadcast game state updates', () => {
                const updateHandler = mockSocket.on.args.find(([event]) => event === 'game:update')[1];
                
                const gameUpdate = {
                    phase: 'PLAYING',
                    currentPlayer: 'south'
                };

                updateHandler(gameUpdate);

                expect(mockSocket.to('game-room').emit.calledWith('game:state', gameUpdate)).to.be.true;
            });

            it('should handle player ready status', () => {
                const readyHandler = mockSocket.on.args.find(([event]) => event === 'player:ready')[1];
                
                readyHandler({ ready: true });

                expect(mockSocket.to('game-room').emit.calledWith('player:status')).to.be.true;
                expect(mockGameState.players[mockSocket.id].ready).to.be.true;
            });
        });

        describe('Room management', () => {
            it('should notify room when player joins', () => {
                const joinHandler = mockSocket.on.args.find(([event]) => event === 'room:join')[1];
                joinHandler({ roomId: 'game-1' });
                expect(mockSocket.to('game-1').emit.calledWith('room:playerJoined')).to.be.true;
            });

            it('should clean up room on all players leaving', () => {
                const leaveHandler = mockSocket.on.args.find(([event]) => event === 'room:leave')[1];
                mockIo.sockets.adapter.rooms.set('game-1', new Set());
                leaveHandler({ roomId: 'game-1' });
                expect(mockIo.sockets.adapter.rooms.has('game-1')).to.be.false;
            });
        });

        describe('Error handling', () => {
            it('should handle connection errors', () => {
                const errorHandler = mockSocket.on.args.find(([event]) => event === 'error')[1];
                const error = new Error('Connection failed');
                errorHandler(error);
                expect(mockSocket.emit.calledWith('error', 'Connection failed')).to.be.true;
            });

            it('should handle invalid game actions', () => {
                const actionHandler = mockSocket.on.args.find(([event]) => event === 'game:action')[1];
                actionHandler({ type: 'INVALID' });
                expect(mockSocket.emit.calledWith('error', 'Invalid game action')).to.be.true;
            });
        });
    });
});
