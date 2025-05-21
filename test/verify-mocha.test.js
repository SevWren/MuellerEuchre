import { expect } from 'chai';
import { createTestGameState } from './test-helper.js';

describe('Mocha Test Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).to.equal(2);
  });

  it('should have test helper functions available', () => {
    const state = createTestGameState();
    expect(state).to.be.an('object');
    expect(state.players).to.be.an('object');
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve('success');
    expect(result).to.equal('success');
  });
});
