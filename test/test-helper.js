// Import chai and configure it
export { expect } from 'chai';
import chai from 'chai';
import sinonChai from 'sinon-chai';

// Enable should-style assertions
chai.should();
chai.use(sinonChai);

// Global test setup
global.expect = chai.expect;
global.assert = chai.assert;

// Add any global test utilities here
export const createTestGameState = () => ({
  // Add common test game state here
  players: {},
  currentPhase: 'LOBBY',
  // Add other default game state properties
});
