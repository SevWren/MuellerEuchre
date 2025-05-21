const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { Buffer } = require('buffer');

describe('Security Tests', function() {
    let server, gameState, mockIo, mockSockets = {};
    let logStub, appendFileStub;
    
    // Helper to create a mock socket
    const createMockSocket = (id, role = null) => {
        const socket = {
            id,
            emit: sinon.stub(),
            eventHandlers: {},
            on: function(event, handler) {
                this.eventHandlers[event] = handler;
                return this;
            },
            join: sinon.stub().resolves(),
            leave: sinon.stub().resolves(),
            handshake: {}
        };
        
        mockSockets[id] = socket;
        mockIo.sockets.sockets[id] = socket;
        return socket;
    };
    
    // Helper to generate a malicious payload
    const generateMaliciousPayload = (type = 'xss') => {
        switch (type) {
            case 'xss':
                return {
                    __proto__: { isAdmin: true },
                    toString: () => '<script>alert(1)</script>',
                    valueOf: () => 42
                };
            case 'prototype':
                return JSON.parse('{"__proto__": {"isAdmin": true}}');
            case 'recursive':
                const obj = {};
                obj.self = obj;
                return obj;
            case 'buffer':
                return Buffer.alloc(1e8); // 100MB buffer
            default:
                return null;
        }
    };

    beforeEach(() => {
        logStub = sinon.stub(console, 'log');
        appendFileStub = sinon.stub();
        
        // Mock fs with security restrictions
        const fsMock = { 
            appendFileSync: appendFileStub,
            readFileSync: sinon.stub().returns(''),
            existsSync: sinon.stub().returns(false),
            writeFileSync: sinon.stub(),
            readdirSync: sinon.stub().returns([]),
            mkdirSync: sinon.stub(),
            constants: {
                F_OK: 0,
                R_OK: 4,
                W_OK: 2,
                X_OK: 1
            },
            access: sinon.stub().resolves(),
            promises: {
                access: sinon.stub().resolves(),
                readFile: sinon.stub().resolves('{}'),
                writeFile: sinon.stub().resolves()
            }
        };
        
        // Mock socket.io with security features
        mockIo = {
            sockets: { 
                sockets: {},
                adapter: {
                    rooms: new Map(),
                    sids: new Map(),
                    socketRooms: sinon.stub().returns(new Set())
                }
            },
            to: sinon.stub().returnsThis(),
            emit: sinon.stub(),
            in: sinon.stub().returnsThis(),
            on: sinon.stub().callsFake(function(event, handler) {
                if (event === 'connection') {
                    this.connectionHandler = handler;
                }
            }),
            use: sinon.stub().returnsThis(),
            engine: {
                ws: {
                    clients: new Set()
                }
            },
            _nsps: new Map()
        };
        
        // Load the server with security mocks
        server = proxyquire('../server3', {
            fs: fsMock,
            'socket.io': function() { return mockIo; },
            'helmet': () => (req, res, next) => next(),
            'rate-limit': () => (req, res, next) => next(),
            'express-brute': {
                MemoryStore: class {
                    constructor() {}
                    get() {}
                    set() {}
                    reset() {}
                }
            },
            'csurf': () => (req, res, next) => {
                req.csrfToken = () => 'test-token';
                next();
            },
            'express-session': () => (req, res, next) => {
                req.session = {};
                next();
            },
            'cookie-parser': () => (req, res, next) => next(),
            'http': { createServer: () => ({ listen: () => {} }) },
            'https': { createServer: () => ({ listen: () => {} }) },
            'crypto': {
                randomBytes: (size, cb) => {
                    if (cb) {
                        cb(null, Buffer.alloc(size).fill(0));
                    }
                    return Buffer.alloc(size).fill(0);
                },
                createHash: () => ({
                    update: () => ({
                        digest: () => 'hashed'
                    })
                }),
                randomInt: (min, max) => Math.floor(Math.random() * (max - min)) + min
            }
        });
        
        gameState = server.gameState;
        mockSockets = {};
    });
    
    afterEach(() => {
        logStub.restore();
    });
    
    describe('Authentication & Authorization', function() {
        it('should require authentication for protected routes', function() {
            const socket = createMockSocket('unauthenticated');
            
            // Simulate connection without auth
            mockIo.connectionHandler(socket);
            
            // Try to access protected action
            socket.eventHandlers.protected_action = server.handleProtectedAction;
            
            assert.throws(
                () => socket.eventHandlers.protected_action({}),
                /Unauthorized/
            );
        });
        
        it('should prevent session fixation', function() {
            const sessionId = 'fixed-session-id';
            const socket1 = createMockSocket('socket1');
            socket1.handshake.sessionID = sessionId;
            
            // First connection
            mockIo.connectionHandler(socket1);
            
            // Simulate login
            socket1.eventHandlers.authenticate({ token: 'valid-token' });
            
            // Second connection with same session ID
            const socket2 = createMockSocket('socket2');
            socket2.handshake.sessionID = sessionId;
            
            // Should not allow the second connection with the same session
            mockIo.connectionHandler(socket2);
            
            // First socket should be disconnected
            assert(socket1.disconnect.called, 'First socket should be disconnected');
            assert(socket2.emit.calledWith('auth_error', 'Session invalidated'));
        });
        
        it('should enforce rate limiting', function(done) {
            this.timeout(5000);
            
            const socket = createMockSocket('rate-limited');
            let callCount = 0;
            
            // Simulate rapid connection attempts
            const attemptConnection = () => {
                callCount++;
                mockIo.connectionHandler(socket);
                
                if (callCount < 5) {
                    setTimeout(attemptConnection, 10);
                } else {
                    // After 5 rapid attempts, should be rate limited
                    assert(socket.emit.calledWith('rate_limited'));
                    done();
                }
            };
            
            attemptConnection();
        });
    });
    
    describe('Input Validation', function() {
        it('should prevent NoSQL injection', function() {
            const maliciousQuery = { $where: '1 === 1' };
            
            assert.throws(
                () => server.searchPlayers(maliciousQuery),
                /Invalid query/
            );
            
            // Test other NoSQL operators
            const maliciousOperators = {
                $ne: 'admin',
                $gt: '',
                $where: 'true'
            };
            
            assert.throws(
                () => server.searchPlayers({ username: maliciousOperators }),
                /Invalid query/
            );
        });
        
        it('should prevent command injection', function() {
            const maliciousInput = '; rm -rf /';
            
            assert.throws(
                () => server.executeCommand(maliciousInput),
                /Invalid input/
            );
            
            // Test other shell metacharacters
            ['|', '&', '&&', '||', '`', '$('].forEach(char => {
                assert.throws(
                    () => server.executeCommand(`safe${char}malicious`),
                    /Invalid input/
                );
            });
        });
        
        it('should prevent XSS in all outputs', function() {
            const xssPayload = '<script>alert(1)</script>';
            const testCases = [
                { field: 'username', value: xssPayload },
                { field: 'displayName', value: xssPayload },
                { field: 'bio', value: xssPayload },
                { field: 'message', value: xssPayload }
            ];
            
            testCases.forEach(({ field, value }) => {
                // Test setting the field
                assert.throws(
                    () => server.updateUserProfile({ [field]: value }),
                    /contains invalid characters/
                );
                
                // Test in nested objects
                assert.throws(
                    () => server.updateUserProfile({ data: { [field]: value } }),
                    /contains invalid characters/
                );
            });
        });
    });
    
    describe('Session Security', function() {
        it('should use secure session cookies', function() {
            const sessionConfig = server.getSessionConfig();
            
            assert.strictEqual(sessionConfig.cookie.secure, true, 'Should use secure cookies');
            assert.strictEqual(sessionConfig.cookie.httpOnly, true, 'Should use httpOnly cookies');
            assert.strictEqual(sessionConfig.cookie.sameSite, 'strict', 'Should use strict sameSite policy');
            assert(sessionConfig.secret, 'Should have a session secret');
            assert(sessionConfig.genid, 'Should have a session ID generator');
        });
        
        it('should regenerate session ID on login', function() {
            const socket = createMockSocket('session-test');
            const oldSessionId = 'old-session';
            let newSessionId;
            
            // Mock session regeneration
            socket.handshake.session = {
                regenerate: (cb) => {
                    newSessionId = 'new-session';
                    cb();
                },
                save: (cb) => cb()
            };
            
            // Simulate login
            socket.eventHandlers.authenticate({ username: 'test', password: 'test' });
            
            // Session should be regenerated
            assert.notStrictEqual(newSessionId, oldSessionId, 'Session ID should change after login');
        });
    });
    
    describe('CSRF Protection', function() {
        it('should require CSRF token for state-changing requests', function() {
            const socket = createMockSocket('csrf-test');
            
            // Simulate request without CSRF token
            assert.throws(
                () => socket.eventHandlers.update_profile({ name: 'test' }),
                /CSRF token missing/
            );
            
            // Simulate request with invalid CSRF token
            socket.handshake.csrfToken = 'invalid-token';
            assert.throws(
                () => socket.eventHandlers.update_profile({ 
                    name: 'test',
                    _csrf: 'wrong-token' 
                }),
                /Invalid CSRF token/
            );
        });
        
        it('should not require CSRF token for safe methods', function() {
            const socket = createMockSocket('csrf-safe');
            
            // GET request should not need CSRF token
            assert.doesNotThrow(() => {
                socket.eventHandlers.get_profile({});
            });
        });
    });
    
    describe('Content Security Policy', function() {
        it('should set appropriate CSP headers', function() {
            const req = { headers: {} };
            const res = {
                setHeader: sinon.stub(),
                send: sinon.stub()
            };
            const next = sinon.stub();
            
            // Apply CSP middleware
            server.applyCSP(req, res, next);
            
            // Should set CSP header
            assert(res.setHeader.calledWith(
                'Content-Security-Policy',
                sinon.match(/default-src 'self'/)
            ));
            
            // Should call next()
            assert(next.calledOnce);
        });
    });
    
    describe('Denial of Service Protection', function() {
        it('should limit request size', function() {
            // Create a large payload (10MB)
            const largePayload = Buffer.alloc(10 * 1024 * 1024, 'x');
            
            // Should reject large requests
            assert.throws(
                () => server.handleLargeRequest({ body: largePayload }),
                /Payload too large/
            );
        });
        
        it('should limit websocket message size', function() {
            const socket = createMockSocket('ws-dos');
            const largeMessage = Buffer.alloc(1e6); // 1MB message
            
            // Should disconnect socket on large message
            socket.eventHandlers.message(largeMessage);
            
            assert(socket.disconnect.calledWith(true), 'Should disconnect on large message');
        });
    });
    
    describe('Information Disclosure', function() {
        it('should not leak stack traces in production', function() {
            // Force production mode
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            // Simulate an error
            const error = new Error('Test error');
            const req = {};
            const res = {
                status: sinon.stub().returnsThis(),
                json: sinon.stub()
            };
            const next = sinon.stub();
            
            // Handle error
            server.handleError(error, req, res, next);
            
            // Should not include stack trace in response
            assert(res.json.calledWithMatch({
                error: 'Internal Server Error'
            }));
            
            // Restore environment
            process.env.NODE_ENV = originalEnv;
        });
        
        it('should not expose sensitive headers', function() {
            const req = {};
            const res = {
                removeHeader: sinon.stub(),
                setHeader: sinon.stub()
            };
            const next = sinon.stub();
            
            // Apply security headers
            server.applySecurityHeaders(req, res, next);
            
            // Should remove sensitive headers
            assert(res.removeHeader.calledWith('X-Powered-By'));
            
            // Should set security headers
            assert(res.setHeader.calledWith('X-Content-Type-Options', 'nosniff'));
            assert(res.setHeader.calledWith('X-Frame-Options', 'DENY'));
            assert(res.setHeader.calledWith('X-XSS-Protection', '1; mode=block'));
        });
    });
});
