import sinon from "sinon";
import proxyquire from "proxyquire";

// Add missing config object
const config = {
    SAVE_ON_EXIT: true,
    AUTO_SAVE: true,
    SAVE_FILE: './game_state.json'
};

// Add missing logger object
const logger = {
    info: () => {},
    error: () => {},
    debug: () => {}
};

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

/**
 * Mock server implementation for testing
 */
export class MockServer {
    constructor(options = {}) {
        this.io = options.io || {};
        this.config = { ...config, ...options.config };
        this.logger = options.logger || logger;
        this.fs = options.fs || {
            readFileSync: () => {},
            writeFileSync: () => {},
            existsSync: () => false,
            mkdirSync: () => {}
        };
        this.gameState = options.initialState || {
            gamePhase: 'LOBBY',
            players: {},
            team1Score: 0,
            team2Score: 0
        };
        this.autoSaveInterval = null;
    }

    async initialize() {
        // Add missing initialization logic
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
