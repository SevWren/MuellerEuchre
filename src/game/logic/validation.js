/**
 * Validation logic for Euchre game actions.
 * @module validation
 */
import { GAME_PHASES, SUITS, PLAYER_ROLES } from '../../config/constants.js';
import { isLeftBower } from '../../utils/deck.js';
import logger from '../../utils/logger.js';

/**
 * Determines the effective suit of a card, considering the Left Bower rule.
 * The Left Bower is considered to be of the trump suit.
 * @param {object} card - The card object { suit, rank }.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {string | null} The effective suit of the card, or null if card is invalid.
 */
function getEffectiveSuit(card, trumpSuit) {
  if (!card || typeof card.suit !== 'string' || !card.suit.trim() || typeof card.rank !== 'string' || !card.rank.trim()) {
    logger.warn({ cardReceived: card, trumpSuit }, "Invalid card structure in getEffectiveSuit. Card or its properties (suit, rank) are missing or invalid.");
    return null; // Or handle as per specific game rule for malformed card data
  }
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
  // Enhanced argument validation
  if (!gameState || typeof gameState.players !== 'object' || !Array.isArray(gameState.currentTrick) ||
      !playerRole || typeof playerRole !== 'string' || !playerRole.trim() ||
      !cardToPlay || typeof cardToPlay.id !== 'string' || !cardToPlay.id.trim() ||
      typeof cardToPlay.suit !== 'string' || !cardToPlay.suit.trim() ||
      typeof cardToPlay.rank !== 'string' || !cardToPlay.rank.trim() ||
      !Array.isArray(playerHand)) {
    const details = {
        gameStateProvided: !!gameState,
        playersObject: typeof gameState?.players === 'object',
        currentTrickArray: Array.isArray(gameState?.currentTrick),
        playerRoleProvided: !!playerRole,
        cardToPlayProvided: !!cardToPlay,
        cardIdValid: typeof cardToPlay?.id === 'string' && !!cardToPlay?.id.trim(),
        cardSuitValid: typeof cardToPlay?.suit === 'string' && !!cardToPlay?.suit.trim(),
        cardRankValid: typeof cardToPlay?.rank === 'string' && !!cardToPlay?.rank.trim(),
        playerHandArray: Array.isArray(playerHand)
    };
    logger.error({ gameId: gameState?.gameId, playerRole, cardToPlay, details }, 'isValidPlay: Internal error - Missing or malformed arguments.');
    return { isValid: false, message: 'Internal error: Invalid arguments for play validation.' };
  }

  if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
    return { isValid: false, message: `Cannot play card. Game is in ${gameState.gamePhase} phase, not PLAYING.` };
  }

  if (gameState.currentPlayer !== playerRole) {
    return { isValid: false, message: `Not your turn. It is ${gameState.currentPlayer}'s turn to play.` };
  }

  const cardInHand = playerHand.find(c => c.id === cardToPlay.id);
  if (!cardInHand) {
    return { isValid: false, message: `Card not found in your hand. Attempted to play ${cardToPlay.rank} of ${cardToPlay.suit}.` };
  }

  const { currentTrick, trumpSuit } = gameState;
  const ledCard = currentTrick.length > 0 ? currentTrick[0].card : null; // currentTrick stores {card, playedBy}

  if (ledCard) {
    const currentLedSuit = getEffectiveSuit(ledCard, trumpSuit);
    const cardToPlayEffectiveSuit = getEffectiveSuit(cardToPlay, trumpSuit);

    if (!currentLedSuit) { // Check if led card itself was valid for suit determination
        logger.error({ledCard, trumpSuit, gameId: gameState.gameId}, "Critical: Led card's effective suit could not be determined. This may indicate corrupt game state or card data.");
        return { isValid: false, message: "Internal error: Cannot determine the suit of the led card." };
    }
    if (!cardToPlayEffectiveSuit) { // Check if played card is valid for suit determination
        logger.warn({cardToPlay, trumpSuit, gameId: gameState.gameId}, "Played card's effective suit could not be determined. This may indicate corrupt card data for the played card.");
        return { isValid: false, message: "Invalid card: Cannot determine the suit of the card you played." };
    }

    const playerHasLedSuit = playerHand.some(handCard => getEffectiveSuit(handCard, trumpSuit) === currentLedSuit);
    if (playerHasLedSuit && cardToPlayEffectiveSuit !== currentLedSuit) {
        return {
        isValid: false,
        message: `Must follow suit. Led suit is ${currentLedSuit}, attempted to play ${cardToPlayEffectiveSuit}.`,
        };
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
    // Enhanced argument validation
    if (!gameState || typeof gameState.gamePhase !== 'string' || typeof gameState.currentPlayer !== 'string' ||
        !Array.isArray(gameState.bids) ||
        typeof playerRole !== 'string' || !playerRole.trim() ||
        typeof decision !== 'string' || !decision.trim() ||
        !PLAYER_ROLES.includes(playerRole)) { // Also check if playerRole is a valid role
        const details = {
            gameStateProvided: !!gameState,
            gamePhaseValid: typeof gameState?.gamePhase === 'string',
            currentPlayerValid: typeof gameState?.currentPlayer === 'string',
            bidsArray: Array.isArray(gameState?.bids),
            playerRoleValid: typeof playerRole === 'string' && !!playerRole.trim() && PLAYER_ROLES.includes(playerRole),
            decisionValid: typeof decision === 'string' && !!decision.trim(),
        };
        logger.warn({ gameId: gameState?.gameId, playerRole, decision, suit, details }, 'isValidBid: Internal error - Missing or malformed arguments.');
        return { isValid: false, message: 'Internal error: Invalid arguments for bid validation.' };
    }

    const { gamePhase, currentPlayer, turnCard, dealer } = gameState; // Removed roundNumber, directly use gamePhase

    if (currentPlayer !== playerRole) {
        return { isValid: false, message: `Not your turn to bid. It is ${currentPlayer}'s turn.` };
    }

    if (gamePhase === GAME_PHASES.ORDER_UP_ROUND1) {
        if (decision !== 'orderUp' && decision !== 'pass') {
            return { isValid: false, message: `Invalid decision: '${decision}'. In this round, you can only 'orderUp' or 'pass'.` };
        }
        // Additional logic for dealer ordering self up might be complex and better handled in phase logic
        return { isValid: true, message: 'Bid is valid for this round.' };
    }
    else if (gamePhase === GAME_PHASES.ORDER_UP_ROUND2) {
        if (decision !== 'callTrump' && decision !== 'pass') {
            return { isValid: false, message: `Invalid decision: '${decision}'. In this round, you can only 'callTrump' or 'pass'.` };
        }
        if (decision === 'callTrump') {
            if (!suit || !Object.values(SUITS).includes(suit)) { // Use Object.values for SUITS check
                return { isValid: false, message: 'Invalid suit. Please select a valid suit to call trump.' };
            }
            if (turnCard && suit === turnCard.suit) { // turnCard is the one from round 1
                return { isValid: false, message: `Cannot call the suit (${turnCard.suit}) that was turned down.` };
            }
        }
        const passesInRound2 = gameState.bids.filter(b => b.round === 2 && b.decision === 'pass').length;
        if (decision === 'pass' && playerRole === dealer && passesInRound2 === (PLAYER_ROLES.length - 1) ) {
            return { isValid: false, message: 'Dealer must call a suit now (stick the dealer rule).' };
        }
        return { isValid: true, message: 'Bid is valid for this round.' };
    }
    else {
        return { isValid: false, message: `Cannot make bid decision. Game is in ${gamePhase} phase.` };
    }
}

/**
 * Validates if the dealer's discard action is legal.
 *
 * @param {object} gameState - The current game state.
 * @param {string} playerRole - The role of the player attempting to discard (must be the dealer).
 * @param {object} cardToDiscard - The card object the dealer intends to discard.
 * @param {Array<object>} playerHand - The dealer's current hand (should contain 6 cards at this point).
 * @returns {{isValid: boolean, message: string}} Validation result.
 */
export function isValidDealerDiscard(gameState, playerRole, cardToDiscard, playerHand) {
    // Enhanced argument validation
    if (!gameState || typeof gameState.dealer !== 'string' || typeof gameState.currentPlayer !== 'string' ||
        !playerRole || typeof playerRole !== 'string' || !playerRole.trim() ||
        !cardToDiscard || typeof cardToDiscard.id !== 'string' || !cardToDiscard.id.trim() ||
        typeof cardToDiscard.suit !== 'string' || !cardToDiscard.suit.trim() ||
        typeof cardToDiscard.rank !== 'string' || !cardToDiscard.rank.trim() ||
        !Array.isArray(playerHand)) {
        const details = {
            gameStateProvided: !!gameState,
            dealerValid: typeof gameState?.dealer === 'string',
            currentPlayerValid: typeof gameState?.currentPlayer === 'string',
            playerRoleProvided: !!playerRole,
            cardToDiscardProvided: !!cardToDiscard,
            cardIdValid: typeof cardToDiscard?.id === 'string' && !!cardToDiscard?.id.trim(),
            cardSuitValid: typeof cardToDiscard?.suit === 'string' && !!cardToDiscard?.suit.trim(),
            cardRankValid: typeof cardToDiscard?.rank === 'string' && !!cardToDiscard?.rank.trim(),
            playerHandArray: Array.isArray(playerHand)
        };
        logger.warn({ gameId: gameState?.gameId, playerRole, cardToDiscard, details }, 'isValidDealerDiscard: Internal error - Missing or malformed arguments.');
        return { isValid: false, message: 'Internal error: Invalid arguments for discard validation.' };
    }

    if (gameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
        return { isValid: false, message: `Cannot discard now. Game is in ${gameState.gamePhase} phase.` };
    }

    if (gameState.dealer !== playerRole) {
        return { isValid: false, message: `Only the dealer (${gameState.dealer}) can discard. You are ${playerRole}.`};
    }

    if (gameState.currentPlayer !== playerRole) {
        return { isValid: false, message: `Not your turn to discard. It is ${gameState.currentPlayer}'s turn.`};
    }

    const cardInHand = playerHand.find(c => c.id === cardToDiscard.id);
    if (!cardInHand) {
        // Card ID is good for logging, but rank/suit is better for user message.
        return { isValid: false, message: `Card (${cardToDiscard.rank} of ${cardToDiscard.suit}) not found in your hand.` };
    }

    if (playerHand.length !== 6) {
        logger.warn({ playerRole, handSize: playerHand.length, gameId: gameState.gameId },
                    "Dealer's hand does not have 6 cards at discard validation. This might indicate a logic error elsewhere, but discard itself might still be valid if card is in hand.");
        // This is an internal consistency check, not directly a player's fault.
        // The discard can still be valid if the card is in hand.
    }

    return { isValid: true, message: 'Valid dealer discard.' };
}
