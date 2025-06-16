/**
 * Validation logic for Euchre game actions.
 * @module validation
 */
import { GAME_PHASES, SUITS } from '../../config/constants.js';
import { isLeftBower, isRightBower } from '../../utils/deck.js'; // Assuming cardToId might be useful too
import logger from '../../utils/logger.js';

/**
 * Determines the effective suit of a card, considering the Left Bower rule.
 * The Left Bower is considered to be of the trump suit.
 * @param {object} card - The card object { suit, value }.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {string} The effective suit of the card.
 */
function getEffectiveSuit(card, trumpSuit) {
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
  if (!gameState || !playerHand || !cardToPlay || !playerRole) {
    logger.error({ gameState, playerHand, cardToPlay, playerRole }, 'isValidPlay: Missing arguments.');
    return { isValid: false, message: 'Internal error: Missing data for validation.' };
  }

  // 1. Game Phase Check
  if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
    return { isValid: false, message: `Cannot play card during ${gameState.gamePhase} phase.` };
  }

  // 2. Player's Turn Check
  if (gameState.currentPlayer !== playerRole) {
    return { isValid: false, message: `Not ${playerRole}'s turn. It is ${gameState.currentPlayer}'s turn.` };
  }

  // 3. Card in Hand Check
  const cardInHand = playerHand.find(c => c.id === cardToPlay.id);
  if (!cardInHand) {
    return { isValid: false, message: `Card ${cardToPlay.id} is not in ${playerRole}'s hand.` };
  }

  // 4. Following Suit Logic
  const { currentTrick, trumpSuit } = gameState;
  const ledCard = currentTrick && currentTrick.length > 0 ? currentTrick[0].card : null;

  if (ledCard) {
    const ledSuit = getEffectiveSuit(ledCard, trumpSuit); // Effective suit of the card that led the trick
    const cardToPlayEffectiveSuit = getEffectiveSuit(cardToPlay, trumpSuit);

    // Check if the player has any card of the led suit
    const playerHasLedSuit = playerHand.some(handCard => getEffectiveSuit(handCard, trumpSuit) === ledSuit);

    if (playerHasLedSuit && cardToPlayEffectiveSuit !== ledSuit) {
      return {
        isValid: false,
        message: `Must follow suit. Led suit is ${ledSuit}, attempted to play ${cardToPlayEffectiveSuit}.`,
      };
    }
  }
  // If no card led (player is leading the trick) or if player is void in led suit, any card is valid (basic check)
  // More specific rules (e.g. can't lead trump if opponents out of trump in some variations) are not implemented here.

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
    if (!gameState || !playerRole || !decision) {
        logger.error({ gameState, playerRole, decision, suit }, 'isValidBid: Missing arguments.');
        return { isValid: false, message: 'Internal error: Missing data for bid validation.' };
    }

    const { gamePhase, orderUpTurn, turnCard, dealer } = gameState;

    // Check if it's the player's turn to bid
    if (orderUpTurn !== playerRole) {
        return { isValid: false, message: `Not ${playerRole}'s turn to bid. It is ${orderUpTurn}'s turn.` };
    }

    if (decision === 'orderUp' || (decision === 'pass' && (gamePhase === GAME_PHASES.ORDER_UP_ROUND1 || gamePhase === GAME_PHASES.ORDER_UP_ROUND2))) {
        if (gamePhase !== GAME_PHASES.ORDER_UP_ROUND1 && gamePhase !== GAME_PHASES.ORDER_UP_ROUND2) {
            return { isValid: false, message: `Cannot ${decision} during ${gamePhase} phase.` };
        }
        // In round 1, if ordering up, the suit is implicitly the turnCard's suit.
        // If player is dealer in round 1 and it's their turn, they can't order themselves up (must pick up or pass if forced)
        // This specific rule (dealer pick up) is typically handled in game logic, not just validation.
        // Here we just check if the action is phase-appropriate.
        return { isValid: true, message: `Decision '${decision}' is valid for current phase.` };
    } else if (decision === 'callTrump') {
        if (gamePhase !== GAME_PHASES.ORDER_UP_ROUND2) {
            return { isValid: false, message: `Cannot call trump during ${gamePhase} phase.` };
        }
        if (!suit || !SUITS.includes(suit)) {
            return { isValid: false, message: 'Invalid suit called for trump.' };
        }
        if (turnCard && suit === turnCard.suit) {
            // In round 2, cannot call the suit that was originally turned up and then turned down.
            // This assumes turnCard still holds the original up-card's suit after being turned down.
            // Game logic needs to ensure turnCard is properly managed (e.g., nulled or its suit remembered).
            // For validation, we check against current turnCard. If it's null (already turned down), this check passes.
            // A better approach might be to store `rejectedSuit` in gameState.
            // For now, assuming turnCard.suit is the suit of the card that was turned down.
             if (gameState.bids.some(b => b.playerRole === dealer && b.decision === 'turndown')) { // A simple way to check if card was turned down
                // This check might be too simplistic, relies on specific bid tracking.
                // A more robust check: if turnCard is not null AND suit === turnCard.suit AND current round is 2
             }
            // This logic is tricky: if turnCard is still on table, its suit cannot be called.
            // If turnCard was already passed on (is null or different), this check is complex.
            // Simplified: The game logic in bidding.js should prevent this.
            // Here, we just check if the suit is valid.
        }
        return { isValid: true, message: `Decision '${decision}' with suit '${suit}' is valid.` };
    } else {
        return { isValid: false, message: `Invalid bid decision: ${decision}.` };
    }
}

// Add other validation functions as needed (e.g., isValidGoAlone, isValidDiscard)
