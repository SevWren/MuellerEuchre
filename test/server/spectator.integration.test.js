/**
 * @file server3.spectator.test.js - Test file
 * @module Server3SpectatorTest
 * @description Integration tests for spectator functionality
 * @requires chai
 * @requires ../../server3.mjs
 */

import assert from "assert";
import sinon from "sinon";
import { createTestServer } from './test-utils.js';

describe('Spectator Mode', function() {
    let server, gameState, mockIo, mockSockets;

    beforeEach(() => {
        ({ server, gameState, mockIo, mockSockets } = createTestServer());
        
        // Additional spectator-specific setup
        ['south', 'west', 'north', 'east'].forEach((role, idx) => {
            const socketId = `player-${role}`;
            gameState.players[role].id = socketId;
        });
        gameState.connectedPlayerCount = 4;
        server.startNewHand();
    });
    
    describe('Spectator Connection', function() {
        it('should allow spectators to connect to a full game', function() {
            // Game is full with 4 players
            assert.strictEqual(gameState.connectedPlayerCount, 4);
            
            // Spectator connects
            const spectatorSocket = createMockSocket('spectator-1');
            mockIo.connectionHandler(spectatorSocket);
            
            // Should be assigned as spectator
            assert(spectatorSocket.join.calledWith('spectators'));
            
            // Should receive game state
            assert(spectatorSocket.emit.calledWith('game_state_update'));
            assert(spectatorSocket.emit.calledWith('role_assigned', { 
                role: 'spectator', 
                isSpectator: true 
            }));
        });
        
        it('should handle multiple spectators', function() {
            // Add multiple spectators
            const spectators = [];
            for (let i = 0; i < 3; i++) {
                const socket = createMockSocket(`spectator-${i}`);
                mockIo.connectionHandler(socket);
                spectators.push(socket);
            }
            
            // Verify all spectators received updates
            spectators.forEach(socket => {
                assert(socket.emit.calledWith('game_state_update'));
                assert(socket.emit.calledWith('role_assigned', sinon.match({
                    role: 'spectator',
                    isSpectator: true
                })));
            });
        });
    });
    
    describe('Spectator Game View', function() {
        let spectatorSocket;
        
        beforeEach(() => {
            // Add a spectator
            spectatorSocket = createMockSocket('spectator-1');
            mockIo.connectionHandler(spectatorSocket);
        });
        
        it('should receive game state updates', function() {
            // Simulate a game state change
            gameState.gamePhase = 'PLAYING_TRICKS';
            server.broadcastGameState();
            
            // Spectator should receive the update
            const gameStateCall = spectatorSocket.emit.getCalls().find(
                call => call.args[0] === 'game_state_update'
            );
            
            assert(gameStateCall);
            const sentState = gameStateCall.args[1];
            assert.strictEqual(sentState.gamePhase, 'PLAYING_TRICKS');
        });
        
        it('should not receive private player information', function() {
            // Simulate broadcasting game state
            server.broadcastGameState();
            
            // Get the game state sent to spectator
            const gameStateCall = spectatorSocket.emit.getCalls().find(
                call => call.args[0] === 'game_state_update'
            );
            
            const sentState = gameStateCall.args[1];
            
            // Verify private information is not exposed
            Object.values(sentState.players).forEach(player => {
                assert(!player.hand || player.hand.length === 0, 'Spectator should not see player hands');
            });
        });
        
        it('should receive chat messages', function() {
            // Simulate a chat message from a player
            const playerSocket = mockSockets['player-south'];
            simulateAction('player-south', 'chat_message', { 
                message: 'Hello spectators!',
                isSpectator: false
            });
            
            // Spectator should receive the message
            assert(spectatorSocket.emit.calledWith('chat_message', {
                from: 'South',
                message: 'Hello spectators!',
                isSpectator: false,
                timestamp: sinon.match.number
            }));
        });
    });
    
    describe('Spectator Interaction', function() {
        let spectatorSocket;
        
        beforeEach(() => {
            // Add a spectator
            spectatorSocket = createMockSocket('spectator-1');
            mockIo.connectionHandler(spectatorSocket);
        });
        
        it('should allow spectators to send chat messages', function() {
            // Spectator sends a chat message
            simulateAction('spectator-1', 'chat_message', { 
                message: 'Great game!',
                isSpectator: true
            });
            
            // Message should be broadcast to all (including players)
            assert(mockIo.emit.calledWith('chat_message', {
                from: 'Spectator',
                message: 'Great game!',
                isSpectator: true,
                timestamp: sinon.match.number
            }));
        });
        
        it('should prevent spectators from taking game actions', function() {
            // Try to play a card as spectator
            simulateAction('spectator-1', 'action_play_card', { 
                card: { id: 'test-card' } 
            });
            
            // Should receive an error
            assert(spectatorSocket.emit.calledWith('action_error', 
                'Spectators cannot perform game actions.'
            ));
            
            // Try to order up
            simulateAction('spectator-1', 'action_order_up', { 
                decision: true 
            });
            
            // Should receive an error
            assert(spectatorSocket.emit.calledWith('action_error', 
                'Spectators cannot perform game actions.'
            ));
        });
    });
    
    describe('Spectator Disconnection', function() {
        it('should handle spectator disconnection', function() {
            // Add a spectator
            const spectatorSocket = createMockSocket('spectator-1');
            mockIo.connectionHandler(spectatorSocket);
            
            // Simulate disconnection
            spectatorSocket.eventHandlers.disconnect();
            
            // Verify clean up
            assert(spectatorSocket.leave.calledWith('spectators'));
            assert(logStub.calledWith(sinon.match(/Spectator disconnected/)));
        });
        
        it('should not affect game state when spectator disconnects', function() {
            // Add a spectator
            const spectatorSocket = createMockSocket('spectator-1');
            mockIo.connectionHandler(spectatorSocket);
            
            // Save current game state
            const gameStateBefore = JSON.parse(JSON.stringify(gameState));
            
            // Simulate disconnection
            spectatorSocket.eventHandlers.disconnect();
            
            // Game state should be unchanged
            assert.deepStrictEqual(gameState, gameStateBefore);
        });
    });
    
    describe('Spectator to Player Transition', function() {
        it('should allow spectator to join as player when slot is available', function() {
            // Add a spectator
            const spectatorSocket = createMockSocket('spectator-1');
            mockIo.connectionHandler(spectatorSocket);
            
            // A player disconnects
            const playerSocket = mockSockets['player-south'];
            playerSocket.eventHandlers.disconnect();
            
            // Spectator requests to join as player
            simulateAction('spectator-1', 'join_as_player', { role: 'south' });
            
            // Should be assigned the role
            assert.strictEqual(gameState.players.south.id, 'spectator-1');
            assert(spectatorSocket.emit.calledWith('role_assigned', {
                role: 'south',
                isSpectator: false
            }));
            
            // Should leave spectators room
            assert(spectatorSocket.leave.calledWith('spectators'));
        });
        
        it('should prevent taking an occupied slot', function() {
            // Add a spectator
            const spectatorSocket = createMockSocket('spectator-1');
            mockIo.connectionHandler(spectatorSocket);
            
            // Try to take an occupied slot
            simulateAction('spectator-1', 'join_as_player', { role: 'north' });
            
            // Should receive an error
            assert(spectatorSocket.emit.calledWith('action_error', 
                'That role is already taken.'
            ));
        });
    });
});
