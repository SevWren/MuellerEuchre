/**
 * @module game/phases/goAlonePhase
 * @description Handles the "Go Alone" phase in Euchre, where a player can choose to play
 * without their partner's help for a chance to score additional points.
 * 
 * @requires module:config/constants
 * @requires module:utils/logger
 * @requires module:utils/players
 */

import { GAME_PHASES } from '../../config/constants.js';
import { log } from '../../utils/logger.js';
import { getNextPlayer } from '../../utils/players.js';

/**
 * Handles a player's decision to go alone or play with their partner.
 * This function updates the game state based on the player's choice and transitions
 * the game to the playing phase.
 *
 * @param {Object} gameState - The current game state object
 * @param {string} playerRole - The role of the player making the decision (north, east, south, west)
 * @param {boolean} goAlone - True if the player wants to go alone, false to play with partner
 * @returns {Object} A new game state object with updated properties
 * @throws {Error} If the action is not valid in the current game state
 * 
 * @example
 * // When a player chooses to go alone
 * const newState = handleGoAloneDecision(gameState, 'east', true);
 * 
 * @example
 * // When a player chooses to play with their partner
 * const newState = handleGoAloneDecision(gameState, 'east', false);
 */
export function handleGoAloneDecision(gameState, playerRole, goAlone) {
    log(1, `[handleGoAloneDecision] ${playerRole} ${goAlone ? 'is going alone' : 'will play with partner'}`);
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Validate the action
    if (updatedState.currentPhase !== GAME_PHASES.AWAITING_GO_ALONE || 
        playerRole !== updatedState.currentPlayer) {
        log(2, `[handleGoAloneDecision] Invalid go alone attempt by ${playerRole}`);
        throw new Error('Invalid go alone attempt');
    }
    
    // Add game message
    updatedState.messages = updatedState.messages || [];
    
    if (goAlone) {
        // Player is going alone
        updatedState.goingAlone = true;
        updatedState.playerGoingAlone = playerRole;
        
        // Set partner to sit out
        const partner = getPartner(playerRole);
        updatedState.partnerSittingOut = partner;
        
        updatedState.messages.push({
            type: 'game',
            text: `${playerRole} is going alone! ${partner} will sit out this hand.`,
            important: true
        });
    } else {
        // Playing with partner
        updatedState.goingAlone = false;
        updatedState.playerGoingAlone = null;
        updatedState.partnerSittingOut = null;
        
        updatedState.messages.push({
            type: 'game',
            text: `${playerRole} will play with their partner.`
        });
    }
    
    // Move to the playing phase
    updatedState.currentPhase = GAME_PHASES.PLAYING;
    
    // Set the first player (left of dealer)
    updatedState.currentPlayer = getNextPlayer(updatedState.dealer, updatedState.playerOrder);
    updatedState.trickLeader = updatedState.currentPlayer;
    updatedState.currentTrick = [];
    
    updatedState.messages.push({
        type: 'game',
        text: `Starting play. ${updatedState.currentPlayer} leads the first trick.`
    });
    
    return updatedState;
}

/**
 * Helper function to get a player's partner based on their role.
 * In Euchre, partners are always opposite each other (north-south, east-west).
 *
 * @private
 * @param {string} playerRole - The player's role (north, east, south, or west)
 * @returns {string} The partner's role (north, east, south, or west)
 * 
 * @example
 * const partner = getPartner('north'); // returns 'south'
 * const partner2 = getPartner('east');  // returns 'west'
 */
function getPartner(playerRole) {
    const partners = {
        'north': 'south',
        'south': 'north',
        'east': 'west',
        'west': 'east'
    };
    
    return partners[playerRole] || null;
}
