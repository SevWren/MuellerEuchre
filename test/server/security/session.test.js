/**
 * Session & Header Security Tests
 *
 * This test suite validates the security-related configurations and middleware
 * for session management, CSRF protection, and HTTP security headers in the server.
 *
 * @module test/server/security/session.test
 */

 /**
    * Sets up and tears down the test server and mocks for each test.
    * Uses Sinon for mocking and stubbing dependencies.
    */

 /**
    * Session Security
    *
    * @description
    * Ensures that the session configuration uses secure cookie settings.
    *
    * @test
    * - Cookie must be marked as secure.
    * - Cookie must be HTTP-only.
    * - Cookie must use 'strict' SameSite policy.
    */

 /**
    * CSRF Protection
    *
    * @description
    * Verifies that state-changing socket events require a valid CSRF token.
    *
    * @test
    * - Throws an error if CSRF token is missing on sensitive actions.
    */

 /**
    * Security Headers
    *
    * @description
    * Checks that the server sets appropriate HTTP security headers on responses.
    *
    * @test
    * - Removes 'X-Powered-By' header.
    * - Sets 'X-Content-Type-Options' to 'nosniff'.
    * - Sets 'X-Frame-Options' to 'DENY'.
    * - Sets 'X-XSS-Protection' to '1; mode=block'.
    */
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
