/**
 * @file testUtils.js - Test utility functions for Euchre game testing
 * @module TestUtils
 * @description Provides reusable test utilities and mocks for Euchre game tests
 * @requires sinon
 */

import sinon from 'sinon';

/**
 * Creates a mock implementation of a safe storage interface
 * @returns {Object} Mock storage object with stubbed methods
 * @property {Function} getItem - Stubbed getter method
 * @property {Function} setItem - Stubbed setter method
 * @property {Function} removeItem - Stubbed remove method
 */
export const createMockSafeStorage = () => ({
    getItem: sinon.stub(),
    setItem: sinon.stub(),
    removeItem: sinon.stub()
});

/**
 * Creates a mock socket service with stubbed methods for testing socket.io functionality
 * @returns {Object} Mock socket service with the following properties and methods:
 * @property {Function} mockEmit - Stub for the emit method
 * @property {Function} mockOn - Stub for the on method
 * @property {Function} mockOff - Stub for the off method
 * @property {Function} mockDisconnect - Stub for the disconnect method
 * @property {Function} mockConnect - Stub for the connect method
 * @property {Object} eventHandlers - Object storing registered event handlers
 * @property {Function} on - Method to register event handlers
 * @property {Function} off - Method to unregister event handlers
 * @property {Function} emit - Alias for mockEmit
 * @property {Function} disconnect - Alias for mockDisconnect
 * @property {Function} connect - Alias for mockConnect
 * @property {Function} isConnected - Getter for connection status
 */
export const createMockSocketService = () => {
    const mockEmit = sinon.stub().resolves({});
    const mockOn = sinon.stub();
    const mockOff = sinon.stub();
    const mockDisconnect = sinon.stub();
    const mockConnect = sinon.stub();
    let isConnected = true;
    const eventHandlers = {};

    return {
        mockEmit,
        mockOn,
        mockOff,
        mockDisconnect,
        mockConnect,
        eventHandlers,
        get isConnected() { return isConnected; },
        set isConnected(value) { isConnected = value; },
        on: (event, handler) => {
            eventHandlers[event] = handler;
            return {
                off: () => delete eventHandlers[event]
            };
        },
        off: (event) => {
            if (eventHandlers[event]) {
                delete eventHandlers[event];
            }
        },
        emit: mockEmit,
        disconnect: mockDisconnect,
        connect: mockConnect,
        isConnected: () => isConnected
    };
};

// OBSOLETE JSDoc: The following documentation describes the createTestState function
// which is based on an old game state structure from modules that have been archived
// (e.g., src/game/state.js). The function code itself is kept for now but needs
// review/rewrite. Its JSDoc is commented out to avoid confusion.
// See info_to_reprogram_permanetly_archived_files.md for more details.
// /**
//  * Creates a basic test game state with sensible defaults that can be overridden
//  * @param {Object} [overrides={}] - Optional object containing properties to override in the default state
//  * @returns {Object} A game state object with the following default structure:
//  * @property {string} gameId - Default: 'test-game'
//  * @property {string} gamePhase - Default: 'LOBBY'
//  * @property {Object} players - Object containing player objects with id, name, and ready status
//  * @property {Object} ...overrides - Any additional properties provided in the overrides parameter
//  */
export const createTestState = (overrides = {}) => ({
    gameId: 'test-game',
    gamePhase: 'LOBBY',
    players: {
        'player1': { id: 'player1', name: 'Player 1', ready: false },
        'player2': { id: 'player2', name: 'Player 2', ready: false }
    },
    ...overrides
});

/**
 * Resets all mock functions in the provided mocks object
 * @param {Object} mocks - Object containing mock functions to reset
 * @returns {void}
 * @description
 * This function will attempt to reset all provided mocks by calling either
 * the \`reset()\` or \`resetHistory()\` method if they exist on the mock.
 * Useful for cleaning up mocks between test cases.
 */
export const resetAllMocks = (mocks) => {
    Object.values(mocks).forEach(mock => {
        if (mock && typeof mock.reset === 'function') {
            mock.reset();
        } else if (mock && typeof mock.resetHistory === 'function') {
            mock.resetHistory();
        }
    });
};
