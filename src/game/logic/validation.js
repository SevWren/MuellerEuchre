/**
 * @file Validation module for Euchre game
 * @module game/logic/validation
 * @description Handles validation of game moves and state transitions
 */

import { log } from '../../utils/logger.js';
import { GAME_PHASES, DEBUG_LEVELS } from '../../config/constants.js';
import { cardToString, isLeftBower, isRightBower } from '../../utils/deck.js';

/**
 * Validates if a card play is legal according to Euchre rules
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player making the move
 * @param {Object} cardToPlay - The card being played
 * @returns {{isValid: boolean, message: string}} Validation result and message
 */
export function isValidPlay(gameState, playerRole, cardToPlay) {
    log(DEBUG_LEVELS.VERBOSE, `[isValidPlay] Validating play: ${playerRole} playing ${cardToString(cardToPlay)}`);
    
    // Check if it's the player's turn
    if (gameState.currentPlayer !== playerRole) {
        return { 
            isValid: false, 
            message: `It's not ${playerRole}'s turn` 
        };
    }

    // Check if the game is in the playing phase
    if (gameState.currentPhase !== GAME_PHASES.PLAYING) {
        return { 
            isValid: false, 
            message: 'Cards can only be played during the playing phase' 
        };
    }

    const player = gameState.players[playerRole];
    
    // Check if player has the card in their hand
    const cardInHand = player.hand.some(card => 
        card.rank === cardToPlay.rank && card.suit === cardToPlay.suit
    );
    
    if (!cardInHand) {
        return { 
            isValid: false, 
            message: `Player ${playerRole} does not have ${cardToString(cardToPlay)}` 
        };
    }

    // If this is the first card in the trick, any card is valid
    if (gameState.currentTrick.length === 0) {
        return { 
            isValid: true, 
            message: 'Valid lead' 
        };
    }

    // Determine the effective suit of the led card
    const ledPlay = gameState.currentTrick[0];
    let ledSuit = ledPlay.card.suit;
    
    // If the led card is the left bower, the effective suit is trump
    if (isLeftBower(ledPlay.card, gameState.trumpSuit)) {
        ledSuit = gameState.trumpSuit;
    }

    // Check if player has any cards of the led suit (including left bower)
    const playerHasLedSuit = player.hand.some(card => {
        if (isLeftBower(card, gameState.trumpSuit)) {
            return ledSuit === gameState.trumpSuit;
        }
        return card.suit === ledSuit;
    });

    // If player has cards of the led suit, they must play one
    if (playerHasLedSuit) {
        const isPlayingLedSuit = (cardToPlay.suit === ledSuit && 
                               !isLeftBower(cardToPlay, gameState.trumpSuit)) ||
                              (isLeftBower(cardToPlay, gameState.trumpSuit) && 
                               ledSuit === gameState.trumpSuit);
        
        if (!isPlayingLedSuit) {
            return { 
                isValid: false, 
                message: `Must follow suit (${ledSuit})` 
            };
        }
    }

    // If we get here, the play is valid
    return { 
        isValid: true, 
        message: 'Valid play' 
    };
}

// Maintain backward compatibility with existing code
export function serverIsValidPlay(playerRole, cardToPlay, gameState) {
    if (!gameState) {
        throw new Error('gameState is required as the third parameter');
    }
    
    const result = isValidPlay(gameState, playerRole, cardToPlay);
    return result.isValid;
}
