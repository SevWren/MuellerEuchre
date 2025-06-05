import assert from "assert";
import { createTestServer } from '../test-utils.js';
import sinon from "sinon";

describe('Authentication & Session Security Tests', function() {
    let server, mockIo, mockSockets = {};
    let logStub;

    beforeEach(() => {
        ({ server, mockIo, mockSockets, logStub } = createTestServer());
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('Authentication', function() {
        it('should require authentication for protected routes', function() {
            const socket = mockSockets['unauthenticated'];
            mockIo.connectionHandler(socket);
            
            assert.throws(
                () => socket.eventHandlers.protected_action({}),
                /Unauthorized/
            );
        });

        it('should prevent session fixation', function() {
            const sessionId = 'fixed-session-id';
            const socket1 = mockSockets['socket1'];
            socket1.handshake.sessionID = sessionId;
            
            mockIo.connectionHandler(socket1);
            socket1.eventHandlers.authenticate({ token: 'valid-token' });
            
            const socket2 = mockSockets['socket2'];
            socket2.handshake.sessionID = sessionId;
            mockIo.connectionHandler(socket2);
            
            assert(socket1.disconnect.called);
            assert(socket2.emit.calledWith('auth_error', 'Session invalidated'));
        });
    });

    describe('Session Security', function() {
        it('should use secure session cookies', function() {
            const sessionConfig = server.getSessionConfig();
            
            assert.strictEqual(sessionConfig.cookie.secure, true);
            assert.strictEqual(sessionConfig.cookie.httpOnly, true);
            assert.strictEqual(sessionConfig.cookie.sameSite, 'strict');
        });

        it('should regenerate session ID on login', function() {
            const socket = mockSockets['session-test'];
            let newSessionId;
            
            socket.handshake.session = {
                regenerate: (cb) => {
                    newSessionId = 'new-session';
                    cb();
                },
                save: (cb) => cb()
            };
            
            socket.eventHandlers.authenticate({ username: 'test', password: 'test' });
            assert.strictEqual(newSessionId, 'new-session');
        });
    });
});
