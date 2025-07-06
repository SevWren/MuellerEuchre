/**
 * Core validation logic for Euchre game actions (Layer 1).
 * @module validation
 * @description
 *   Contains pure validation functions for game actions including:
 *   - Card play validation
 *   - Bidding validation
 *   - Dealer discard validation
 *
 *   All functions are stateless and throw specific validation errors.
 *   This module does not mutate state or perform I/O operations.
 */
import { GAME_PHASES, SUITS, PLAYER_ROLES } from "../../config/constants.js";
import { isLeftBower, areSameColor } from "../../utils/deck.js";
import logger from "../../utils/logger.js";
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
} from "./errors.js";

/**
 * Determines the effective suit of a card, considering the Left Bower rule.
 * In Euchre, the Left Bower (Jack of the same color as trump) is considered
 * to be of the trump suit for the purpose of following suit.
 *
 * @function getEffectiveSuit
 * @memberof module:validation
 * @param {Object} card - The card to evaluate.
 * @param {string} card.suit - The actual suit of the card.
 * @param {string} card.value - The value of the card (e.g., 'J', 'Q', 'K').
 * @param {string} trumpSuit - The current trump suit (must be a valid suit).
 * @returns {string | null} The effective suit of the card, or null if card is null/undefined.
 * @throws {TypeError} If `trumpSuit` is not a valid suit.
 * @example
 * // Basic usage
 * const card = { suit: 'diamonds', value: 'J' };
 * const effectiveSuit = getEffectiveSuit(card, 'hearts'); // Returns 'hearts' (Left Bower)
 *
 * // With non-Left Bower card
 * const card2 = { suit: 'clubs', value: 'K' };
 * const effectiveSuit2 = getEffectiveSuit(card2, 'spades'); // Returns 'clubs'
 *
 * // With null card
 * const effectiveSuit3 = getEffectiveSuit(null, 'hearts'); // Returns null
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
 * This is a core validation function that enforces the fundamental rules of Euchre
 * regarding legal card plays, including following suit and turn order.
 *
 * @function validatePlay
 * @memberof module:validation
 * @param {Object} gameState - The current game state object.
 * @param {string} gameState.currentPhase - The current game phase (must be 'PLAYING' for valid play).
 * @param {string} gameState.currentPlayer - The role of the player whose turn it is.
 * @param {Array} gameState.currentTrick - Array of cards played in the current trick so far.
 * @param {string} gameState.trumpSuit - The current trump suit.
 * @param {string} gameState.ledSuit - The suit that was led in the current trick (if any).
 * @param {Array<Object>} playerHand - The player's current hand (array of card objects).
 * @param {Object} cardToPlay - The card the player intends to play.
 * @param {string} cardToPlay.id - Unique identifier for the card.
 * @param {string} cardToPlay.suit - The suit of the card.
 * @param {string} cardToPlay.value - The value of the card.
 * @param {string} playerRole - The role ('north', 'south', 'east', 'west') of the player making the play.
 * @returns {true} Returns true if the play is valid.
 * @throws {ValidationError} If any required arguments are missing or invalid.
 * @throws {InvalidPhaseError} If the game is not in the 'PLAYING' phase.
 * @throws {NotPlayersTurnError} If it's not the specified player's turn.
 * @throws {CardNotInHandError} If the card to play is not found in the player's hand.
 * @throws {MustFollowSuitError} If the player fails to follow suit when required by Euchre rules.
 *
 * @example
 * // Basic valid play (leading a trick)
 * const gameState = {
 *   currentPhase: 'PLAYING',
 *   currentPlayer: 'south',
 *   currentTrick: [],
 *   trumpSuit: 'hearts',
 *   ledSuit: null
 * };
 * const hand = [
 *   { id: 'JH', suit: 'hearts', value: 'J' },
 *   { id: '9D', suit: 'diamonds', value: '9' }
 * ];
 * validatePlay(gameState, hand, hand[0], 'south'); // Returns true
 *
 * @example
 * // Following suit
 * const gameState2 = {
 *   currentPhase: 'PLAYING',
 *   currentPlayer: 'north',
 *   currentTrick: [{ id: 'AS', suit: 'spades', value: 'A', playedBy: 'east' }],
 *   trumpSuit: 'hearts',
 *   ledSuit: 'spades'
 * };
 * const hand2 = [
 *   { id: 'KS', suit: 'spades', value: 'K' },
 *   { id: 'QH', suit: 'hearts', value: 'Q' }
 * ];
 * // Must play a spade (following suit)
 * validatePlay(gameState2, hand2, hand2[0], 'north'); // Returns true
 * // Invalid: Trying to play a heart when must follow spades
 * // Throws MustFollowSuitError
 * validatePlay(gameState2, hand2, hand2[1], 'north');
 *
 * @see getEffectiveSuit For how card suits are determined when trumps are involved
 * @see isLeftBower For special handling of the Left Bower card
 */
function validatePlay(gameState, playerHand, cardToPlay, playerRole) {
  if (
    !gameState ||
    !playerHand ||
    !cardToPlay ||
    !cardToPlay.id ||
    !playerRole
  ) {
    logger.error(
      {
        gameStateProvided: !!gameState,
        playerHandProvided: !!playerHand,
        cardToPlayProvided: !!cardToPlay,
        playerRole,
      },
      "validatePlay: Missing or invalid arguments.",
    );
    throw new ValidationError(
      "Internal error: Missing data for play validation.",
    );
  }

  if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
    throw new InvalidPhaseError(
      `Cannot play card during ${gameState.gamePhase} phase.`,
    );
  }

  if (gameState.currentPlayer !== playerRole) {
    throw new NotPlayersTurnError(playerRole, gameState.currentPlayer);
  }

  const cardInHand = playerHand.find((c) => c.id === cardToPlay.id);
  if (!cardInHand) {
    throw new CardNotInHandError(
      `Card ${cardToPlay.id} is not in ${playerRole}'s hand.`,
    );
  }

  const { currentTrick, trumpSuit } = gameState;
  const ledCard =
    currentTrick && currentTrick.length > 0 ? currentTrick[0].card : null;

  if (ledCard) {
    const trueLedCard = currentTrick[0].card;
    const currentLedEffectiveSuit = getEffectiveSuit(trueLedCard, trumpSuit);

    // Check if player has any card of the led suit (including left bower if applicable)
    const playerHasLedSuitCard = playerHand.some(
      (handCard) =>
        getEffectiveSuit(handCard, trumpSuit) === currentLedEffectiveSuit,
    );

    const cardToPlayEffectiveSuit = getEffectiveSuit(cardToPlay, trumpSuit);

    // If player has a card of the led suit, they must play one
    if (
      playerHasLedSuitCard &&
      cardToPlayEffectiveSuit !== currentLedEffectiveSuit
    ) {
      throw new MustFollowSuitError(
        `Must follow suit. Led suit is ${currentLedEffectiveSuit}, attempted to play ${cardToPlayEffectiveSuit}.`,
      );
    }
  }

  return true; // If no errors were thrown, the play is valid.
}

/**
 * Validates if a player's bid (order up or call trump) is legal according to Euchre rules.
 * This function enforces the bidding rules for both the first and second rounds of bidding.
 *
 * @function validateBid
 * @memberof module:validation
 * @param {Object} gameState - The current game state object.
 * @param {string} gameState.gamePhase - The current game phase (must be a bidding phase).
 * @param {string} gameState.currentPlayer - The role of the player whose turn it is to bid.
 * @param {Object} gameState.turnCard - The turn card being considered for ordering up (in first round).
 * @param {string} gameState.dealer - The role of the dealer for the current hand.
 * @param {Array} gameState.bids - Array of bids made so far in the current round.
 * @param {string} playerRole - The role ('north', 'south', 'east', 'west') of the player making the bid.
 * @param {string} decision - The bid decision, one of: 'orderUp', 'pass', or 'callTrump'.
 * @param {string} [suit=null] - The suit being called (required if decision is 'callTrump').
 * @returns {true} Returns true if the bid is valid.
 * @throws {ValidationError} If any required arguments are missing or invalid.
 * @throws {NotPlayersTurnError} If it's not the specified player's turn to bid.
 * @throws {InvalidPhaseError} If bidding is attempted outside of valid bidding phases.
 * @throws {InvalidBidError} For various illegal bidding decisions.
 *
 * @example
 * // First round bidding - ordering up the turn card
 * const gameState1 = {
 *   gamePhase: 'ORDER_UP_ROUND1',
 *   currentPlayer: 'south',
 *   dealer: 'east',
 *   bids: [],
 *   turnCard: { suit: 'hearts', value: '9' }
 * };
 * validateBid(gameState1, 'south', 'orderUp'); // Returns true
 *
 * @example
 * // First round bidding - passing
 * validateBid(gameState1, 'south', 'pass'); // Returns true
 *
 * @example
 * // Second round bidding - calling trump
 * const gameState2 = {
 *   gamePhase: 'ORDER_UP_ROUND2',
 *   currentPlayer: 'west',
 *   dealer: 'east',
 *   bids: ['pass', 'pass', 'pass', 'pass'],
 *   turnCard: { suit: 'hearts', value: '9' }
 * };
 * validateBid(gameState2, 'west', 'callTrump', 'spades'); // Returns true
 *
 * @example
 * // Invalid bid - wrong phase
 * try {
 *   validateBid({ gamePhase: 'PLAYING' }, 'south', 'orderUp');
 * } catch (error) {
 *   console.error(error); // Throws InvalidPhaseError
 * }
 *
 * @see GAME_PHASES For valid game phases
 * @see SUITS For valid suit values
 */
function validateBid(gameState, playerRole, decision, suit = null) {
  if (
    !gameState ||
    !playerRole ||
    !decision ||
    !PLAYER_ROLES.includes(playerRole)
  ) {
    logger.warn(
      { gameStateProvided: !!gameState, playerRole, decision, suit },
      "validateBid: Missing or invalid arguments.",
    );
    throw new ValidationError(
      "Internal error: Missing or invalid data for bid validation.",
    );
  }

  const { gamePhase, currentPlayer, turnCard, dealer, bids } = gameState; // Removed roundNumber as it's not used directly

  if (currentPlayer !== playerRole) {
    throw new NotPlayersTurnError(playerRole, currentPlayer);
  }

  // Round 1 Bidding
  if (gamePhase === GAME_PHASES.ORDER_UP_ROUND1) {
    if (decision !== "orderUp" && decision !== "pass") {
      throw new InvalidBidError(
        `Invalid decision '${decision}' for ${GAME_PHASES.ORDER_UP_ROUND1}.`,
      );
    }
    // Note: The logic for dealer being "forced" to pick up is typically handled by game flow,
    // not a simple validation rule preventing them from 'ordering up' themselves.
    // A dealer 'ordering up' in round 1 means they accept the turnCard.
    return true;
  }
  // Round 2 Bidding
  else if (gamePhase === GAME_PHASES.ORDER_UP_ROUND2) {
    if (decision !== "callTrump" && decision !== "pass") {
      throw new InvalidBidError(
        `Invalid decision '${decision}' for ${GAME_PHASES.ORDER_UP_ROUND2}.`,
      );
    }
    if (decision === "callTrump") {
      if (!suit || !Object.values(SUITS).includes(suit)) {
        throw new InvalidBidError(
          "Invalid suit provided for callTrump decision.",
        );
      }
      if (turnCard && suit === turnCard.suit) {
        throw new InvalidBidError(
          `Cannot call the suit that was turned down (${turnCard.suit}).`,
        );
      }
    }

    // "Stick the dealer" rule: if it's dealer's turn in round 2 and all others passed, dealer MUST call.
    // This validation enforces that "pass" is invalid in that specific state.
    if (decision === "pass" && playerRole === dealer) {
      const passesInRound2 = bids.filter(
        (b) => b.round === 2 && b.decision === "pass",
      ).length;
      // Check if all other players (PLAYER_ROLES.length - 1) have passed in round 2.
      // This implies it's the dealer's turn and they are the last one to bid in this round.
      if (passesInRound2 === PLAYER_ROLES.length - 1) {
        throw new InvalidBidError(
          "Dealer must call a suit in this situation (stick the dealer).",
        );
      }
    }
    return true;
  }
  // Not a valid bidding phase
  else {
    throw new InvalidPhaseError(
      `Cannot make bid decision during ${gamePhase} phase.`,
    );
  }
}

/**
 * Validates if the dealer's discard action is legal according to Euchre rules.
 * This function enforces the dealer's discard rules after they've picked up the turn card.
 *
 * @function validateDealerDiscard
 * @memberof module:validation
 * @param {Object} gameState - The current game state object.
 * @param {string} gameState.gamePhase - The current game phase (must be 'DEALER_DISCARD').
 * @param {string} gameState.currentPlayer - The role of the player whose turn it is (must be the dealer).
 * @param {string} gameState.dealer - The role of the dealer for the current hand.
 * @param {Object} gameState.turnCard - The turn card that was ordered up.
 * @param {string} playerRole - The role ('north', 'south', 'east', 'west') of the player attempting to discard.
 * @param {Object} cardToDiscard - The card the dealer intends to discard.
 * @param {string} cardToDiscard.id - Unique identifier for the card.
 * @param {string} cardToDiscard.suit - The suit of the card.
 * @param {string} cardToDiscard.value - The value of the card.
 * @param {Array<Object>} playerHand - The dealer's current hand (should contain exactly 6 cards including the turn card).
 * @returns {true} Returns true if the discard is valid.
 * @throws {ValidationError} If any required arguments are missing or invalid.
 * @throws {InvalidPhaseError} If discarding is attempted outside of the 'DEALER_DISCARD' phase.
 * @throws {NotPlayersTurnError} If it's not the specified player's turn.
 * @throws {CardNotInHandError} If the card to discard is not found in the player's hand.
 * @throws {InvalidDiscardError} If the discard is otherwise invalid (e.g., non-dealer attempts to discard).
 *
 * @example
 * // Valid discard by dealer
 * const gameState = {
 *   gamePhase: 'DEALER_DISCARD',
 *   currentPlayer: 'east',
 *   dealer: 'east',
 *   turnCard: { suit: 'hearts', value: '9' }
 * };
 * const hand = [
 *   { id: 'JH', suit: 'hearts', value: 'J' },
 *   { id: '9H', suit: 'hearts', value: '9' },
 *   { id: 'AS', suit: 'spades', value: 'A' },
 *   { id: 'KC', suit: 'clubs', value: 'K' },
 *   { id: 'QD', suit: 'diamonds', value: 'Q' },
 *   { id: '10S', suit: 'spades', value: '10' }
 * ];
 * validateDealerDiscard(gameState, 'east', hand[5], hand); // Returns true
 *
 * @example
 * // Invalid - not dealer's turn
 * try {
 *   validateDealerDiscard(gameState, 'north', hand[0], hand);
 * } catch (error) {
 *   console.error(error); // Throws NotPlayersTurnError
 * }
 *
 * @example
 * // Invalid - card not in hand
 * const invalidCard = { id: '2H', suit: 'hearts', value: '2' };
 * try {
 *   validateDealerDiscard(gameState, 'east', invalidCard, hand);
 * } catch (error) {
 *   console.error(error); // Throws CardNotInHandError
 * }
 *
 * @see GAME_PHASES For valid game phases
 * @see PLAYER_ROLES For valid player roles
 */
function validateDealerDiscard(
  gameState,
  playerRole,
  cardToDiscard,
  playerHand,
) {
  if (
    !gameState ||
    !playerRole ||
    !cardToDiscard ||
    !cardToDiscard.id ||
    !playerHand
  ) {
    logger.warn(
      {
        gameStateProvided: !!gameState,
        playerRole,
        cardToDiscardProvided: !!cardToDiscard,
        playerHandProvided: !!playerHand,
      },
      "validateDealerDiscard: Missing or invalid arguments.",
    );
    throw new ValidationError(
      "Internal error: Missing data for discard validation.",
    );
  }

  if (gameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
    throw new InvalidPhaseError(
      `Cannot discard card during ${gameState.gamePhase} phase.`,
    );
  }

  if (gameState.dealer !== playerRole) {
    throw new InvalidDiscardError(
      `Only the dealer (${gameState.dealer}) can discard. Player ${playerRole} attempted.`,
    );
  }

  if (gameState.currentPlayer !== playerRole) {
    // Ensure it's dealer's turn to discard
    throw new NotPlayersTurnError(playerRole, gameState.currentPlayer);
  }

  const cardInHand = playerHand.find((c) => c.id === cardToDiscard.id);
  if (!cardInHand) {
    throw new CardNotInHandError(
      `Card ${cardToDiscard.id} is not in dealer's hand to discard.`,
    );
  }

  // The check for playerHand.length !== 6 remains a logger.warn as per instructions,
  // as it's more of a state sanity check than a direct validation of the discard action itself.
  if (playerHand.length !== 6) {
    logger.warn(
      { playerRole, handSize: playerHand.length, gameId: gameState.gameId },
      "Dealer's hand does not have 6 cards at the point of discard validation.",
    );
  }

  return true; // If no errors were thrown, the discard is valid.
}

// Export all public functions
export {
  getEffectiveSuit,
  validatePlay,
  validateBid,
  validateDealerDiscard
};

// TODO: Add other validation functions as needed (e.g., isValidGoAlone)
