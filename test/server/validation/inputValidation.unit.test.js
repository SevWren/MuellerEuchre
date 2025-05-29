import assert from "assert";
import sinon from "sinon";
import { expect } from 'chai';
import { createTestServer } from '../testHelpers.js';

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
        });

        // ...existing player input validation tests...
    });

    // ...existing input sanitization tests...
});
