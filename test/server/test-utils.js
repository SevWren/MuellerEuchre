import proxyquire from "proxyquire";
import sinon from "sinon";

export function createTestServer() {
    const logStub = sinon.stub(console, 'log');
    const mockSockets = {
        'unauthenticated': createMockSocket('unauthenticated'),
        'socket1': createMockSocket('socket1'),
        'socket2': createMockSocket('socket2'),
        'session-test': createMockSocket('session-test'),
        'ws-dos': createMockSocket('ws-dos')
    };

    const mockIo = {
        sockets: { 
            sockets: mockSockets,
            adapter: {
                rooms: new Map()
            }
        },
        connectionHandler: null,
        on: function(event, handler) {
            if (event === 'connection') {
                this.connectionHandler = handler;
            }
        }
    };

    const server = proxyquire('../../server3.mjs', {
        fs: createFsMock(),
        'socket.io': () => mockIo,
        'helmet': () => (req, res, next) => next(),
        'express-session': () => (req, res, next) => next(),
        'csurf': () => (req, res, next) => next()
    });

    return { server, mockIo, mockSockets, logStub };
}

function createMockSocket(id) {
    return {
        id,
        emit: sinon.stub(),
        disconnect: sinon.stub(),
        eventHandlers: {},
        on: function(event, handler) {
            this.eventHandlers[event] = handler;
            return this;
        },
        handshake: {}
    };
}

function createFsMock() {
    return {
        appendFileSync: sinon.stub(),
        readFileSync: sinon.stub().returns(''),
        existsSync: sinon.stub().returns(false),
        writeFileSync: sinon.stub()
    };
}
