import assert from "assert";
import sinon from "sinon";
import { expect } from 'chai';
import { createTestServer } from '../test-utils.js';

describe('Input Validation', function() {
    let server, gameState, mockIo;
    let logStub;

    beforeEach(() => {
        ({ server, gameState, mockIo, logStub } = createTestServer());
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('Player Input Validation', function() {
        it('should validate player role in actions', function() {
            assert.throws(
                () => server.handlePlayCard('invalid-role', { id: 'test-card' }),
                /Invalid player role/
            );
            
            assert.throws(
                () => server.handlePlayCard(null, { id: 'test-card' }),
                /Invalid player role/
            );
        });

        it('should validate card objects', function() {
            assert.throws(
                () => server.handlePlayCard('south', { invalid: 'card' }),
                /Invalid card format/
            );
            
            assert.throws(
                () => server.handlePlayCard('south', { suit: 'hearts', value: 'A' }),
                /Invalid card format/
            );
        });

        it('should handle special characters in input', function() {
            const specialName = '玩家1 🚀';
            const specialMessage = 'Special chars: !@#$%^&*()_+{}|:"<>?~`';
            
            server.updatePlayerData('south', { name: specialName });
            assert.strictEqual(gameState.players.south.name, specialName);
            
            server.handleChatMessage('south', { message: specialMessage });
            const lastMessage = gameState.chatMessages[gameState.chatMessages.length - 1];
            assert.strictEqual(lastMessage.text, specialMessage);
        });

        it('should trim whitespace from input', function() {
            const testName = '  test  ';
            const testMessage = '  hello  ';
            
            server.updatePlayerData('south', { name: testName });
            assert.strictEqual(gameState.players.south.name, testName.trim());
            
            server.handleChatMessage('south', { message: testMessage });
            const lastMessage = gameState.chatMessages[gameState.chatMessages.length - 1];
            assert.strictEqual(lastMessage.text, testMessage.trim());
        });
    });
});
