import assert from "assert";
import { expect } from 'chai';
import { createTestServer } from '../test-utils.js';

describe('Card Play Validation', function() {
    let server, gameState;
    
    beforeEach(() => {
        ({ server, gameState } = createTestServer());
        
        gameState.gamePhase = 'PLAYING_TRICKS';
        gameState.currentPlayer = 'south';
        gameState.trump = 'hearts';
        gameState.players.south.hand = [
            { id: 'JH', suit: 'hearts', value: 'J' },
            { id: '9H', suit: 'hearts', value: '9' },
            { id: 'AS', suit: 'spades', value: 'A' }
        ];
    });

    it('should validate card is in player\'s hand', function() {
        assert.throws(
            () => server.handlePlayCard('south', { id: 'invalid-card' }),
            /Card not in hand/
        );
    });

    it('should enforce suit following rules', function() {
        gameState.currentTrickSuit = 'spades';
        
        assert.throws(
            () => server.handlePlayCard('south', { id: '9H' }),
            /Must follow suit/
        );
        
        assert.doesNotThrow(
            () => server.handlePlayCard('south', { id: 'AS' })
        );
    });

    it('should allow playing any card when cannot follow suit', function() {
        gameState.currentTrickSuit = 'diamonds';
        
        assert.doesNotThrow(
            () => server.handlePlayCard('south', { id: 'JH' })
        );
    });
});
