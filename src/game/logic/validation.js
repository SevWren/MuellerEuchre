/**
 * Validation logic for Euchre game actions.
 * @module validation
 */
import { GAME_PHASES, SUITS, PLAYER_ROLES } from '../../config/constants.js';
import { isLeftBower } from '../../utils/deck.js';
import logger from '../../utils/logger.js';
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
} from './errors.js';

/**
 * Determines the effective suit of a card, considering the Left Bower rule.
 * The Left Bower is considered to be of the trump suit.
 * @param {object} card - The card object { suit, value }.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {string | null} The effective suit of the card, or null if card is undefined.
 */
function getEffectiveSuit(card, trumpSuit) {
  if (!card) return null;
  if (isLeftBower(card, trumpSuit)) {
    return trumpSuit;
  }
  return card.suit;
}

/**
 * Validates if a card play is legal according to Euchre rules.
 * Throws custom errors if the play is invalid.
 *
 * @param {object} gameState - The current game state.
 * @param {string} gameState.gamePhase - The current phase of the game.
 * @param {string} gameState.currentPlayer - The role of the player whose turn it is.
 * @param {Array<object>} [gameState.currentTrick] - The cards already played in the current trick.
 * @param {string} gameState.trumpSuit - The current trump suit.
 * @param {string} [gameState.gameId] - The ID of the game (for logging).
 * @param {Array<object>} playerHand - An array of card objects for the player's hand. Each card should have an `id`.
 * @param {object} cardToPlay - The card object the player intends to play. Must have an `id`, `suit`, and `value`.
 * @param {string} cardToPlay.id - Unique identifier for the card.
 * @param {string} cardToPlay.suit - Suit of the card.
 * @param {string} cardToPlay.value - Rank/value of the card.
 * @param {string} playerRole - The role of the player making the play.
 * @throws {ValidationError} If basic arguments are missing or invalid.
 * @throws {InvalidPhaseError} If the game is not in the 'PLAYING' phase.
 * @throws {NotPlayersTurnError} If it's not the specified player's turn.
 * @throws {CardNotInHandError} If the card to play is not found in the player's hand.
 * @throws {MustFollowSuitError} If the player fails to follow suit when required.
 * @returns {true} If the play is valid.
 */
export function validatePlay(gameState, playerHand, cardToPlay, playerRole) {
  if (!gameState || !playerHand || !cardToPlay || !cardToPlay.id || !playerRole) {
    logger.error({ gameStateProvided: !!gameState, playerHandProvided: !!playerHand, cardToPlayProvided: !!cardToPlay, playerRole }, 'validatePlay: Missing or invalid arguments.');
    throw new ValidationError('Internal error: Missing data for play validation.');
  }

  if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
    throw new InvalidPhaseError(`Cannot play card during ${gameState.gamePhase} phase.`);
  }

  if (gameState.currentPlayer !== playerRole) {
    throw new NotPlayersTurnError(playerRole, gameState.currentPlayer);
  }

  const cardInHand = playerHand.find(c => c.id === cardToPlay.id);
  if (!cardInHand) {
    throw new CardNotInHandError(`Card ${cardToPlay.id} is not in ${playerRole}'s hand.`);
  }

  const { currentTrick, trumpSuit } = gameState;
  const ledCard = currentTrick && currentTrick.length > 0 ? currentTrick[0].card : null;

  if (ledCard) {
    const currentLedSuit = getEffectiveSuit(ledCard, trumpSuit);
    const cardToPlayEffectiveSuit = getEffectiveSuit(cardToPlay, trumpSuit);

    if (currentLedSuit) { // Ensure ledSuit is valid before proceeding
      const playerHasLedSuit = playerHand.some(handCard => getEffectiveSuit(handCard, trumpSuit) === currentLedSuit);
      if (playerHasLedSuit && cardToPlayEffectiveSuit !== currentLedSuit) {
        // The original error message from the previous subtask, before adding "Player has..."
        throw new MustFollowSuitError(`Must follow suit. Led suit is ${currentLedSuit}, attempted to play ${cardToPlayEffectiveSuit}.`);
      }
    } else {
      // This case should ideally not happen if ledCard is valid.
      // If getEffectiveSuit returns null for a valid ledCard, it implies an issue with isLeftBower or card structure.
      logger.warn({ ledCard, trumpSuit, gameId: gameState.gameId }, "Led card's effective suit could not be determined. Play allowed by default, but this may indicate an issue.");
    }
  }

  return true; // If no errors were thrown, the play is valid.
}

/**
 * Validates if a player's bid (order up or call trump) is legal.
 *
 * @param {object} gameState - The current game state.
 * @param {string} gameState.gamePhase - The current phase of the game (e.g., 'ORDER_UP_ROUND1', 'ORDER_UP_ROUND2').
 * @param {string} gameState.currentPlayer - The role of the player whose turn it is to bid.
 * @param {object} [gameState.turnCard] - The card that was turned up. Relevant for 'ORDER_UP_ROUND1' and 'ORDER_UP_ROUND2'.
 * @param {string} gameState.dealer - The role of the current dealer.
 * @param {Array<object>} [gameState.bids] - A list of bids made so far in the current bidding round.
 * @param {string} playerRole - The role of the player making the bid.
 * @param {'orderUp'|'pass'|'callTrump'} decision - The bidding decision made by the player.
 * @param {string} [suit] - The suit being called, if `decision` is 'callTrump'. Must be a valid suit from `SUITS`.
 * @throws {ValidationError} If basic arguments are missing or invalid.
 * @throws {NotPlayersTurnError} If it's not the specified player's turn to bid.
 * @throws {InvalidPhaseError} If bidding is attempted outside of valid bidding phases.
 * @throws {InvalidBidError} For various illegal bidding decisions (e.g., wrong decision for phase, invalid suit).
 * @returns {true} If the bid is valid.
 */
export function validateBid(gameState, playerRole, decision, suit = null) {
    if (!gameState || !playerRole || !decision || !PLAYER_ROLES.includes(playerRole)) {
        logger.warn({ gameStateProvided: !!gameState, playerRole, decision, suit }, 'validateBid: Missing or invalid arguments.');
        throw new ValidationError('Internal error: Missing or invalid data for bid validation.');
    }

    const { gamePhase, currentPlayer, turnCard, dealer, bids } = gameState; // Removed roundNumber as it's not used directly

    if (currentPlayer !== playerRole) {
        throw new NotPlayersTurnError(playerRole, currentPlayer);
    }

    // Round 1 Bidding
    if (gamePhase === GAME_PHASES.ORDER_UP_ROUND1) {
        if (decision !== 'orderUp' && decision !== 'pass') {
            throw new InvalidBidError(`Invalid decision '${decision}' for ${GAME_PHASES.ORDER_UP_ROUND1}.`);
        }
        // Note: The logic for dealer being "forced" to pick up is typically handled by game flow,
        // not a simple validation rule preventing them from 'ordering up' themselves.
        // A dealer 'ordering up' in round 1 means they accept the turnCard.
        return true;
    }
    // Round 2 Bidding
    else if (gamePhase === GAME_PHASES.ORDER_UP_ROUND2) {
        if (decision !== 'callTrump' && decision !== 'pass') {
            throw new InvalidBidError(`Invalid decision '${decision}' for ${GAME_PHASES.ORDER_UP_ROUND2}.`);
        }
        if (decision === 'callTrump') {
            if (!suit || !Object.values(SUITS).includes(suit)) {
                throw new InvalidBidError('Invalid suit provided for callTrump decision.');
            }
            if (turnCard && suit === turnCard.suit) {
                throw new InvalidBidError(`Cannot call the suit that was turned down (${turnCard.suit}).`);
            }
        }

        // "Stick the dealer" rule: if it's dealer's turn in round 2 and all others passed, dealer MUST call.
        // This validation enforces that "pass" is invalid in that specific state.
        if (decision === 'pass' && playerRole === dealer) {
            const passesInRound2 = bids.filter(b => b.round === 2 && b.decision === 'pass').length;
            // Check if all other players (PLAYER_ROLES.length - 1) have passed in round 2.
            // This implies it's the dealer's turn and they are the last one to bid in this round.
            if (passesInRound2 === (PLAYER_ROLES.length - 1)) {
                throw new InvalidBidError('Dealer must call a suit in this situation (stick the dealer).');
            }
        }
        return true;
    }
    // Not a valid bidding phase
    else {
        throw new InvalidPhaseError(`Cannot make bid decision during ${gamePhase} phase.`);
    }
}

/**
 * Validates if the dealer's discard action is legal.
 * Assumes dealer's hand already includes the picked-up turnCard (so, 6 cards).
 *
 * @param {object} gameState - The current game state.
 * @param {string} gameState.gamePhase - The current phase of the game (should be 'DEALER_DISCARD').
 * @param {string} gameState.dealer - The role of the current dealer.
 * @param {string} gameState.currentPlayer - The role of the player whose turn it is (should be the dealer).
 * @param {string} [gameState.gameId] - The ID of the game (for logging).
 * @param {string} playerRole - The role of the player attempting to discard (must be the dealer).
 * @param {object} cardToDiscard - The card object the dealer intends to discard. Must have an `id`.
 * @param {string} cardToDiscard.id - Unique identifier for the card to be discarded.
 * @param {Array<object>} playerHand - The dealer's current hand (should contain 6 cards). Each card should have an `id`.
 * @throws {ValidationError} If basic arguments are missing or invalid.
 * @throws {InvalidPhaseError} If discarding is attempted outside of the 'DEALER_DISCARD' phase.
 * @throws {InvalidDiscardError} If a non-dealer tries to discard, or if the action is otherwise invalid specific to discard rules.
 * @throws {NotPlayersTurnError} If it's not the specified player's turn.
 * @throws {CardNotInHandError} If the card to discard is not found in the player's hand.
 * @returns {true} If the discard is valid.
 */
export function validateDealerDiscard(gameState, playerRole, cardToDiscard, playerHand) {
    if (!gameState || !playerRole || !cardToDiscard || !cardToDiscard.id || !playerHand) {
        logger.warn({gameStateProvided: !!gameState, playerRole, cardToDiscardProvided: !!cardToDiscard, playerHandProvided: !!playerHand },
        'validateDealerDiscard: Missing or invalid arguments.');
        throw new ValidationError('Internal error: Missing data for discard validation.');
    }

    if (gameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
        throw new InvalidPhaseError(`Cannot discard card during ${gameState.gamePhase} phase.`);
    }

    if (gameState.dealer !== playerRole) {
        throw new InvalidDiscardError(`Only the dealer (${gameState.dealer}) can discard. Player ${playerRole} attempted.`);
    }

    if (gameState.currentPlayer !== playerRole) { // Ensure it's dealer's turn to discard
        throw new NotPlayersTurnError(playerRole, gameState.currentPlayer);
    }

    const cardInHand = playerHand.find(c => c.id === cardToDiscard.id);
    if (!cardInHand) {
        throw new CardNotInHandError(`Card ${cardToDiscard.id} is not in dealer's hand to discard.`);
    }

    // The check for playerHand.length !== 6 remains a logger.warn as per instructions,
    // as it's more of a state sanity check than a direct validation of the discard action itself.
    if (playerHand.length !== 6) {
        logger.warn({ playerRole, handSize: playerHand.length, gameId: gameState.gameId },
                    "Dealer's hand does not have 6 cards at the point of discard validation.");
    }

    return true; // If no errors were thrown, the discard is valid.
}

// Add other validation functions as needed (e.g., isValidGoAlone)
