import assert from "assert";
import { expect } from 'chai';
import { createTestServer } from '../testHelpers.js';

describe('Card Play Validation', function() {
    let server, gameState;
    
    beforeEach(() => {
        ({ server, gameState } = createTestServer());
        
        // Set up a valid game state for card playing
        gameState.gamePhase = 'PLAYING_TRICKS';
        gameState.currentPlayer = 'south';
        gameState.trump = 'hearts';
        gameState.players.south.hand = [
            { id: 'JH', suit: 'hearts', value: 'J' },
            { id: '9H', suit: 'hearts', value: '9' },
            { id: 'AS', suit: 'spades', value: 'A' }
        ];
    });

    // ...existing card play validation tests...
});
