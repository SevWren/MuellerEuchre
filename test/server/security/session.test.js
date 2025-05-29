import assert from "assert";
import sinon from "sinon";
import { createTestServer } from '../test-utils.js';

describe('Session & Header Security Tests', function() {
    let server, mockIo;
    
    beforeEach(() => {
        ({ server, mockIo } = createTestServer());
    });
    
    afterEach(() => {
        sinon.restore();
    });

    describe('Session Security', function() {
        it('should use secure session configuration', function() {
            const config = server.getSessionConfig();
            assert.strictEqual(config.cookie.secure, true);
            assert.strictEqual(config.cookie.httpOnly, true);
            assert.strictEqual(config.cookie.sameSite, 'strict');
        });
    });

    describe('CSRF Protection', function() {
        it('should require CSRF token for state-changing requests', function() {
            const socket = mockIo.sockets.sockets['test-socket'];
            assert.throws(
                () => socket.eventHandlers.update_profile({ name: 'test' }),
                /CSRF token missing/
            );
        });
    });

    describe('Security Headers', function() {
        it('should set appropriate security headers', function() {
            const res = {
                removeHeader: sinon.stub(),
                setHeader: sinon.stub()
            };
            
            server.applySecurityHeaders({}, res, sinon.stub());
            
            assert(res.removeHeader.calledWith('X-Powered-By'));
            assert(res.setHeader.calledWith('X-Content-Type-Options', 'nosniff'));
            assert(res.setHeader.calledWith('X-Frame-Options', 'DENY'));
            assert(res.setHeader.calledWith('X-XSS-Protection', '1; mode=block'));
        });
    });
});
