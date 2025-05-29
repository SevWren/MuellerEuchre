import { expect } from 'chai';
import { createTestServer } from '../testHelpers.js';
import { validateGameState, validateBid } from '../../../src/utils/validation.js';

describe('Game State Validation', () => {
    let gameState;

    beforeEach(() => {
        ({ gameState } = createTestServer());
    });

    describe('Basic Game State Validation', () => {
        it('should validate player count', () => {
            const testState = {
                players: { south: {}, west: {}, north: {}, east: {} },
                connectedPlayerCount: 4,
            };

            expect(() => validateGameState(testState)).to.not.throw();
        });

        // ...existing game state validation tests...
    });

    // ...existing bid validation tests...
});
