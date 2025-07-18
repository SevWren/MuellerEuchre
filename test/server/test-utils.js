// filepath: test/server/test-utils.js

import { mock } from 'node:test';

const config = {
    SAVE_ON_EXIT: false,
    AUTO_SAVE: false,
    SAVE_FILE: './game_state.json'
};

// The logger is now mocked using node:test's mock.fn() in createTestServer
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
            players: {
                south: null,
                west: null,
                north: null,
                east: null
            },
            playerSlots: ['south', 'west', 'north', 'east'],
            team1Score: 0,
            team2Score: 0,
            version: '1.0.0'
        };
        this.autoSaveInterval = null;
    }

    async initialize() {
        try {
            if (this.fs.existsSync(this.config.SAVE_FILE)) {
                const savedState = JSON.parse(this.fs.readFileSync(this.config.SAVE_FILE, 'utf8'));
                if (savedState.version !== '1.0.0') {
                    this.resetGameState();
                } else {
                    this.gameState = savedState;
                }
            }
        } catch (err) {
            this.logger.error('Error loading saved state:', err);
            this.resetGameState();
        }

        if (this.config.AUTO_SAVE) {
            this.autoSaveInterval = setInterval(() => {
                this.saveGameState();
            }, 30000);
        }
        return this;
    }

    async saveGameState() {
        if (!this.config.AUTO_SAVE) {
            return false;
        }
        try {
            const data = JSON.stringify({
                ...this.gameState,
                version: '1.0.0'
            }, null, 2);
            this.fs.writeFileSync(this.config.SAVE_FILE, data);
            return true;
        } catch (err) {
            this.logger.error('Error saving game state:', err);
            return false;
        }
    }

    async cleanupGameState() {
        try {
            if (this.fs.existsSync(this.config.SAVE_FILE)) {
                this.fs.writeFileSync(this.config.SAVE_FILE, '{}');
                return true;
            }
            return false;
        } catch (err) {
            this.logger.error('Error cleaning up game state:', err);
            throw err;
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

    resetGameState() {
        this.gameState = {
            gamePhase: 'LOBBY',
            players: {
                south: null,
                west: null,
                north: null,
                east: null
            },
            playerSlots: ['south', 'west', 'north', 'east'],
            team1Score: 0,
            team2Score: 0,
            version: '1.0.0'
        };
    }

    shutdown() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
}

// Modify createTestServer to use MockServer
export function createTestServer(options = {}) {
    // Removed console.log statements as per rules.
    // Use logger.debug if specific debugging output is needed.

    // Create a custom logger that also logs to debug
    const logDebug = (...args) => {
        if (options.logger && options.logger.debug) {
            options.logger.debug('[Test Logger]', ...args);
        }
    };

    // Create a mock file system
    const fsMock = createFsMock();

    // Create mock IO
    const ioMock = createMockIo();

    // Create the mock server
    const mockServer = new MockServer({
        ...options,
        fs: fsMock,
        io: ioMock,
        logger: {
            info: mock.fn(logDebug),
            error: mock.fn(logDebug),
            debug: mock.fn(logDebug)
        }
    });

    const result = {
        server: mockServer,
        gameState: mockServer.gameState,
        mockIo: mockServer.io,
        logDebug, // Keep this for external debugging if needed
        mockSockets: mockServer.io.sockets.sockets
    };

    return result;
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
        on: mock.fn(function(event, handler) {
            if (event === 'connection') {
                this.connectionHandler = handler;
            }
        })
    };
}

function createMockSocket(id) {
    return {
        id,
        emit: mock.fn(),
        disconnect: mock.fn(),
        eventHandlers: {},
        on: mock.fn(function(event, handler) {
            this.eventHandlers[event] = handler;
            return this;
        }),
        handshake: {}
    };
}

function createFsMock() {
    return {
        appendFileSync: mock.fn(),
        readFileSync: mock.fn().mock.mockImplementation(() => ''),
        existsSync: mock.fn().mock.mockImplementation(() => false),
        writeFileSync: mock.fn()
    };
}

// Export helpers for use in tests
export { createMockSocket, createMockIo as mockIo };

// Provide a simulateAction helper for test files that need it
export function simulateAction(socketId, action, data) {
    // Try to find the socket in all known mock IOs
    let socket = null;
    // Try the default mockIo if available
    if (typeof mockIo !== 'undefined' && mockIo.sockets && mockIo.sockets.sockets) {
        socket = mockIo.sockets.sockets[socketId];
    }
    // Fallback: try globalThis (for some test runners)
    if (!socket && typeof globalThis !== 'undefined' && globalThis.mockIo && globalThis.mockIo.sockets && globalThis.mockIo.sockets.sockets) {
        socket = globalThis.mockIo.sockets.sockets[socketId];
    }
    if (!socket) throw new Error(`Socket ${socketId} not found`);
    const handler = socket.eventHandlers[action];
    if (!handler) throw new Error(`No handler for ${action}`);
    return handler(data);
}
