// Import chai and configure it
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
const { expect } = chai;

// Enable should-style assertions
chai.should();
chai.use(sinonChai);

// Global test setup
global.expect = expect;
global.assert = chai.assert;

// Add any global test utilities here
const createTestGameState = () => ({
  // Add common test game state here
  players: {},
  currentPhase: 'LOBBY',
  // Add other default game state properties
});

// Export utilities
export { createTestGameState };

global.expect = expect;
global.assert = chai.assert;
chai.should();
