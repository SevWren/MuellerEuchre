import proxyquire from "proxyquire";
import sinon from "sinon";

const config = {
    SAVE_ON_EXIT: false,
    AUTO_SAVE: false,
    SAVE_FILE: './game_state.json'
};

const logger = {
    info: () => {},
    error: () => {},
    debug: () => {}
};

/**
 * Standardized MockServer implementation for all tests
 */
export class MockServer {
    constructor(options = {}) {
        this.io = options.io || {};
        this.config = { ...config, ...options.config };
        this.logger = options.logger || logger;
        this.fs = options.fs || createFsMock();
        this.gameState = options.initialState || {
            gamePhase: 'LOBBY',
            players: {},
            team1Score: 0,
            team2Score: 0
        };
        this.autoSaveInterval = null;
    }

    async initialize() {
        if (this.config.AUTO_SAVE) {
            this.autoSaveInterval = setInterval(() => {
                this.saveGameState();
            }, 30000);
        }
        return this;
    }

    async saveGameState() {
        try {
            const data = JSON.stringify(this.gameState, null, 2);
            this.fs.writeFileSync(this.config.SAVE_FILE, data);
            return true;
        } catch (err) {
            this.logger.error('Error saving game state:', err);
            return false;
        }
    }

    getSessionConfig() {
        return {
            cookie: {
                secure: true,
                httpOnly: true,
                sameSite: 'strict'
            }
        };
    }
}

// Modify createTestServer to use MockServer
export function createTestServer(options = {}) {
    const logStub = sinon.stub(console, 'log');
    const mockServer = new MockServer({
        ...options,
        fs: createFsMock(),
        io: createMockIo(),
        logger: { info: logStub, error: logStub, debug: logStub }
    });

    return {
        server: mockServer,
        gameState: mockServer.gameState,
        mockIo: mockServer.io,
        logStub,
        mockSockets: mockServer.io.sockets.sockets
    };
}

// Helper function to create mock IO
function createMockIo() {
    const mockSockets = {
        'unauthenticated': createMockSocket('unauthenticated'),
        'socket1': createMockSocket('socket1'),
        'socket2': createMockSocket('socket2'),
        'session-test': createMockSocket('session-test'),
        'ws-dos': createMockSocket('ws-dos')
    };

    return {
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
