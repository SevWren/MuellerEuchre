/**
 * @file server3.goAlone.unit.test.js - Unit tests for the Server3 GoAlone module
 * @module Server3GoAloneUnitTest
 * @description Unit tests for the Server3 GoAlone module
 * @requires chai
 * @requires ../../server3.mjs
 */

import assert from "assert";
import sinon from "sinon";
import { createTestServer } from './test-utils.js';

describe('Go Alone Functionality', function() {
    let server, gameState, mockIo;

    beforeEach(() => {
        // Use standardized test server creation
        ({ server, gameState, mockIo } = createTestServer());
        
        // Setup specific test state
        gameState.gamePhase = 'AWAITING_GO_ALONE';
        gameState.trump = 'spades';
        gameState.maker = 1;
        gameState.playerWhoCalledTrump = 'south';
        gameState.currentPlayer = 'south';
    });

    describe('handleGoAloneDecision', function() {
        it('should handle player choosing to go alone', function() {
            const playerRole = 'south';
            const partnerRole = getPartner(playerRole); // 'north'
            
            // Player chooses to go alone
            handleGoAloneDecision(playerRole, true);
            
            // Verify game state
            assert.strictEqual(gameState.goingAlone, true);
            assert.strictEqual(gameState.playerGoingAlone, playerRole);
            assert.strictEqual(gameState.partnerSittingOut, partnerRole);
            assert.strictEqual(gameState.gamePhase, 'PLAYING_TRICKS');
            
            // Verify the trick leader is set correctly (next player after dealer, skipping partner if needed)
            assert(['west', 'east'].includes(gameState.trickLeader));
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/GOING ALONE/)));
            assert(logStub.calledWith(sinon.match(/sits out/)));
        });

        it('should handle player choosing not to go alone', function() {
            const playerRole = 'south';
            
            // Player chooses not to go alone
            handleGoAloneDecision(playerRole, false);
            
            // Verify game state
            assert.strictEqual(gameState.goingAlone, false);
            assert.strictEqual(gameState.playerGoingAlone, null);
            assert.strictEqual(gameState.partnerSittingOut, null);
            assert.strictEqual(gameState.gamePhase, 'PLAYING_TRICKS');
            
            // Verify the trick leader is set correctly (next player after dealer)
            assert.strictEqual(gameState.trickLeader, 'west');
            
            // Verify game message was added
            assert(logStub.calledWith(sinon.match(/play with their partner/)));
        });

        it('should prevent going alone when not in the correct phase', function() {
            // Change to a different phase
            gameState.gamePhase = 'PLAYING_TRICKS';
            
            // Try to go alone
            handleGoAloneDecision('south', true);
            
            // Verify no changes were made
            assert.strictEqual(gameState.goingAlone, false);
            assert(logStub.calledWith(sinon.match(/Invalid go alone decision/)));
        });

        it('should prevent going alone when not the player who called trump', function() {
            // Current player is 'south' (who called trump)
            
            // Try to go alone as a different player
            handleGoAloneDecision('west', true);
            
            // Verify no changes were made
            assert.strictEqual(gameState.goingAlone, false);
            assert(logStub.calledWith(sinon.match(/Invalid go alone decision/)));
        });

        it('should handle going alone with partner as trick leader', function() {
            // Set up so that the partner would be the trick leader
            gameState.dealer = 'east'; // Dealer is east
            // Next player after dealer is south (who called trump)
            // Then north (partner) would be next, but they sit out
            // So west should be trick leader
            
            // Player chooses to go alone
            handleGoAloneDecision('south', true);
            
            // Verify the trick leader is west (skipping north who is sitting out)
            assert.strictEqual(gameState.trickLeader, 'west');
            assert.strictEqual(gameState.currentPlayer, 'west'); // Fix: Ensure currentPlayer is updated
        });
    });
});
