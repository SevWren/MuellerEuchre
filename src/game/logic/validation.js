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
    
    // Check if the led card is the left bower (which counts as trump)
    const isLedCardLeftBower = isLeftBower(ledPlay.card, gameState.trumpSuit);
    
    // If the led card is the left bower or the led suit is trump, the effective suit is trump
    const effectiveLedSuit = (isLedCardLeftBower || ledSuit === gameState.trumpSuit) ? gameState.trumpSuit : ledSuit;
    
    // Check if player has any cards of the led suit (including left bower as trump)
    const playerHasLedSuit = player.hand.some(card => {
        // If the effective led suit is trump, left bower counts as trump
        if (effectiveLedSuit === gameState.trumpSuit) {
            return card.suit === gameState.trumpSuit || isLeftBower(card, gameState.trumpSuit);
        }
        // Normal case: check if card matches the led suit
        return card.suit === effectiveLedSuit && !isLeftBower(card, gameState.trumpSuit);
    });

    // If player has no cards of the led suit, any card is valid
    if (!playerHasLedSuit) {
        return { isValid: true, message: 'Valid play (no cards of led suit)' };
    }
    
    // Check if the played card is the left bower and the led suit is trump
    if (isLeftBower(cardToPlay, gameState.trumpSuit) && ledSuit === gameState.trumpSuit) {
        return { isValid: true, message: 'Valid play (left bower as trump)' };
    }
    
    // Check if the played card matches the led suit
    const isPlayingLedSuit = cardToPlay.suit === effectiveLedSuit;
    
    // If the led suit is not trump, check if the card is not a left bower
    if (ledSuit !== gameState.trumpSuit && isLeftBower(cardToPlay, gameState.trumpSuit)) {
        return { 
            isValid: false, 
            message: `Must follow suit (${effectiveLedSuit})` 
        };
    }
    
    if (!isPlayingLedSuit) {
        return { 
            isValid: false, 
            message: `Must follow suit (${effectiveLedSuit})` 
        };
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
