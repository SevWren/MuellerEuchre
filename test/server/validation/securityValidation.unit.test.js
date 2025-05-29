import assert from "assert";
import proxyquire from "proxyquire";
import sinon from "sinon";
import { Buffer } from "buffer";
import { expect } from 'chai';
import { createTestServer } from '../test-utils.js';

describe('Security Validation', function() {
    let server, gameState, mockIo, mockSockets = {};
    let logStub, appendFileStub;

    beforeEach(() => {
        ({ server, gameState, mockIo, logStub, appendFileStub } = createTestServer());
    });

    afterEach(() => {
        logStub.restore();
    });

    // Helper to generate a malicious payload
    const generateMaliciousPayload = () => ({
        __proto__: {
            isAdmin: true,
            toString: () => 'malicious',
            valueOf: () => 42
        },
        constructor: { name: 'Malicious' },
        then: (resolve) => resolve('hacked')
    });

    it('should prevent prototype pollution', function() {
        const maliciousPayload = generateMaliciousPayload();
        
        assert.throws(
            () => server.handlePlayCard('south', maliciousPayload),
            /Invalid card/
        );
        
        assert.throws(
            () => server.updatePlayerData(maliciousPayload, { name: 'test' }),
            /Invalid player/
        );
    });

    it('should prevent XSS in player names', function() {
        const xssPayload = '<script>alert(1)</script>';
        
        assert.throws(
            () => server.updatePlayerData('south', { name: xssPayload }),
            /Invalid name/
        );
        
        assert.throws(
            () => server.handleChatMessage('south', { message: xssPayload }),
            /Invalid message/
        );
    });

    it('should prevent path traversal in file operations', function() {
        const maliciousPath = '../../etc/passwd';
        
        assert.throws(
            () => server.loadGameState(maliciousPath),
            /Invalid path/
        );
        
        assert.throws(
            () => server.saveGameState('..' + maliciousPath, {}),
            /Invalid path/
        );
    });

    it('should handle malformed JSON input', function() {
        const malformedJson = '{"invalid": "json"';
        
        fsMock.readFileSync.returns(malformedJson);
        
        assert.doesNotThrow(() => {
            server.loadGameState('test.json');
        });
        
        assert(logStub.calledWith(sinon.match(/Error parsing/)));
    });
});
