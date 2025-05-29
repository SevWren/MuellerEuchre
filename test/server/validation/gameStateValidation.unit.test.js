import { expect, assert } from 'chai';
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

        it('should detect invalid game states', () => {
            gameState.gamePhase = 'INVALID_PHASE';
            
            assert.throws(
                () => validateGameState(gameState),
                /Invalid game phase/
            );
        });

        it('should validate player turns', () => {
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.currentPlayer = 'south';
            
            assert.throws(
                () => validateGameState({
                    ...gameState,
                    currentPlayer: 'invalid'
                }),
                /Invalid current player/
            );
        });
    });

    describe('Bid Validation', () => {
        beforeEach(() => {
            gameState.phase = 'bidding';
            gameState.currentPlayer = 'south';
            gameState.trump = null;
        });

        it('should validate legal bids', () => {
            const bid = {
                type: 'orderUp',
                player: 'south',
            };

            expect(() => validateBid(bid, gameState)).to.not.throw();
        });

        it('should reject out-of-turn bids', () => {
            const bid = {
                type: 'orderUp',
                player: 'west',
            };

            expect(() => validateBid(bid, gameState)).to.throw('Not your turn');
        });

        it('should reject invalid bid types', () => {
            const bid = {
                type: 'invalid',
                player: 'south',
            };

            expect(() => validateBid(bid, gameState)).to.throw('Invalid bid type');
        });
    });
});
