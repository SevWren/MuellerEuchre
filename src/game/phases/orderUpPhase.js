import { GAME_PHASES } from '../../config/constants.js';
import { log } from '../../utils/logger.js';
import { getNextPlayer } from '../../utils/players.js';
import { sortHand } from '../../utils/cards.js';

/**
 * Handles a player's decision to order up or pass during the first round of bidding
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player making the decision
 * @param {boolean} orderedUp - Whether the player wants to order up
 * @returns {Object} Updated game state
 */
export function handleOrderUpDecision(gameState, playerRole, orderedUp) {
    log(1, `[handleOrderUpDecision] ${playerRole} ${orderedUp ? 'ordered up' : 'passed'}`);
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Validate the action
    if (updatedState.currentPhase !== GAME_PHASES.ORDER_UP_ROUND1 || 
        playerRole !== updatedState.currentPlayer) {
        log(2, `[handleOrderUpDecision] Invalid order up attempt by ${playerRole}`);
        throw new Error('Invalid order up attempt');
    }

    // Add game message
    updatedState.messages = updatedState.messages || [];
    updatedState.messages.push({
        type: 'game',
        text: `${playerRole} ${orderedUp ? 'ordered up' : 'passed'}.`
    });

    if (orderedUp) {
        // Player ordered up - set trump and move to dealer discard phase
        updatedState.trumpSuit = updatedState.upCard.suit;
        updatedState.makerTeam = getTeamForPlayer(playerRole);
        updatedState.playerWhoCalledTrump = playerRole;
        
        updatedState.messages.push({
            type: 'game',
            text: `Trump is ${updatedState.trumpSuit}! Called by ${playerRole}.`,
            important: true
        });

        // Add the up card to the dealer's hand
        updatedState.players[updatedState.dealer].hand.push(updatedState.upCard);
        sortHand(updatedState.players[updatedState.dealer].hand);
        updatedState.upCard = null;

        // Move to dealer discard phase
        updatedState.currentPhase = GAME_PHASES.AWAITING_DEALER_DISCARD;
        updatedState.currentPlayer = updatedState.dealer;
        
        updatedState.messages.push({
            type: 'game',
            text: `${updatedState.dealer} (dealer) must discard a card.`
        });
    } else {
        // Player passed - move to next player or next round
        updatedState.currentPlayer = getNextPlayer(playerRole, updatedState.playerOrder);
        
        if (playerRole === updatedState.dealer) {
            // End of round 1 - start round 2
            updatedState.messages.push({
                type: 'game',
                text: `Up-card turned down. Starting Round 2 of bidding.`
            });
            
            updatedState.orderUpRound = 2;
            updatedState.currentPlayer = getNextPlayer(updatedState.dealer, updatedState.playerOrder);
            updatedState.currentPhase = GAME_PHASES.ORDER_UP_ROUND2;
            
            updatedState.messages.push({
                type: 'game',
                text: `${updatedState.currentPlayer}'s turn to call trump or pass.`
            });
        } else {
            // Next player's turn in round 1
            updatedState.messages.push({
                type: 'game',
                text: `${updatedState.currentPlayer}'s turn to order up or pass.`
            });
        }
    }
    
    return updatedState;
}

/**
 * Handles the dealer's card discard after ordering up
 * @param {Object} gameState - Current game state
 * @param {string} dealerRole - Role of the dealer (should match currentPlayer)
 * @param {Object} cardToDiscard - The card to discard
 * @returns {Object} Updated game state
 */
export function handleDealerDiscard(gameState, dealerRole, cardToDiscard) {
    log(1, `[handleDealerDiscard] ${dealerRole} discarding a card`);
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Validate the action
    if (updatedState.currentPhase !== GAME_PHASES.AWAITING_DEALER_DISCARD || 
        dealerRole !== updatedState.dealer || 
        dealerRole !== updatedState.currentPlayer) {
        log(2, `[handleDealerDiscard] Invalid discard attempt by ${dealerRole}`);
        throw new Error('Invalid discard attempt');
    }
    
    const hand = updatedState.players[dealerRole].hand;
    const discardIndex = hand.findIndex(c => 
        c.suit === cardToDiscard.suit && c.rank === cardToDiscard.rank
    );

    if (discardIndex === -1 || hand.length !== 6) {
        log(2, `[handleDealerDiscard] Invalid card or hand size by ${dealerRole}`);
        throw new Error('Invalid card or hand size');
    }
    
    // Remove the discarded card from hand and add to kitty
    const discarded = hand.splice(discardIndex, 1)[0];
    updatedState.kitty = updatedState.kitty || [];
    updatedState.kitty.push(discarded);
    
    // Sort the hand
    sortHand(hand);
    
    // Add game message
    updatedState.messages = updatedState.messages || [];
    updatedState.messages.push({
        type: 'game',
        text: `${dealerRole} discarded a card.`
    });
    
    // Move to go alone decision phase
    updatedState.currentPhase = GAME_PHASES.AWAITING_GO_ALONE;
    updatedState.currentPlayer = updatedState.playerWhoCalledTrump;
    
    updatedState.messages.push({
        type: 'game',
        text: `${updatedState.playerWhoCalledTrump}, do you want to go alone?`
    });
    
    return updatedState;
}

/**
 * Handles a player's decision to call trump or pass in the second round
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player making the decision
 * @param {string|null} suitToCall - The suit to call as trump, or null to pass
 * @returns {Object} Updated game state
 */
export function handleCallTrumpDecision(gameState, playerRole, suitToCall) {
    log(1, `[handleCallTrumpDecision] ${playerRole} ${suitToCall ? `called ${suitToCall}` : 'passed'}`);
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Validate the action
    if (updatedState.currentPhase !== GAME_PHASES.ORDER_UP_ROUND2 || 
        playerRole !== updatedState.currentPlayer) {
        log(2, `[handleCallTrumpDecision] Invalid call trump attempt by ${playerRole}`);
        throw new Error('Invalid call trump attempt');
    }
    
    // Add game message
    updatedState.messages = updatedState.messages || [];
    
    if (suitToCall) {
        // Prevent calling the turned-down suit
        if (suitToCall === updatedState.kitty[0].suit) {
            throw new Error('Cannot call the suit of the turned-down card');
        }
        
        // Set the trump suit and maker team
        updatedState.trumpSuit = suitToCall;
        updatedState.makerTeam = getTeamForPlayer(playerRole);
        updatedState.playerWhoCalledTrump = playerRole;
        
        updatedState.messages.push({
            type: 'game',
            text: `${playerRole} called ${suitToCall} as trump!`,
            important: true
        });
        
        // Move to go alone decision phase
        updatedState.currentPhase = GAME_PHASES.AWAITING_GO_ALONE;
        updatedState.currentPlayer = playerRole;
        
        updatedState.messages.push({
            type: 'game',
            text: `${playerRole}, do you want to go alone?`
        });
    } else {
        // Player passed - move to next player or redeal
        updatedState.currentPlayer = getNextPlayer(playerRole, updatedState.playerOrder);
        
        if (playerRole === updatedState.playerOrder[updatedState.playerOrder.length - 1]) {
            // Everyone passed - redeal
            updatedState.messages.push({
                type: 'game',
                text: 'Everyone passed. Redealing...',
                important: true
            });
            
            // Reset for a new hand (this will be implemented in the game loop)
            updatedState.currentPhase = GAME_PHASES.BETWEEN_HANDS;
        } else {
            // Next player's turn in round 2
            updatedState.messages.push({
                type: 'game',
                text: `${updatedState.currentPlayer}'s turn to call trump or pass.`
            });
        }
    }
    
    return updatedState;
}

/**
 * Helper function to get the team for a player
 * @private
 * @param {string} playerRole - The player's role (north, east, south, west)
 * @returns {string} The team name ('north+south' or 'east+west')
 */
function getTeamForPlayer(playerRole) {
    return ['north', 'south'].includes(playerRole) ? 'north+south' : 'east+west';
}
