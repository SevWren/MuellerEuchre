import assert from "assert";
import { createTestServer } from '../test-utils.js';
import sinon from "sinon";

describe('Security Headers & Disclosure Tests', function() {
    let server, mockIo;
    let logStub;

    beforeEach(() => {
        ({ server, mockIo, logStub } = createTestServer());
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('Security Headers', function() {
        it('should set appropriate CSP headers', function() {
            const res = {
                setHeader: sinon.stub(),
                send: sinon.stub()
            };
            
            server.applyCSP({}, res, sinon.stub());
            
            assert(res.setHeader.calledWith(
                'Content-Security-Policy',
                sinon.match(/default-src 'self'/)
            ));
        });

        it('should not expose sensitive headers', function() {
            const res = {
                removeHeader: sinon.stub(),
                setHeader: sinon.stub()
            };
            
            server.applySecurityHeaders({}, res, sinon.stub());
            
            assert(res.removeHeader.calledWith('X-Powered-By'));
            assert(res.setHeader.calledWith('X-Content-Type-Options', 'nosniff'));
        });
    });

    describe('Error Handling', function() {
        it('should not leak stack traces in production', function() {
            process.env.NODE_ENV = 'production';
            
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };
            
            server.handleError(new Error('Test error'), {}, res, sinon.stub());
            
            assert(res.json.calledWithMatch({
                error: 'Internal Server Error'
            }));
            
            process.env.NODE_ENV = 'test';
        });
    });
});
