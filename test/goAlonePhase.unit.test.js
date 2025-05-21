import {  handleGoAloneDecision  } from '../src/game/phases/goAlonePhase.js';
import {  GAME_PHASES  } from '../src/config/constants.js';
import assert from "assert";

describe('Go Alone Phase', function() {
    let gameState;
    
    beforeEach(() => {
        // Setup a basic game state for testing
        gameState = {
            playerOrder: ['north', 'east', 'south', 'west'],
            dealer: 'south',
            currentPlayer: 'east', // Player who called trump
            currentPhase: GAME_PHASES.AWAITING_GO_ALONE,
            trumpSuit: 'hearts',
            makerTeam: 'east+west',
            playerWhoCalledTrump: 'east',
            players: {
                north: { hand: [] },
                east: { hand: [] },
                south: { hand: [] },
                west: { hand: [] }
            },
            messages: []
        };
    });

    describe('handleGoAloneDecision', function() {
        it('should handle player choosing to go alone', function() {
            const result = handleGoAloneDecision(gameState, 'east', true);
            
            // Should set going alone flags
            assert.strictEqual(result.goingAlone, true);
            assert.strictEqual(result.playerGoingAlone, 'east');
            assert.strictEqual(result.partnerSittingOut, 'west');
            
            // Should update game phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.PLAYING);
            
            // Should set first player (left of dealer)
            assert.strictEqual(result.currentPlayer, 'west');
            assert.strictEqual(result.trickLeader, 'west');
            
            // Should add appropriate messages
            assert.ok(result.messages.some(m => 
                m.text.includes('east is going alone') && 
                m.text.includes('west will sit out')
            ));
            assert.ok(result.messages.some(m => 
                m.text.includes('Starting play') && 
                m.text.includes('west leads the first trick')
            ));
        });
        
        it('should handle player choosing to play with partner', function() {
            const result = handleGoAloneDecision(gameState, 'east', false);
            
            // Should set going alone flags to false
            assert.strictEqual(result.goingAlone, false);
            assert.strictEqual(result.playerGoingAlone, null);
            assert.strictEqual(result.partnerSittingOut, null);
            
            // Should update game phase
            assert.strictEqual(result.currentPhase, GAME_PHASES.PLAYING);
            
            // Should set first player (left of dealer)
            assert.strictEqual(result.currentPlayer, 'west');
            assert.strictEqual(result.trickLeader, 'west');
            
            // Should add appropriate messages
            assert.ok(result.messages.some(m => 
                m.text.includes('east will play with their partner')
            ));
        });
        
        it('should throw error if not the right phase', function() {
            gameState.currentPhase = GAME_PHASES.PLAYING;
            
            assert.throws(
                () => handleGoAloneDecision(gameState, 'east', true),
                /Invalid go alone attempt/
            );
        });
        
        it('should throw error if not the current player', function() {
            assert.throws(
                () => handleGoAloneDecision(gameState, 'north', true),
                /Invalid go alone attempt/
            );
        });
    });
});
