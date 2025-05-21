import { GAME_PHASES } from '../../config/constants.js';
import { log } from '../../utils/logger.js';
import { getNextPlayer } from '../../utils/players.js';

/**
 * Handles a player's decision to go alone or not
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player making the decision
 * @param {boolean} goAlone - Whether the player wants to go alone
 * @returns {Object} Updated game state
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
 * Helper function to get a player's partner
 * @private
 * @param {string} playerRole - The player's role (north, east, south, west)
 * @returns {string} The partner's role
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
