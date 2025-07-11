/**
 * @file testUtils.js - Test utility functions for Euchre game testing
 * @module TestUtils
 * @description Provides reusable test utilities and mocks for Euchre game tests using node:test.
 * @requires node:test
 */

import { mock } from 'node:test';

/**
 * Creates a mock implementation of a safe storage interface.
 * @returns {Object} Mock storage object with stubbed methods.
 * @property {Function} getItem - Mocked getter method.
 * @property {Function} setItem - Mocked setter method.
 * @property {Function} removeItem - Mocked remove method.
 */
export const createMockSafeStorage = () => ({
  getItem: mock.fn(),
  setItem: mock.fn(),
  removeItem: mock.fn(),
});

/**
 * Creates a mock socket service with mocked methods for testing socket.io functionality.
 * @returns {Object} Mock socket service with the following properties and methods:
 * @property {Function} mockEmit - Mock for the emit method.
 * @property {Function} mockOn - Mock for the on method.
 * @property {Function} mockOff - Mock for the off method.
 * @property {Function} mockDisconnect - Mock for the disconnect method.
 * @property {Function} mockConnect - Mock for the connect method.
 * @property {Object} eventHandlers - Object storing registered event handlers.
 * @property {Function} on - Method to register event handlers.
 * @property {Function} off - Method to unregister event handlers.
 * @property {Function} emit - Alias for mockEmit.
 * @property {Function} disconnect - Alias for mockDisconnect.
 * @property {Function} connect - Alias for mockConnect.
 * @property {Function} isConnected - Getter for connection status.
 */
export const createMockSocketService = () => {
  // Create mock functions for all socket.io methods we want to track.
  const mockEmit = mock.fn(() => Promise.resolve({})); // Replaces sinon.stub().resolves({})
  const mockOn = mock.fn();
  const mockOff = mock.fn();
  const mockDisconnect = mock.fn();
  const mockConnect = mock.fn();

  // Internal state
  let isConnected = true; // Tracks connection state
  const eventHandlers = {}; // Stores registered event handlers

  return {
    // Expose the mocks for test assertions
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

    // on: Registers an event handler and returns an object with an off method.
    on: (event, handler) => {
      eventHandlers[event] = handler; // Store the handler
      return {
        off: () => delete eventHandlers[event], // Return cleanup function
      };
    },

    // off: Removes all handlers for a specific event.
    off: (event) => {
      if (eventHandlers[event]) {
        delete eventHandlers[event];
      }
    },

    // Alias mock methods to match socket.io client interface
    emit: mockEmit,
    disconnect: mockDisconnect,
    connect: mockConnect,

    // Method to check connection status (duplicate of getter for API compatibility).
    isConnected: () => isConnected,
  };
};

/**
 * Creates a basic test game state with sensible defaults that can be overridden.
 * @param {Object} [overrides={}] - Optional object containing properties to override in the default state.
 * @returns {Object} A game state object.
 */
export const createTestState = (overrides = {}) => ({
  gameId: 'test-game',
  gamePhase: 'LOBBY',
  players: {
    player1: { id: 'player1', name: 'Player 1', ready: false },
    player2: { id: 'player2', name: 'Player 2', ready: false },
  },
  ...overrides,
});