/**
 * @file test-helper.js - Global test helper functions
 * @module testHelper
 * @description Provides global test helper functions for loading and
 *              configuring test environments, including setting up and
 *              tearing down test servers and clients.
 *
 * @requires chai
 * @requires sinon-chai
 */

// Import chai and configure it
import * as chai from 'chai';
import sinonChai from 'sinon-chai';

// Initialize chai
const { expect, assert } = chai;

// Enable should-style assertions
chai.should();
chai.use(sinonChai);

// Set globals for test environment
globalThis.expect = expect;
globalThis.assert = assert;

// Add any global test utilities here
const createTestGameState = () => ({
  players: {},
  currentPhase: 'LOBBY',
  // Add other default game state properties as needed
});

// Export utilities
export { expect, assert, createTestGameState };