/**
 * @file Bidding phase module for Euchre game
 * @module game/phases/bidding
 * @description Handles all bidding-related game logic including ordering up, dealer discard, and trump calling
 */

import { log } from '../../utils/logger.js';
import { GAME_PHASES, SUITS, DEBUG_LEVELS } from '../../config/constants.js';
import { getNextPlayer, getPartner } from '../../utils/players.js';
import { cardToString } from '../../utils/deck.js';
import { handleGoAloneDecision as goAlonePhaseDecision } from './goAlonePhase.js';

/**
 * Handles a player's decision to order up the dealer
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player making the decision
 * @param {boolean} orderedUp - Whether the player ordered up the dealer
 * @returns {Object} Updated game state
 */
export function handleOrderUpDecision(gameState, playerRole, orderedUp) {
    log(DEBUG_LEVELS.INFO, `[handleOrderUpDecision] Player ${playerRole} ${orderedUp ? 'ordered up' : 'passed'}`);
    
    const updatedState = { ...gameState };
    const currentPlayerIndex = updatedState.playerOrder.findIndex(p => p === playerRole);
    const nextPlayerRole = getNextPlayer(
        playerRole,
        updatedState.playerOrder,
        updatedState.goingAlone,
        updatedState.playerGoingAlone,
        updatedState.partnerSittingOut
    );

    updatedState.messages.push({
        type: 'bidding',
        player: playerRole,
        action: orderedUp ? 'ordered_up' : 'passed',
        card: updatedState.upCard
    });

    if (orderedUp) {
        // Player ordered up the dealer
        updatedState.trumpSuit = updatedState.upCard.suit;
        updatedState.dealerCalledTrump = true;
        updatedState.currentPhase = GAME_PHASES.DEALER_DISCARD;
        updatedState.currentPlayer = updatedState.dealer;
        
        // Add message that dealer must discard a card
        updatedState.messages.push({
            type: 'game',
            text: `Dealer (${updatedState.dealer}) must discard a card`
        });
    } else if (nextPlayerRole === updatedState.dealer) {
        // All players passed in first round
        updatedState.currentPhase = GAME_PHASES.CALL_TRUMP;
        updatedState.currentPlayer = getNextPlayer(
            updatedState.dealer,
            updatedState.playerOrder,
            updatedState.goingAlone,
            updatedState.playerGoingAlone,
            updatedState.partnerSittingOut
        );
        
        // Add message about moving to second round of bidding
        updatedState.messages.push({
            type: 'game',
            text: 'All players passed. Starting second round of bidding.'
        });
    } else {
        // Move to next player
        updatedState.currentPlayer = nextPlayerRole;
    }

    return updatedState;
}

/**
 * Handles the dealer discarding a card after being ordered up
 * @param {Object} gameState - Current game state
 * @param {string} dealerRole - Role of the dealer
 * @param {Object} cardToDiscard - Card to be discarded
 * @returns {Object} Updated game state
 */
export function handleDealerDiscard(gameState, dealerRole, cardToDiscard) {
    log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Dealer ${dealerRole} discarding ${cardToString(cardToDiscard)}`);
    
    if (gameState.currentPhase !== GAME_PHASES.DEALER_DISCARD) {
        throw new Error('Not in dealer discard phase');
    }
    
    if (dealerRole !== gameState.dealer) {
        throw new Error('Only the dealer can discard at this time');
    }
    
    const updatedState = { ...gameState };
    const dealerPlayer = updatedState.players[dealerRole];
    
    // Find and remove the card from dealer's hand
    const cardIndex = dealerPlayer.hand.findIndex(card => 
        card.rank === cardToDiscard.rank && card.suit === cardToDiscard.suit
    );
    
    if (cardIndex === -1) {
        throw new Error('Dealer does not have the specified card');
    }
    
    // Remove the card from dealer's hand and add the up card
    dealerPlayer.hand.splice(cardIndex, 1);
    dealerPlayer.hand.push(updatedState.upCard);
    
    // Update game state
    updatedState.discardPile.push(cardToDiscard);
    updatedState.currentPhase = GAME_PHASES.GO_ALONE;
    updatedState.currentPlayer = gameState.playerOrder[0]; // Start with first player for go alone decision
    updatedState.messages.push({
        type: 'game',
        text: `Dealer (${dealerRole}) picked up the ${cardToString(updatedState.upCard)} and discarded ${cardToString(cardToDiscard)}`
    });
    
    return updatedState;
}

/**
 * Handles a player's decision to call trump in the second round
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player making the decision
 * @param {string|null} suitToCall - Suit being called as trump, or null to pass
 * @returns {Object} Updated game state
 */
export function handleCallTrumpDecision(gameState, playerRole, suitToCall) {
    log(DEBUG_LEVELS.INFO, `[handleCallTrumpDecision] Player ${playerRole} ${suitToCall ? `called ${suitToCall}` : 'passed'}`);
    
    if (gameState.currentPhase !== GAME_PHASES.CALL_TRUMP) {
        throw new Error('Not in call trump phase');
    }
    
    const updatedState = { ...gameState };
    const nextPlayerRole = getNextPlayer(
        playerRole,
        updatedState.playerOrder,
        updatedState.goingAlone,
        updatedState.playerGoingAlone,
        updatedState.partnerSittingOut
    );
    
    if (suitToCall) {
        // Player called trump
        if (!SUITS.includes(suitToCall)) {
            throw new Error(`Invalid suit: ${suitToCall}`);
        }
        
        if (suitToCall === updatedState.upCard.suit) {
            throw new Error('Cannot call the same suit as the up card in second round');
        }
        
        updatedState.trumpSuit = suitToCall;
        updatedState.messages.push({
            type: 'bidding',
            player: playerRole,
            action: 'called_trump',
            suit: suitToCall
        });
        
        // Move to go alone phase
        updatedState.currentPhase = GAME_PHASES.GO_ALONE;
        updatedState.currentPlayer = playerRole; // Current player decides on going alone
    } else {
        // Player passed
        updatedState.messages.push({
            type: 'bidding',
            player: playerRole,
            action: 'passed'
        });
        
        if (nextPlayerRole === updatedState.dealer) {
            // Dealer must call a suit or redeal
            updatedState.currentPhase = GAME_PHASES.DEALER_MUST_CALL;
            updatedState.currentPlayer = updatedState.dealer;
            updatedState.messages.push({
                type: 'game',
                text: 'All players passed. Dealer must call a suit.'
            });
        } else {
            // Move to next player
            updatedState.currentPlayer = nextPlayerRole;
        }
    }
    
    return updatedState;
}

/**
 * Handles a player's decision to go alone
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player making the decision
 * @param {boolean} goAlone - Whether the player wants to go alone
 * @returns {Object} Updated game state
 */
export function handleGoAloneDecision(gameState, playerRole, goAlone) {
    return goAlonePhaseDecision(gameState, playerRole, goAlone);
}

