const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Server Logging and Debug', function() {
    let server;
    let logStub, appendFileStub;
    let DEBUG_LEVELS, log, setDebugLevel, currentDebugLevel;

    beforeEach(() => {
        logStub = sinon.stub(console, 'log');
        appendFileStub = sinon.stub();
        
        // Mock fs.appendFileSync
        const fsMock = { appendFileSync: appendFileStub };
        
        // Mock socket.io
        const ioMock = function() {
            return {
                sockets: { sockets: {} },
                to: () => ({ emit: () => {} }),
                emit: () => {},
                on: () => {},
                in: () => ({ emit: () => {} })
            };
        };

        // Load the server module with mocks
        server = proxyquire('../server3', {
            fs: fsMock,
            'socket.io': ioMock
        });

        // Extract the functions we want to test
        DEBUG_LEVELS = server.DEBUG_LEVELS;
        log = server.log;
        setDebugLevel = server.setDebugLevel;
        currentDebugLevel = server.currentDebugLevel;
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('log function', function() {
        it('should log messages when level is <= currentDebugLevel', function() {
            // Current debug level is WARNING (2) by default
            log(DEBUG_LEVELS.WARNING, 'Test warning');
            assert(logStub.calledOnce);
            
            // Should not log when level is higher than current
            logStub.resetHistory();
            log(DEBUG_LEVELS.VERBOSE, 'Test verbose'); // VERBOSE is 3 > WARNING(2)
            assert(logStub.notCalled);
        });

        it('should include log level and message in output', function() {
            log(DEBUG_LEVELS.INFO, 'Test message');
            const logMessage = logStub.firstCall.args[0];
            assert(logMessage.includes('[INFO]'));
            assert(logMessage.includes('Test message'));
        });

        it('should write to log file', function() {
            log(DEBUG_LEVELS.INFO, 'Test message');
            assert(appendFileStub.calledOnce);
            assert(appendFileStub.firstCall.args[0] === 'server_log.txt');
            assert(appendFileStub.firstCall.args[1].includes('[INFO] Test message'));
        });
    });

    describe('setDebugLevel', function() {
        it('should update currentDebugLevel with valid level', function() {
            setDebugLevel(DEBUG_LEVELS.VERBOSE);
            assert.strictEqual(server.currentDebugLevel, DEBUG_LEVELS.VERBOSE);
            
            setDebugLevel(DEBUG_LEVELS.INFO);
            assert.strictEqual(server.currentDebugLevel, DEBUG_LEVELS.INFO);
        });

        it('should ignore invalid debug levels', function() {
            const originalLevel = server.currentDebugLevel;
            setDebugLevel(999); // Invalid level
            assert.strictEqual(server.currentDebugLevel, originalLevel);
            
            // Should log a warning about invalid level
            assert(logStub.calledWith(sinon.match(/Invalid debug level/)));
        });

        it('should log the new debug level when changed', function() {
            setDebugLevel(DEBUG_LEVELS.VERBOSE);
            assert(logStub.calledWith(sinon.match(/Debug level set to VERBOSE/)));
        });
    });
});
