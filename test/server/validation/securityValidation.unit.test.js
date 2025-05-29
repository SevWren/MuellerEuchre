import assert from "assert";
import proxyquire from "proxyquire";
import sinon from "sinon";
import { Buffer } from "buffer";
import { expect } from 'chai';
import { createTestServer } from '../testHelpers.js';

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

    // ...existing security validation tests...
});
