/**
 * @file testUtils.js - Test utility functions for Euchre game testing
 * @module TestUtils
 * @description Provides reusable test utilities and mocks for Euchre game tests
 * @requires sinon
 */

import sinon from "sinon";

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
  removeItem: sinon.stub(),
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
  // Create Sinon stubs for all socket.io methods we want to mock
  // Each stub can be spied on in tests to verify calls
  const mockEmit = sinon.stub().resolves({}); // Stub for emit that always resolves
  const mockOn = sinon.stub(); // Stub for event subscription
  const mockOff = sinon.stub(); // Stub for event unsubscription
  const mockDisconnect = sinon.stub(); // Stub for disconnect method
  const mockConnect = sinon.stub(); // Stub for connect method

  // Internal state
  let isConnected = true; // Tracks connection state
  const eventHandlers = {}; // Stores registered event handlers

  return {
    // Expose the stubs for test assertions
    mockEmit, // Access to verify emit calls in tests
    mockOn, // Access to verify event subscriptions
    mockOff, // Access to verify event unsubscriptions
    mockDisconnect, // Access to verify disconnect calls
    mockConnect, // Access to verify connect calls
    eventHandlers, // Direct access to registered handlers for verification

    // Getter/setter for connection state
    get isConnected() {
      return isConnected;
    },
    set isConnected(value) {
      isConnected = value;
    },

    // on: Registers an event handler and returns an object with an off method
    // @param {string} event - The event name to listen for
    // @param {Function} handler - The callback function to execute when event is emitted
    // @returns {Object} Object with an off method to remove this handler
    on: (event, handler) => {
      eventHandlers[event] = handler; // Store the handler
      return {
        off: () => delete eventHandlers[event], // Return cleanup function
      };
    },

    // off: Removes all handlers for a specific event
    // @param {string} event - The event name to remove handlers for
    off: (event) => {
      if (eventHandlers[event]) {
        delete eventHandlers[event];
      }
    },

    // Alias mock methods to match socket.io client interface
    emit: mockEmit, // Forward emit calls to mockEmit stub
    disconnect: mockDisconnect, // Forward disconnect calls to mockDisconnect
    connect: mockConnect, // Forward connect calls to mockConnect

    // Method to check connection status (duplicate of getter for API compatibility)
    isConnected: () => isConnected,
  };
};

/**
 * Creates a basic test game state with sensible defaults that can be overridden
 * @param {Object} [overrides={}] - Optional object containing properties to override in the default state
 * @returns {Object} A game state object with the following default structure:
 * @property {string} gameId - Default: 'test-game'
 * @property {string} gamePhase - Default: 'LOBBY'
 * @property {Object} players - Object containing player objects with id, name, and ready status
 * @property {Object} ...overrides - Any additional properties provided in the overrides parameter
 */
export const createTestState = (overrides = {}) => ({
  gameId: "test-game",
  gamePhase: "LOBBY",
  players: {
    player1: { id: "player1", name: "Player 1", ready: false },
    player2: { id: "player2", name: "Player 2", ready: false },
  },
  ...overrides,
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
  Object.values(mocks).forEach((mock) => {
    if (mock && typeof mock.reset === "function") {
      mock.reset();
    } else if (mock && typeof mock.resetHistory === "function") {
      mock.resetHistory();
    }
  });
};
