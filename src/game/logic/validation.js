/**
 * Validation logic for Euchre game actions.
 * @module validation
 */
import { GAME_PHASES, SUITS, PLAYER_ROLES } from '../../config/constants.js';
import { isLeftBower } from '../../utils/deck.js'; // Removed isRightBower as it's not used directly here
import logger from '../../utils/logger.js';

/**
 * Determines the effective suit of a card, considering the Left Bower rule.
 * The Left Bower is considered to be of the trump suit.
 * @param {object} card - The card object { suit, value }.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {string} The effective suit of the card.
 */
function getEffectiveSuit(card, trumpSuit) {
  if (!card) return null; // Guard against null card
  if (isLeftBower(card, trumpSuit)) {
    return trumpSuit;
  }
  return card.suit;
}

/**
 * Validates if a card play is legal according to Euchre rules.
 *
 * @param {object} gameState - The current game state.
 * @param {Array<object>} playerHand - An array of card objects for the player's hand.
 * @param {object} cardToPlay - The card object the player intends to play.
 * @param {string} playerRole - The role of the player making the play.
 * @returns {{isValid: boolean, message: string}} Validation result.
 */
export function isValidPlay(gameState, playerHand, cardToPlay, playerRole) {
  if (!gameState || !playerHand || !cardToPlay || !cardToPlay.id || !playerRole) {
    logger.error({ gameStateProvided: !!gameState, playerHandProvided: !!playerHand, cardToPlayProvided: !!cardToPlay, playerRole }, 'isValidPlay: Missing or invalid arguments.');
    return { isValid: false, message: 'Internal error: Missing data for play validation.' };
  }

  if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
    return { isValid: false, message: `Cannot play card during ${gameState.gamePhase} phase.` };
  }

  if (gameState.currentPlayer !== playerRole) {
    return { isValid: false, message: `Not ${playerRole}'s turn. It is ${gameState.currentPlayer}'s turn.` };
  }

  const cardInHand = playerHand.find(c => c.id === cardToPlay.id);
  if (!cardInHand) {
    return { isValid: false, message: `Card ${cardToPlay.id} is not in ${playerRole}'s hand.` };
  }

  const { currentTrick, trumpSuit } = gameState;
  const ledCard = currentTrick && currentTrick.length > 0 ? currentTrick[0].card : null;

  if (ledCard) {
    const currentLedSuit = getEffectiveSuit(ledCard, trumpSuit);
    const cardToPlayEffectiveSuit = getEffectiveSuit(cardToPlay, trumpSuit);

    if (currentLedSuit) { // Ensure ledSuit is valid before proceeding
        const playerHasLedSuit = playerHand.some(handCard => getEffectiveSuit(handCard, trumpSuit) === currentLedSuit);
        if (playerHasLedSuit && cardToPlayEffectiveSuit !== currentLedSuit) {
            return {
            isValid: false,
            message: `Must follow suit. Led suit is ${currentLedSuit}, attempted to play ${cardToPlayEffectiveSuit}.`,
            };
        }
    } else {
        logger.warn({ledCard, trumpSuit, gameId: gameState.gameId}, "Led card's effective suit could not be determined. Play allowed by default.");
    }
  }

  return { isValid: true, message: 'Valid play.' };
}

/**
 * Validates if a player's bid (order up or call trump) is legal.
 *
 * @param {object} gameState - The current game state.
 * @param {string} playerRole - The role of the player making the bid.
 * @param {string} decision - 'orderUp', 'pass', or 'callTrump'.
 * @param {string} [suit] - The suit being called, if decision is 'callTrump'.
 * @returns {{isValid: boolean, message: string}} Validation result.
 */
export function isValidBid(gameState, playerRole, decision, suit = null) {
    if (!gameState || !playerRole || !decision || !PLAYER_ROLES.includes(playerRole)) {
        logger.warn({ gameStateProvided: !!gameState, playerRole, decision, suit }, 'isValidBid: Missing or invalid arguments.');
        return { isValid: false, message: 'Internal error: Missing or invalid data for bid validation.' };
    }

    const { gamePhase, currentPlayer, turnCard, dealer, roundNumber } = gameState;

    // Check if it's the player's turn to bid
    // In bidding phases, currentPlayer is equivalent to orderUpTurn
    if (currentPlayer !== playerRole) {
        return { isValid: false, message: `Not ${playerRole}'s turn to bid. It is ${currentPlayer}'s turn.` };
    }

    // Round 1 Bidding
    if (gamePhase === GAME_PHASES.ORDER_UP_ROUND1) {
        if (decision !== 'orderUp' && decision !== 'pass') {
            return { isValid: false, message: `Invalid decision '${decision}' for ${GAME_PHASES.ORDER_UP_ROUND1}.` };
        }
        if (decision === 'orderUp' && playerRole === dealer) {
            // Dealer cannot order themselves up; they are "forced" to pick up if all others pass and it comes back to them.
            // This specific "forced" logic is usually part of game flow, not simple validation.
            // However, they can't voluntarily order *themselves* up before that point.
            // This check assumes it's not the "stick the dealer" scenario yet.
            // If it IS "stick the dealer", then this validation should allow it.
            // For now, preventing voluntary order up by dealer.
            // A 'pickup' decision could be distinct for dealer.
            // This might be better handled in biddingPhase.js logic.
            // For now, we allow dealer to 'pass' or 'orderUp' (which means pickup for them).
        }
        return { isValid: true, message: `Decision '${decision}' is valid for ${GAME_PHASES.ORDER_UP_ROUND1}.` };
    }
    // Round 2 Bidding
    else if (gamePhase === GAME_PHASES.ORDER_UP_ROUND2) {
        if (decision !== 'callTrump' && decision !== 'pass') {
            return { isValid: false, message: `Invalid decision '${decision}' for ${GAME_PHASES.ORDER_UP_ROUND2}.` };
        }
        if (decision === 'callTrump') {
            if (!suit || !SUITS.includes(suit)) {
                return { isValid: false, message: 'Invalid suit provided for callTrump decision.' };
            }
            // turnCard should represent the card that was turned up in round 1.
            // Its suit is the one that was rejected.
            if (turnCard && suit === turnCard.suit) {
                return { isValid: false, message: `Cannot call the suit that was turned down (${turnCard.suit}).` };
            }
        }
        // "Stick the dealer" rule: if it's dealer's turn in round 2 and all others passed, dealer MUST call.
        // This validation doesn't enforce "must call", only that "pass" is invalid in that specific state.
        // The game logic in biddingPhase.js will handle the "must call" enforcement.
        const passesInRound2 = gameState.bids.filter(b => b.round === 2 && b.decision === 'pass').length;
        if (decision === 'pass' && playerRole === dealer && passesInRound2 === (PLAYER_ROLES.length -1) ) {
             // This implies it's dealer's turn after 3 passes in round 2
            return { isValid: false, message: 'Dealer must call a suit in this situation (stick the dealer).' };
        }

        return { isValid: true, message: `Decision '${decision}' is valid for ${GAME_PHASES.ORDER_UP_ROUND2}.` };
    }
    // Not a valid bidding phase
    else {
        return { isValid: false, message: `Cannot make bid decision during ${gamePhase} phase.` };
    }
}

/**
 * Validates if the dealer's discard action is legal.
 * Assumes dealer's hand already includes the picked-up turnCard (so, 6 cards).
 *
 * @param {object} gameState - The current game state.
 * @param {string} playerRole - The role of the player attempting to discard (must be the dealer).
 * @param {object} cardToDiscard - The card object the dealer intends to discard.
 * @param {Array<object>} playerHand - The dealer's current hand (should contain 6 cards).
 * @returns {{isValid: boolean, message: string}} Validation result.
 */
export function isValidDealerDiscard(gameState, playerRole, cardToDiscard, playerHand) {
    if (!gameState || !playerRole || !cardToDiscard || !cardToDiscard.id || !playerHand) {
        logger.warn({gameStateProvided: !!gameState, playerRole, cardToDiscardProvided: !!cardToDiscard, playerHandProvided: !!playerHand },
        'isValidDealerDiscard: Missing or invalid arguments.');
        return { isValid: false, message: 'Internal error: Missing data for discard validation.' };
    }

    if (gameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
        return { isValid: false, message: `Cannot discard card during ${gameState.gamePhase} phase.` };
    }

    if (gameState.dealer !== playerRole) {
        return { isValid: false, message: `Only the dealer (${gameState.dealer}) can discard. Player ${playerRole} attempted.`};
    }

    if (gameState.currentPlayer !== playerRole) { // Ensure it's dealer's turn to discard
        return { isValid: false, message: `Not ${playerRole}'s turn to discard. It is ${gameState.currentPlayer}'s turn.`};
    }

    const cardInHand = playerHand.find(c => c.id === cardToDiscard.id);
    if (!cardInHand) {
        return { isValid: false, message: `Card ${cardToDiscard.id} is not in dealer's hand to discard.` };
    }

    // Standard rule: dealer cannot discard the card they were ordered to pick up if it made trump,
    // unless it's their only card of that suit (which is impossible if they picked it up, then they'd have 2).
    // However, simpler to say: they picked it up, it's in their 6-card hand. They can discard any of the 6.
    // The `turnCard` in gameState is the card that *was* turned up. If it's still there, it's what they picked up.
    // This validation assumes the game logic will add turnCard to hand *before* asking for discard.
    // No specific rule here prevents discarding the picked-up card from the 6-card hand.

    if (playerHand.length !== 6) {
        // This check is more of a sanity check for the game logic leading to this state.
        logger.warn({ playerRole, handSize: playerHand.length, gameId: gameState.gameId },
                    "Dealer's hand does not have 6 cards at the point of discard validation.");
        // Not strictly a validation failure of the *discard action itself* if the card is in hand,
        // but indicates a potential issue in prior state updates. For now, not failing the validation for this.
    }

    return { isValid: true, message: 'Valid dealer discard.' };
}

// Add other validation functions as needed (e.g., isValidGoAlone)
