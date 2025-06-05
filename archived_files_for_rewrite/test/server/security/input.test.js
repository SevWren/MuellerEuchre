import assert from "assert";
import { createTestServer } from '../test-utils.js';
import sinon from "sinon";
import { Buffer } from "buffer";

describe('Input Security Tests', function() {
    let server, mockIo, mockSockets = {};
    let logStub;

    beforeEach(() => {
        ({ server, mockIo, mockSockets, logStub } = createTestServer());
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('Input Validation', function() {
        it('should prevent NoSQL injection', function() {
            assert.throws(
                () => server.searchPlayers({ $where: '1 === 1' }),
                /Invalid query/
            );
        });

        it('should prevent XSS in all outputs', function() {
            const xssPayload = '<script>alert(1)</script>';
            ['username', 'displayName', 'bio', 'message'].forEach(field => {
                assert.throws(
                    () => server.updateUserProfile({ [field]: xssPayload }),
                    /contains invalid characters/
                );
            });
        });
    });

    describe('DoS Protection', function() {
        it('should limit request size', function() {
            const largePayload = Buffer.alloc(10 * 1024 * 1024);
            assert.throws(
                () => server.handleLargeRequest({ body: largePayload }),
                /Payload too large/
            );
        });

        it('should limit websocket message size', function() {
            const socket = mockSockets['ws-dos'];
            socket.eventHandlers.message(Buffer.alloc(1e6));
            assert(socket.disconnect.calledWith(true));
        });
    });
});
