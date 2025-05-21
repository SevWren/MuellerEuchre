/**
 * @file Playing phase module for Euchre game
 * @module game/phases/playing
 * @description Handles all in-game card playing logic including trick taking and turn management
 */

import { log } from '../../utils/logger.js';
import { GAME_PHASES, DEBUG_LEVELS } from '../../config/constants.js';
import { getNextPlayer, getPartner } from '../../utils/players.js';
import { cardToString, isLeftBower, isRightBower, getCardRank } from '../../utils/deck.js';

/**
 * Starts a new hand by dealing cards and setting up initial game state
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state with new hand
 */
export function startNewHand(gameState) {
    log(DEBUG_LEVELS.INFO, '[startNewHand] Starting new hand');
    
    // Create a fresh copy of the game state
    const updatedState = { ...gameState };
    
    // Reset hand-specific state
    updatedState.currentTrick = [];
    updatedState.tricks = [];
    updatedState.ledSuit = null;
    updatedState.currentPlayer = getNextPlayer(
        updatedState.dealer,
        updatedState.playerOrder,
        updatedState.goingAlone,
        updatedState.playerGoingAlone,
        updatedState.partnerSittingOut
    );
    
    // Deal cards (simplified - actual dealing would be more complex)
    updatedState.players = updatedState.playerOrder.reduce((players, playerRole) => {
        players[playerRole] = {
            ...players[playerRole],
            hand: [], // This would be populated with actual cards
            tricksWon: 0
        };
        return players;
    }, { ...updatedState.players });
    
    // Set up the up card (for the first round of bidding)
    updatedState.upCard = null; // This would be set from the deck
    updatedState.currentPhase = GAME_PHASES.BIDDING;
    
    // Add game message
    updatedState.messages = [{
        type: 'game',
        text: `New hand! Dealer is ${updatedState.dealer}.`
    }];
    
    return updatedState;
}

/**
 * Handles a player playing a card
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player playing the card
 * @param {Object} card - The card being played
 * @returns {Object} Updated game state
 */
export function handlePlayCard(gameState, playerRole, card) {
    log(DEBUG_LEVELS.INFO, `[handlePlayCard] Player ${playerRole} plays ${cardToString(card)}`);
    
    if (gameState.currentPhase !== GAME_PHASES.PLAYING) {
        throw new Error('Not in playing phase');
    }
    
    if (playerRole !== gameState.currentPlayer) {
        throw new Error(`It's not ${playerRole}'s turn`);
    }
    
    const updatedState = { ...gameState };
    const player = updatedState.players[playerRole];
    
    // Find and remove the card from player's hand
    const cardIndex = player.hand.findIndex(c => 
        c.rank === card.rank && c.suit === card.suit
    );
    
    if (cardIndex === -1) {
        throw new Error(`Player ${playerRole} does not have ${cardToString(card)}`);
    }
    
    // Remove card from hand and add to current trick
    const [playedCard] = player.hand.splice(cardIndex, 1);
    
    // If this is the first card in the trick, set the led suit
    if (updatedState.currentTrick.length === 0) {
        updatedState.ledSuit = playedCard.suit;
        updatedState.messages.push({
            type: 'game',
            text: `${playerRole} leads with ${cardToString(playedCard)}`
        });
    } else {
        updatedState.messages.push({
            type: 'game',
            text: `${playerRole} plays ${cardToString(playedCard)}`
        });
    }
    
    // Add card to current trick
    updatedState.currentTrick.push({
        player: playerRole,
        card: playedCard
    });
    
    // Check if trick is complete
    const trickComplete = updatedState.currentTrick.length === (
        updatedState.goingAlone ? 3 : 4
    );
    
    if (trickComplete) {
        // Determine the winner of the trick
        const trickWinner = determineTrickWinner(
            updatedState.currentTrick,
            updatedState.ledSuit,
            updatedState.trumpSuit
        );
        
        // Update trick count for the winning player
        updatedState.players[trickWinner].tricksWon++;
        updatedState.tricks.push({
            cards: [...updatedState.currentTrick],
            winner: trickWinner
        });
        
        updatedState.messages.push({
            type: 'game',
            text: `${trickWinner} wins the trick!`
        });
        
        // Check if hand is complete
        const handComplete = Object.values(updatedState.players)
            .some(p => p.hand.length === 0);
            
        if (handComplete) {
            updatedState.currentPhase = GAME_PHASES.SCORING;
            updatedState.messages.push({
                type: 'game',
                text: 'Hand complete! Moving to scoring...'
            });
            // Note: The scoring phase would be handled separately
        } else {
            // Start new trick with the winner leading
            updatedState.currentTrick = [];
            updatedState.ledSuit = null;
            updatedState.currentPlayer = trickWinner;
        }
    } else {
        // Move to next player
        updatedState.currentPlayer = getNextPlayer(
            playerRole,
            updatedState.playerOrder,
            updatedState.goingAlone,
            updatedState.playerGoingAlone,
            updatedState.partnerSittingOut
        );
    }
    
    return updatedState;
}

/**
 * Determines the winner of a trick
 * @private
 * @param {Array} trick - Array of {player, card} objects in the trick
 * @param {string} ledSuit - The suit that was led in the trick
 * @param {string} trumpSuit - The current trump suit
 * @returns {string} The role of the winning player
 */
function determineTrickWinner(trick, ledSuit, trumpSuit) {
    if (!trick.length) return null;
    
    // Sort cards by rank, considering trump and led suit
    const rankedTrick = trick.map(({ player, card }) => ({
        player,
        card,
        rank: getCardRank(card, ledSuit, trumpSuit)
    })).sort((a, b) => b.rank - a.rank);
    
    // The first card in the sorted array is the winner
    return rankedTrick[0].player;
}

