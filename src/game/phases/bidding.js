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
 * Handles a player's decision during the first round of bidding (ordering up the dealer).
 * Updates the game state based on whether the player orders up or passes.
 * Transitions the game to `DEALER_DISCARD` if ordered up, or to `CALL_TRUMP` or the next player if passed.
 *
 * @param {object} gameState - The current game state.
 * @param {string} gameState.currentPhase - The current phase of the game.
 * @param {Array<string>} gameState.playerOrder - Order of players.
 * @param {object} gameState.upCard - The card turned up for bidding.
 * @param {string} gameState.upCard.suit - Suit of the upCard.
 * @param {string} gameState.dealer - The role of the current dealer.
 * @param {Array<object>} gameState.messages - Array of game messages.
 * @param {string} playerRole - The role of the player making the decision.
 * @param {boolean} orderedUp - True if the player orders up the dealer, false if they pass.
 * @returns {object} The updated game state object.
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
 * Handles the dealer discarding a card after being ordered up.
 * The dealer removes a card from their hand and adds the upCard.
 * Transitions the game to the `GO_ALONE` phase.
 *
 * @param {object} gameState - The current game state.
 * @param {string} gameState.currentPhase - Current phase, must be `DEALER_DISCARD`.
 * @param {string} gameState.dealer - The role of the current dealer.
 * @param {object} gameState.players - Object containing player details, including their hands.
 * @param {object} gameState.upCard - The card the dealer picked up.
 * @param {Array<object>} gameState.discardPile - Array to add the discarded card to.
 * @param {Array<string>} gameState.playerOrder - Order of players.
 * @param {Array<object>} gameState.messages - Array of game messages.
 * @param {string} dealerRole - The role of the dealer performing the discard. Must match `gameState.dealer`.
 * @param {object} cardToDiscard - The card object to be discarded by the dealer.
 * @param {string} cardToDiscard.rank - Rank of the card to discard.
 * @param {string} cardToDiscard.suit - Suit of the card to discard.
 * @returns {object} The updated game state object.
 * @throws {Error} If not in `DEALER_DISCARD` phase, if `dealerRole` is not the current dealer,
 * or if the `cardToDiscard` is not found in the dealer's hand.
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
 * Handles a player's decision during the second round of bidding (calling trump or passing).
 * Updates the game state based on the decision. If a suit is called, it becomes trump.
 * Transitions to `GO_ALONE` if trump is called, or to the next player or `DEALER_MUST_CALL` if passed.
 *
 * @param {object} gameState - The current game state.
 * @param {string} gameState.currentPhase - Current phase, must be `CALL_TRUMP`.
 * @param {Array<string>} gameState.playerOrder - Order of players.
 * @param {object} gameState.upCard - The card that was turned up in the first round.
 * @param {string} gameState.upCard.suit - Suit of the upCard.
 * @param {string} gameState.dealer - The role of the current dealer.
 * @param {Array<object>} gameState.messages - Array of game messages.
 * @param {string} playerRole - The role of the player making the decision.
 * @param {string|null} suitToCall - The suit the player chooses as trump, or `null` if the player passes.
 * Must be a valid suit from `SUITS` and cannot be the suit of the `upCard`.
 * @returns {object} The updated game state object.
 * @throws {Error} If not in `CALL_TRUMP` phase, if `suitToCall` is invalid (e.g., not in `SUITS`, or same as `upCard.suit`).
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
        if (!Object.values(SUITS).includes(suitToCall)) { // Check against actual SUITS values
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
 * Handles a player's decision on whether to "go alone".
 * This function delegates to `handleGoAloneDecision` from the `goAlonePhase.js` module.
 *
 * @param {object} gameState - The current game state.
 * @param {string} playerRole - The role of the player making the "go alone" decision (usually the maker of trump).
 * @param {boolean} goAlone - True if the player decides to go alone, false otherwise.
 * @returns {object} The updated game state object, modified by the logic in `goAlonePhase.js`.
 */
export function handleGoAloneDecision(gameState, playerRole, goAlone) {
    return goAlonePhaseDecision(gameState, playerRole, goAlone);
}

