import sinon from "sinon";
import proxyquire from "proxyquire";

/**
 * Creates a test server instance with mocked dependencies
 * @returns {Object} Object containing server, gameState, mockIo, and other test utilities
 */
export function createTestServer() {
    const logStub = sinon.stub(console, 'log');
    const appendFileStub = sinon.stub();
    
    // Mock fs
    const fsMock = { 
        appendFileSync: appendFileStub,
        readFileSync: sinon.stub().returns(''),
        existsSync: sinon.stub().returns(false),
        writeFileSync: sinon.stub()
    };
    
    // Mock socket.io
    const mockIo = {
        sockets: { sockets: {} },
        to: sinon.stub().returnsThis(),
        emit: sinon.stub(),
        in: sinon.stub().returnsThis(),
        on: sinon.stub().callsFake(function(event, handler) {
            if (event === 'connection') {
                this.connectionHandler = handler;
            }
        })
    };
    
    const server = proxyquire('../../server3.mjs', {
        fs: fsMock,
        'socket.io': function() { return mockIo; }
    });

    return {
        server,
        gameState: server.gameState,
        mockIo,
        logStub,
        appendFileStub,
        createMockSocket: (id) => {
            const socket = {
                id,
                emit: sinon.stub(),
                eventHandlers: {},
                on: function(event, handler) {
                    this.eventHandlers[event] = handler;
                    return this;
                }
            };
            mockIo.sockets.sockets[id] = socket;
            return socket;
        }
    };
}
