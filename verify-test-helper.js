// Test the test-helper.js functionality
import { expect } from 'chai';
import { createTestGameState } from './test/test-helper.js';

console.log('=== Verifying Test Helper ===');

try {
  // Test chai expect
  expect(true).to.be.true;
  console.log('✅ Chai expect is working');
  
  // Test test helper function
  const testState = createTestGameState();
  expect(testState).to.be.an('object');
  expect(testState.players).to.be.an('object');
  expect(testState.currentPhase).to.equal('LOBBY');
  console.log('✅ createTestGameState is working');
  
  console.log('\n✅ Test Helper verification passed!');
} catch (error) {
  console.error('❌ Test Helper verification failed:', error);
  process.exit(1);
}
