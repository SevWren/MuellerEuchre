/**
 * @file server3.reconnection.test.js - Test file
 * @module Server3ReconnectionTest
 * @description Test file for player reconnection functionality
 * @requires chai
 * @requires ../../server3.mjs
 */

import assert from "assert";
import proxyquire from "proxyquire";
import sinon from "sinon";
import { io } from 'socket.io-client';
// {ReconnectionHandler} was causing errors
//import { ReconnectionHandler } from '../../src/socket/reconnectionHandler.js';
import ReconnectionHandler from '../../src/socket/reconnectionHandler.js';

import { createTestServer } from './test-utils.js';

describe('Player Reconnection', function() {
    let server, gameState, mockIo, mockSockets;

    beforeEach(() => {
        // Use standardized test server creation
        ({ server, gameState, mockIo, mockSockets } = createTestServer());
    });
    
    afterEach(() => {
        logStub.restore();
    });
    
    describe('Lobby Reconnection', function() {
        it('should allow player to reconnect in LOBBY phase', function() {
            // Use standardized mockSockets from test-utils
            const socket1 = mockSockets['socket1'];
            // Initial connection
            mockIo.connectionHandler(socket1);
            
            // Get assigned role
            const role1 = Object.keys(gameState.players).find(
                role => gameState.players[role].id === 'socket1'
            );
            
            // Disconnect
            socket1.disconnect();
            
            // Reconnect with same socket ID
            const socket2 = createMockSocket('socket1');
            mockIo.connectionHandler(socket2);
            
            // Should get same role back
            assert.strictEqual(gameState.players[role1].id, 'socket1');
            assert(logStub.calledWith(sinon.match(/reconnected/)));
        });
        
        it('should handle multiple reconnections', function() {
            // Test multiple reconnection attempts
            for (let i = 0; i < 3; i++) {
                const socket = createMockSocket('socket1');
                mockIo.connectionHandler(socket);
                socket.disconnect();
            }
            
            // Final reconnection
            const finalSocket = createMockSocket('socket1');
            mockIo.connectionHandler(finalSocket);
            
            // Should still be in a valid state
            const role = Object.keys(gameState.players).find(
                r => gameState.players[r].id === 'socket1'
            );
            assert(role, 'Should have a role assigned');
        });
    });
    
    describe('In-Game Reconnection', function() {
        let gameSocket1, gameSocket2, gameSocket3, gameSocket4;
        
        beforeEach(() => {
            // Set up a game in progress
            gameSocket1 = createMockSocket('socket1');
            gameSocket2 = createMockSocket('socket2');
            gameSocket3 = createMockSocket('socket3');
            gameSocket4 = createMockSocket('socket4');
            
            // Connect all players
            mockIo.connectionHandler(gameSocket1);
            mockIo.connectionHandler(gameSocket2);
            mockIo.connectionHandler(gameSocket3);
            mockIo.connectionHandler(gameSocket4);
            
            // Start the game
            simulateAction('socket1', 'request_start_game');
            
            // Set up a trick in progress
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.currentPlayer = 'south';
            gameState.players.south.hand = [{ id: 'test-card', suit: 'hearts', value: 'A' }];
        });
        
        it('should allow reconnection during a trick', function() {
            // Disconnect and reconnect a player
            const originalPlayer = gameState.players.south;
            gameSocket1.disconnect();
            
            // Verify player is marked as disconnected
            assert(!gameState.players.south.connected);
            
            // Reconnect
            const newSocket = createMockSocket('socket1');
            mockIo.connectionHandler(newSocket);
            
            // Verify player is reconnected with same state
            assert.strictEqual(gameState.players.south.id, 'socket1');
            assert(gameState.players.south.connected);
            assert.deepStrictEqual(
                gameState.players.south.hand, 
                originalPlayer.hand
            );
            
            // Should be able to continue playing
            simulateAction('socket1', 'action_play_card', { 
                card: { id: 'test-card' } 
            });
            
            assert.strictEqual(gameState.currentTrickPlays.length, 1);
        });
        
        it('should handle reconnection with game state sync', function() {
            // Disconnect a player
            gameSocket1.disconnect();
            
            // Play some cards while player is disconnected
            gameState.currentTrickPlays.push({
                player: 'west',
                card: { id: 'test-card-2' }
            });
            
            // Reconnect
            const newSocket = createMockSocket('socket1');
            mockIo.connectionHandler(newSocket);
            
            // Verify game state was sent to reconnected player
            assert(newSocket.emit.calledWith('game_state_update'));
            
            // Verify the player received the current game state
            const gameStateCall = newSocket.emit.getCalls().find(
                call => call.args[0] === 'game_state_update'
            );
            
            assert(gameStateCall);
            const sentState = gameStateCall.args[1];
            assert.strictEqual(sentState.gamePhase, 'PLAYING_TRICKS');
            assert.strictEqual(sentState.currentTrickPlays.length, 1);
        });
    });
    
    describe('Network Interruption', function() {
        it('should handle temporary network issues', function(done) {
            // This test simulates a flaky connection
            const socket = createMockSocket('flaky-socket');
            mockIo.connectionHandler(socket);
            
            // Simulate multiple disconnects/reconnects
            const testIntervals = [100, 200, 300]; // ms between toggles
            let toggleCount = 0;
            
            const toggleConnection = () => {
                if (toggleCount >= testIntervals.length * 2) {
                    done();
                    return;
                }
                
                if (toggleCount % 2 === 0) {
                    // Disconnect
                    socket.disconnect();
                } else {
                    // Reconnect
                    const newSocket = createMockSocket('flaky-socket');
                    mockIo.connectionHandler(newSocket);
                }
                
                toggleCount++;
                if (toggleCount < testIntervals.length * 2) {
                    setTimeout(toggleConnection, testIntervals[Math.floor(toggleCount/2)]);
                } else {
                    done();
                }
            };
            
            toggleConnection();
        }).timeout(2000);
    });
    
    describe('Reconnection Integration', () => {
        let server, client, reconnectionHandler;
        
        beforeEach(async () => {
            // Set up test server
            server = new Server();
            await server.listen(3000);
            
            // Set up test client
            client = io('ws://localhost:3000');
            reconnectionHandler = new ReconnectionHandler(client);
        });

        afterEach(async () => {
            await server.close();
            client.close();
        });

        it('should handle graceful reconnection', async () => {
            // Force disconnect
            server.close();
            
            // Wait for disconnect and reconnection attempt
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Restart server
            await server.listen(3000);
            
            // Wait for reconnection
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(client.connected).to.be.true;
            expect(reconnectionHandler.reconnectAttempts).to.be.greaterThan(0);
        });

        it('should maintain game state through reconnection', async () => {
            // Set up game state
            const gameState = {
                id: 'test-game',
                players: { south: { id: client.id } }
            };
            
            client.emit('game:join', gameState);
            
            // Force disconnect
            server.close();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Restart server
            await server.listen(3000);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify state is maintained
            const currentState = await new Promise(resolve => {
                client.emit('game:state', null, resolve);
            });
            
            expect(currentState.id).to.equal(gameState.id);
            expect(currentState.players.south.id).to.equal(client.id);
        });

        it('should handle message queueing during disconnect', async () => {
            const messages = [];
            server.on('message', msg => messages.push(msg));
            
            // Disconnect
            server.close();
            
            // Queue messages
            client.emit('message', 'msg1');
            client.emit('message', 'msg2');
            
            // Reconnect
            await server.listen(3000);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(messages).to.include('msg1');
            expect(messages).to.include('msg2');
        });
    });
});
