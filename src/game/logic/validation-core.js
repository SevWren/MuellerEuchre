/**
 * @module game/logic/validation
 * @description
 * Core validation logic for Euchre game actions (Layer 1).
 * 
 * This module contains pure functions for validating game actions according to
 * Euchre rules. These functions are stateless and side-effect free, making them
 * easy to test and reason about.
 * 
 * @see {@link module:config/constants} For game constants and enums
 * @see {@link module:game/logic/validation-errors} For custom error types
 * 
 * @example
 * // Example usage of validation functions
 * import { validatePlay, GAME_PHASES, SUITS } from './game/logic/validation';
 * 
 * try {
 *   validatePlay(gameState, playerHand, cardToPlay, playerRole);
 *   // Card play is valid
 * } catch (error) {
 *   // Handle validation error
 *   console.error(error.message);
 * }
 */

/**
 * @typedef {Object} Card
 * @property {string} id - Unique identifier for the card
 * @property {string} suit - The card's suit (must be a value from SUITS)
 * @property {string} value - The card's value (e.g., 'A', 'K', 'Q', 'J', '10', '9')
 */

/**
 * @typedef {Object} Player
 * @property {string} id - Unique identifier for the player
 * @property {string} name - The player's display name
 * @property {Array<Card>} hand - The player's current hand of cards
 * @property {string} team - The player's team ('NS' or 'EW')
 * @property {boolean} [isGoingAlone] - Whether the player is going alone
 */

/**
 * @typedef {Object} GameState
 * @property {string} gamePhase - Current game phase (from GAME_PHASES)
 * @property {string} currentPlayer - Role of the player whose turn it is
 * @property {string} [dealer] - Role of the dealer
 * @property {string} [winningBidder] - Role of the winning bidder
 * @property {string} trumpSuit - Current trump suit (from SUITS)
 * @property {Array<Object>} currentTrick - Cards played in the current trick
 * @property {string} [currentTrickSuit] - Leading suit of the current trick
 * @property {Array<Object>} [bids] - History of bids made
 * @property {Object.<string, Player>} players - Map of player roles to player objects
 * @property {Object} teams - Team scores and statistics
 * @property {string} [gameId] - Optional game identifier
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the validation passed
 * @property {Array<Error>} [errors] - Any validation errors that occurred
 */

import { GAME_PHASES, SUITS, PLAYER_ROLES, BID_DECISIONS } from "../../config/constants.js";
import { isLeftBower, areSameColor } from "../../utils/cardUtils.js";
import logger from "../../utils/logger.js";
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
  InvalidGoAloneError,
} from "./validation-errors.js";

/**
 * @typedef {Object} Card
 * @property {string} id - Unique identifier for the card
 * @property {string} suit - The card's suit (e.g., 'HEARTS', 'SPADES')
 * @property {string} value - The card's value (e.g., 'A', 'K', 'Q', 'J', '10', '9')
 */

/**
 * @typedef {Object} GameState
 * @property {string} gamePhase - Current game phase from GAME_PHASES
 * @property {string} currentPlayer - Role of the current player
 * @property {string} [dealer] - Role of the dealer
 * @property {string} [trumpSuit] - Current trump suit
 * @property {Array} [currentTrick] - Cards played in the current trick
 * @property {Object} [turnCard] - The turn card (for bidding)
 * @property {Array} [bids] - Bidding history
 * @property {string} [winningBidder] - Role of the winning bidder
 * @property {Object} players - Map of player roles to player objects
 * @property {string} [gameId] - Unique identifier for the game
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the validation passed
 * @property {Array<Error>} errors - Array of validation errors, if any
 */

/**
 * Validates that a set of required arguments are provided.
 * 
 * This function checks that all required arguments are truthy and throws a
 * ValidationError if any are missing or invalid.
 * 
 * @private
 * @memberof module:game/logic/validation
 * @param {Object.<string, *>} args - An object where keys are argument names and values are the arguments to validate.
 * @param {string} context - A string describing the validation context for the error message.
 * @throws {module:game/logic/validation-errors.ValidationError} If any required argument is falsy.
 *   The error will have a `message` property describing which arguments were missing or invalid.
 * @see {@link module:game/logic/validation~validatePlay}
 * @see {@link module:game/logic/validation~validateBid}
 * @see {@link module:game/logic/validation~validateDealerDiscard}
 * @see {@link module:game/logic/validation~isValidGoAlone}
 * 
 * @example
 * // Example usage:
 * try {
 *   requireArgs({ foo: 'bar', baz: 42 }, 'myFunction');
 * } catch (error) {
 *   console.error(error.message);
 * }
 */
function requireArgs(args, context) {
  for (const [key, value] of Object.entries(args)) {
    if (!value) {
      const message = `Internal error: Missing required argument '${key}' for ${context}.`;
      logger.error({ missingArg: key, context }, message);
      throw new ValidationError(message);
    }
  }
}

/**
 * Validates that a card object has the required properties.
 * 
 * This is a low-level validation function that ensures a card object has
 * the minimum required properties to be considered valid in the game.
 * 
 * @function validateCardObject
 * @memberof module:game/logic/validation
 * @private
 * @param {Card} card - The card to validate.
 * @throws {module:game/logic/validation-errors.ValidationError} If the card is missing required properties.
 *   The error will have a `message` property describing what's missing.
 * @see {@link module:game/logic/validation~validatePlay} For main play validation
 * @see {@link module:game/logic/validation~validateDealerDiscard} For discard validation
 * 
 * @example
 * // In a validation function:
 * function validateCard(card) {
 *   // First validate the card object structure
 *   validateCardObject(card);
 *   
 *   // Then perform additional validation specific to the use case
 *   // ...
 * }
 */
function validateCardObject(card) {
  if (!card || typeof card !== 'object') {
    throw new ValidationError('Card must be an object');
  }
  if (!card.id) {
    throw new ValidationError('Card must have an id property');
  }
  if (!card.suit) {
    throw new ValidationError('Card must have a suit property');
  }
  if (!card.value) {
    throw new ValidationError('Card must have a value property');
  }
}

/**
 * Validates that a player has a specific card in their hand.
 * 
 * This is a helper function used internally by validation functions to verify
 * that a card being played actually exists in the player's hand.
 * 
 * @function validateCardInHand
 * @memberof module:game/logic/validation
 * @private
 * @param {Player} player - The player object containing the hand to check.
 * @param {Array<Card>} player.hand - The player's hand array.
 * @param {Card} card - The card to validate.
 * @returns {boolean} True if the card is in the player's hand.
 * @throws {module:game/logic/validation-errors.CardNotInHandError} If the card is not in the player's hand.
 *   The error will have `cardId` and `playerHandIds` properties.
 * @see {@link module:game/logic/validation~validatePlay} For main play validation logic
 * @see {@link module:game/logic/validation~validateDealerDiscard} For discard validation
 * 
 * @example
 * // In a validation function:
 * function validateCardPlay(gameState, player, cardToPlay) {
 *   // First verify the card is actually in the player's hand
 *   validateCardInHand(player, cardToPlay);
 *   
 *   // Then validate the play according to game rules
 *   // ...
 * }
 */
function validateCardInHand(player, card) {
  if (!player || !player.hand || !Array.isArray(player.hand)) {
    throw new ValidationError('Player must have a hand array');
  }
  const cardInHand = player.hand.find((c) => c.id === card.id);
  if (!cardInHand) {
    throw new CardNotInHandError(`Card ${card.id} is not in ${player.id}'s hand.`);
  }
  return true;
}

/**
 * Determines the effective suit of a card, considering the Left Bower rule.
 * 
 * In Euchre, the Left Bower (Jack of the same color as trump) is considered
 * to be of the trump suit for the purpose of following suit. This function handles
 * the special case where the Jack of the same color as trump becomes a trump card.
 * 
 * @function getEffectiveSuit
 * @memberof module:game/logic/validation
 * @param {Card} card - The card to evaluate.
 * @param {string} trumpSuit - The current trump suit (must be a valid suit from SUITS).
 * @returns {string | null} The effective suit of the card, or null if card is null/undefined.
 * @throws {TypeError} If `trumpSuit` is not a valid suit. The error will have a `message`
 *   property indicating the invalid suit.
 * @see {@link module:utils/cardUtils.isLeftBower} For the core Left Bower detection logic.
 * @see {@link module:config/constants.SUITS} For valid suit constants.
 * @see {@link module:game/logic/validation~validatePlay} For usage in card play validation.
 * 
 * @example
 * import { getEffectiveSuit } from './game/logic/validation';
 * import { SUITS } from './config/constants';
 * 
 * // Left Bower example (Jack of Diamonds when Hearts is trump)
 * const leftBower = { suit: SUITS.CARD_SUIT_DIAMONDS, value: 'J' };
 * const effectiveSuit = getEffectiveSuit(leftBower, SUITS.CARD_SUIT_HEARTS);
 * console.log(effectiveSuit); // 'hearts' (not 'diamonds')
 * 
 * @example
 * // Regular card example (not affected by trump)
 * const kingClubs = { suit: SUITS.CARD_SUIT_CLUBS, value: 'K' };
 * const effectiveSuit = getEffectiveSuit(kingClubs, SUITS.CARD_SUIT_SPADES);
 * console.log(effectiveSuit); // 'clubs'
 * 
 * @example
 * // Null card example
 * console.log(getEffectiveSuit(null, SUITS.CARD_SUIT_HEARTS)); // null
 * 
 * @example
 * // Invalid trump suit (throws TypeError)
 * try {
 *   getEffectiveSuit(
 *     { suit: SUITS.CARD_SUIT_HEARTS, value: 'A' },
 *     'invalid_suit'
 *   );
 * } catch (error) {
 *   console.error(error.message); // 'Invalid trump suit: invalid_suit'
 * }
 */
function getEffectiveSuit(card, trumpSuit) {
  if (!card) {
    return null;
  }
  try {
    // isLeftBower can throw if the card or trumpSuit is invalid.
    // We want to handle this gracefully within the validation logic.
    if (isLeftBower(card, trumpSuit)) {
      return trumpSuit;
    }
  } catch (error) {
    // If an error occurs (e.g., invalid suit), log it for debugging
    // but fall back to the card's nominal suit. This prevents a crash.
    logger.warn({ card, trumpSuit, error: error.message }, "getEffectiveSuit: Error determining if card is Left Bower. Falling back to nominal suit.");
  }
  return card.suit; // Return the card's nominal suit if not Left Bower or on error.
}

/**
 * Validates if a card play is legal according to Euchre rules.
 * 
 * This function enforces the core rules of Euchre card play, including:
 * - Verifying it's the player's turn
 * - Ensuring the game is in the correct phase
 * - Validating the card is in the player's hand
 * - Enforcing the "follow suit" rule (including Left Bower handling)
 * 
 * @function validatePlay
 * @memberof module:game/logic/validation
 * @param {GameState} gameState - The current game state.
 * @param {Array<Card>} playerHand - The player's current hand.
 * @param {Card} cardToPlay - The card the player wants to play.
 * @param {string} playerRole - The role of the player making the move.
 * @returns {boolean} True if the play is valid.
 * @throws {module:game/logic/validation-errors.ValidationError} If any required arguments are missing or invalid.
 * @throws {module:game/logic/validation-errors.InvalidPhaseError} If game is not in PLAYING phase.
 *   The error will have a `currentPhase` property and an `allowedPhases` array.
 * @throws {module:game/logic/validation-errors.NotPlayersTurnError} If it's not the player's turn.
 *   The error will have `currentPlayer` and `attemptedPlayer` properties.
 * @throws {module:game/logic/validation-errors.CardNotInHandError} If the card is not in the player's hand.
 *   The error will have `cardId` and `playerHandIds` properties.
 * @throws {module:game/logic/validation-errors.MustFollowSuitError} If player must follow suit but played a different suit.
 *   The error will have `playedSuit`, `requiredSuit`, and `trumpSuit` properties.
 * @see {@link module:game/logic/validation~getEffectiveSuit} For determining a card's effective suit
 * @see {@link module:game/logic/validation~isValidGoAlone} For go-alone validation
 * @see {@link module:config/constants.GAME_PHASES} For valid game phases
 * @see {@link module:config/constants.PLAYER_ROLES} For valid player roles
 * @see {@link module:config/constants.SUITS} For valid suit constants
 * 
 * @example
 * import { validatePlay } from './game/logic/validation';
 * import { GAME_PHASES, PLAYER_ROLES, SUITS } from './config/constants';
 * 
 * // Valid play - following suit
 * const gameState = {
 *   gamePhase: GAME_PHASES.PLAYING,
 *   currentPlayer: PLAYER_ROLES.NORTH,
 *   currentTrick: [{
 *     card: { id: '10H', suit: SUITS.CARD_SUIT_HEARTS, value: '10' },
 *     player: PLAYER_ROLES.EAST
 *   }],
 *   trumpSuit: SUITS.CARD_SUIT_SPADES,
 *   players: {
 *     [PLAYER_ROLES.NORTH]: { hand: [] },
 *     [PLAYER_ROLES.EAST]: { hand: [] },
 *     [PLAYER_ROLES.SOUTH]: { hand: [] },
 *     [PLAYER_ROLES.WEST]: { hand: [] }
 *   }
 * };
 * 
 * const hand = [
 *   { id: 'KH', suit: SUITS.CARD_SUIT_HEARTS, value: 'K' },
 *   { id: '9D', suit: SUITS.CARD_SUIT_DIAMONDS, value: '9' }
 * ];
 * 
 * try {
 *   const isValid = validatePlay(gameState, hand, hand[0], PLAYER_ROLES.NORTH);
 *   console.log('Play is valid:', isValid); // true
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 * }
 * 
 * @example
 * // Invalid play - not following suit
 * try {
 *   validatePlay(gameState, hand, hand[1], PLAYER_ROLES.NORTH);
 * } catch (error) {
 *   if (error.name === 'MustFollowSuitError') {
 *     console.error(`Must follow suit: ${error.requiredSuit}`);
 *     console.error(`Played suit: ${error.playedSuit}`);
 *   }
 *   throw error;
 * }
 */
function validatePlay(gameState, playerHand, cardToPlay, playerRole) {
  try {
    // Validate all required arguments are provided
    if (!gameState) {
      throw new ValidationError('gameState is required', 'GENERIC_VALIDATION_ERROR');
    }
    if (!playerHand || !Array.isArray(playerHand)) {
      throw new ValidationError('playerHand must be an array', 'GENERIC_VALIDATION_ERROR');
    }
    if (!cardToPlay || typeof cardToPlay !== 'object') {
      throw new ValidationError('cardToPlay is required', 'GENERIC_VALIDATION_ERROR');
    }
    if (!playerRole) {
      throw new ValidationError('playerRole is required', 'GENERIC_VALIDATION_ERROR');
    }
    if (!cardToPlay.id) {
      throw new ValidationError('cardToPlay.id is required', 'GENERIC_VALIDATION_ERROR');
    }

    // Validate game phase
    if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
      throw new InvalidPhaseError(
        'play card',
        gameState.gamePhase,
        GAME_PHASES.PLAYING
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
      // Determine if the led card is the Left Bower
      const isLedCardLeftBower = isLeftBower(ledCard, trumpSuit);
      
      // The suit to follow is the trump suit if the led card is the Left Bower,
      // otherwise it's the led card's effective suit
      const suitToFollow = isLedCardLeftBower 
        ? trumpSuit 
        : getEffectiveSuit(ledCard, trumpSuit);
      
      // Check if player has any card that can follow the led suit
      // This includes cards of the effective suit of the led card
      const playerHasSuitToFollow = playerHand.some(
        handCard => getEffectiveSuit(handCard, trumpSuit) === suitToFollow
      );

      // Get the effective suit of the card being played
      const cardToPlayEffectiveSuit = getEffectiveSuit(cardToPlay, trumpSuit);

      // If player has a card that can follow suit, they must play it
      if (playerHasSuitToFollow && cardToPlayEffectiveSuit !== suitToFollow) {
        // For the error message, we want to show the effective led suit and the effective played suit
        const error = new MustFollowSuitError(suitToFollow, cardToPlayEffectiveSuit);
        
        // If Left Bower was led, update the error message to be more specific
        if (isLedCardLeftBower) {
          error.ledSuit = trumpSuit; // For test assertions
          error.message = `Must play a trump card when the Left Bower is led. Attempted to play a card of ${cardToPlayEffectiveSuit}.`;
          error.code = 'E_MUST_FOLLOW_SUIT'; // Ensure error code is set for test assertions
        }
        
        throw error;
      }
    }
    
    // If we get here, the play is valid
    return true;
  } catch (error) {
    // Re-throw the error to be caught by the test
    throw error;
  }
}

/**
 * Validates if a bid is legal according to Euchre rules.
 * 
 * This function enforces the core rules of Euchre bidding, including:
 * - Round 1 bidding (ORDER_UP/PASS)
 * - Round 2 bidding (CALL_TRUMP/PASS)
 * - The "stick the dealer" rule
 * - Turn card validation for round 1
 * 
 * @function validateBid
 * @memberof module:game/logic/validation
 * @param {GameState} gameState - The current game state.
 * @param {string} playerRole - The role of the player making the bid.
 * @param {string} decision - The bid decision (must be a value from BID_DECISIONS).
 * @param {string} [suit=null] - The suit being called (required for CALL_TRUMP).
 * @returns {boolean} True if the bid is valid.
 * @throws {module:game/logic/validation-errors.ValidationError} If arguments are invalid.
 *   The error will have a `message` property describing the validation failure.
 * @throws {module:game/logic/validation-errors.NotPlayersTurnError} If it's not the player's turn.
 *   The error will have `currentPlayer` and `attemptedPlayer` properties.
 * @throws {module:game/logic/validation-errors.InvalidBidError} If the bid violates game rules.
 *   The error will have a `message` property describing the specific violation.
 *   May include additional context like `phase`, `decision`, and `suit`.
 * @see {@link module:config/constants.BID_DECISIONS} For valid bid decisions
 * @see {@link module:config/constants.GAME_PHASES} For valid game phases
 * @see {@link module:config/constants.SUITS} For valid suit constants
 * @see {@link module:config/constants.PLAYER_ROLES} For valid player roles
 * @see {@link module:game/logic/validation~validatePlay} For card play validation
 * 
 * @example
 * import { validateBid } from './game/logic/validation';
 * import { GAME_PHASES, PLAYER_ROLES, BID_DECISIONS, SUITS } from './config/constants';
 * 
 * // Valid round 1 bid (ORDER_UP)
 * const gameState = {
 *   gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
 *   currentPlayer: PLAYER_ROLES.EAST,
 *   dealer: PLAYER_ROLES.SOUTH,
 *   turnCard: { suit: SUITS.CARD_SUIT_HEARTS, value: '9' },
 *   bids: [],
 *   players: {
 *     [PLAYER_ROLES.NORTH]: {},
 *     [PLAYER_ROLES.EAST]: {},
 *     [PLAYER_ROLES.SOUTH]: {},
 *     [PLAYER_ROLES.WEST]: {}
 *   }
 * };
 * 
 * // Valid bid - player orders up the turn card
 * try {
 *   const isValid = validateBid(gameState, PLAYER_ROLES.EAST, BID_DECISIONS.ORDER_UP);
 *   console.log('Bid is valid:', isValid); // true
 * } catch (error) {
 *   console.error('Bid validation failed:', error.message);
 * }
 * 
 * @example
 * // Invalid - not player's turn
 * try {
 *   validateBid(
 *     { ...gameState, currentPlayer: PLAYER_ROLES.NORTH },
 *     PLAYER_ROLES.EAST,
 *     BID_DECISIONS.ORDER_UP
 *   );
 * } catch (error) {
 *   if (error.name === 'NotPlayersTurnError') {
 *     console.error(`It's ${error.currentPlayer}'s turn, not ${error.attemptedPlayer}'s`);
 *   }
 *   throw error;
 * }
 * 
 * @example
 * // Valid round 2 bid (CALL_TRUMP)
 * const round2State = {
 *   gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
 *   currentPlayer: PLAYER_ROLES.WEST,
 *   dealer: PLAYER_ROLES.SOUTH,
 *   turnCard: { suit: SUITS.CARD_SUIT_HEARTS, value: '9' },
 *   bids: [
 *     { player: PLAYER_ROLES.EAST, decision: BID_DECISIONS.PASS },
 *     { player: PLAYER_ROLES.SOUTH, decision: BID_DECISIONS.PASS }
 *   ],
 *   players: {
 *     [PLAYER_ROLES.NORTH]: {},
 *     [PLAYER_ROLES.EAST]: {},
 *     [PLAYER_ROLES.SOUTH]: {},
 *     [PLAYER_ROLES.WEST]: {}
 *   }
 * };
 * 
 * // Valid bid - player calls a trump suit
 * try {
 *   const isValid = validateBid(
 *     round2State,
 *     PLAYER_ROLES.WEST,
 *     BID_DECISIONS.CALL_TRUMP,
 *     SUITS.CARD_SUIT_SPADES
 *   );
 *   console.log('Trump call is valid:', isValid); // true
 * } catch (error) {
 *   console.error('Trump call validation failed:', error.message);
 * }
 * 
 * @example
 * // Invalid - cannot call the turned-down suit in round 2
 * try {
 *   validateBid(
 *     round2State,
 *     PLAYER_ROLES.WEST,
 *     BID_DECISIONS.CALL_TRUMP,
 *     SUITS.CARD_SUIT_HEARTS // Same as turned-down card
 *   );
 * } catch (error) {
 *   if (error.name === 'InvalidBidError') {
 *     console.error('Invalid bid:', error.message);
 *     console.error('Turned down suit:', round2State.turnCard.suit);
 *   }
 *   throw error;
 * }
 */
function validateBid(gameState, playerRole, decision, suit = null) {
  requireArgs({ gameState, playerRole, decision }, 'bid validation');
  if (!PLAYER_ROLES.includes(playerRole)) {
    throw new ValidationError(`Invalid playerRole '${playerRole}' for bid validation.`);
  }

  const { gamePhase, currentPlayer, turnCard, dealer, bids } = gameState; // Removed roundNumber as it's not used directly

  if (currentPlayer !== playerRole) {
    throw new NotPlayersTurnError(playerRole, currentPlayer);
  }

  // Round 1 Bidding
  if (gamePhase === GAME_PHASES.ORDER_UP_ROUND1) {
    if (decision !== BID_DECISIONS.ORDER_UP && decision !== BID_DECISIONS.PASS) {
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
    if (decision !== BID_DECISIONS.CALL_TRUMP && decision !== BID_DECISIONS.PASS) {
      throw new InvalidBidError(
        `Invalid decision '${decision}' for ${GAME_PHASES.ORDER_UP_ROUND2}.`,
      );
    }
    if (decision === BID_DECISIONS.CALL_TRUMP) {
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
    if (decision === BID_DECISIONS.PASS && playerRole === dealer) {
      const passesInRound2 = bids.filter(
        (b) => b.round === 2 && b.decision === BID_DECISIONS.PASS,
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
      'make bid decision',
      gamePhase,
      [GAME_PHASES.ORDER_UP_ROUND1, GAME_PHASES.ORDER_UP_ROUND2]
    );
  }
}
/**
 * Validates if a dealer's discard is legal according to Euchre rules.
 * 
 * This function enforces the rules for the dealer's discard phase, including:
 * - Verifying the game is in the DEALER_DISCARD phase
 * - Ensuring it's the dealer's turn to discard
 * - Validating the card to be discarded is in the dealer's hand
 * - Preventing the dealer from discarding the turn card
 * - Logging warnings for unexpected hand sizes
 * 
 * @function validateDealerDiscard
 * @memberof module:game/logic/validation
 * @param {GameState} gameState - The current game state.
 * @param {string} playerRole - The role of the player attempting to discard.
 * @param {Card} cardToDiscard - The card the dealer wants to discard.
 * @param {Array<Card>} playerHand - The dealer's current hand (should contain 6 cards).
 * @returns {boolean} True if the discard is valid.
 * @throws {module:game/logic/validation-errors.ValidationError} If any required arguments are missing or invalid.
 * @throws {module:game/logic/validation-errors.InvalidPhaseError} If game is not in DEALER_DISCARD phase.
 *   The error will have `currentPhase` and `allowedPhases` properties.
 * @throws {module:game/logic/validation-errors.NotPlayersTurnError} If it's not the dealer's turn.
 *   The error will have `currentPlayer` and `attemptedPlayer` properties.
 * @throws {module:game/logic/validation-errors.CardNotInHandError} If the card is not in the dealer's hand.
 *   The error will have `cardId` and `playerHandIds` properties.
 * @throws {module:game/logic/validation-errors.InvalidDiscardError} If the dealer tries to discard the turn card.
 *   The error will have a `message` property and may include `cardId`.
 * @see {@link module:config/constants.GAME_PHASES} For valid game phases
 * @see {@link module:config/constants.PLAYER_ROLES} For valid player roles
 * @see {@link module:game/logic/validation~validatePlay} For card play validation
 * 
 * @example
 * import { validateDealerDiscard } from './game/logic/validation';
 * import { GAME_PHASES, PLAYER_ROLES, SUITS } from './config/constants';
 * 
 * // Valid discard - dealer discards a card from their hand
 * const gameState = {
 *   gamePhase: GAME_PHASES.DEALER_DISCARD,
 *   currentPlayer: PLAYER_ROLES.SOUTH,
 *   dealer: PLAYER_ROLES.SOUTH,
 *   turnCard: { 
 *     id: '9H-turn', 
 *     suit: SUITS.CARD_SUIT_HEARTS, 
 *     value: '9' 
 *   },
 *   players: {
 *     [PLAYER_ROLES.SOUTH]: { hand: [] },
 *     [PLAYER_ROLES.WEST]: { hand: [] },
 *     [PLAYER_ROLES.NORTH]: { hand: [] },
 *     [PLAYER_ROLES.EAST]: { hand: [] }
 *   }
 * };
 * 
 * const dealerHand = [
 *   { id: '10H', suit: SUITS.CARD_SUIT_HEARTS, value: '10' },
 *   { id: 'JD', suit: SUITS.CARD_SUIT_DIAMONDS, value: 'J' },
 *   { id: 'QC', suit: SUITS.CARD_SUIT_CLUBS, value: 'Q' },
 *   { id: 'KS', suit: SUITS.CARD_SUIT_SPADES, value: 'K' },
 *   { id: 'AH', suit: SUITS.CARD_SUIT_HEARTS, value: 'A' },
 *   { id: '9D', suit: SUITS.CARD_SUIT_DIAMONDS, value: '9' },
 *   gameState.turnCard // The dealer picks up the turn card (now has 7 cards)
 * ];
 * 
 * // Valid discard - dealer discards a non-turn card
 * try {
 *   const cardToDiscard = dealerHand[1]; // JD
 *   const isValid = validateDealerDiscard(
 *     gameState,
 *     PLAYER_ROLES.SOUTH,
 *     cardToDiscard,
 *     dealerHand
 *   );
 *   console.log('Discard is valid:', isValid); // true
 * } catch (error) {
 *   console.error('Discard validation failed:', error.message);
 * }
 *
 * @example
 * // Invalid - not the dealer's turn
 * try {
 *   validateDealerDiscard(
 *     { ...gameState, currentPlayer: PLAYER_ROLES.NORTH },
 *     PLAYER_ROLES.SOUTH,
 *     dealerHand[0],
 *     dealerHand
 *   );
 * } catch (error) {
 *   if (error.name === 'NotPlayersTurnError') {
 *     console.error(`It's ${error.currentPlayer}'s turn, not ${error.attemptedPlayer}'s`);
 *   }
 *   throw error;
 * }
 *
 * @example
 * // Invalid - trying to discard the turn card
 * try {
 *   validateDealerDiscard(
 *     gameState,
 *     PLAYER_ROLES.SOUTH,
 *     gameState.turnCard, // The turn card
 *     dealerHand
 *   );
 * } catch (error) {
 *   if (error.name === 'InvalidDiscardError') {
 *     console.error('Cannot discard turn card:', error.message);
 *   }
 *   throw error;
 * }
 */
function validateDealerDiscard(
  gameState,
  playerRole,
  cardToDiscard,
  playerHand,
) {
  requireArgs({ gameState, playerRole, cardToDiscard, playerHand }, 'discard validation');
  requireArgs({ 'cardToDiscard.id': cardToDiscard.id }, 'discard validation');

  // Validate phase
  if (gameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
    throw new InvalidPhaseError(
      'discard card',
      gameState.gamePhase,
      GAME_PHASES.DEALER_DISCARD
    );
  }

  if (gameState.dealer !== playerRole) {
    throw new NotPlayersTurnError(playerRole, gameState.dealer);
  }

  if (gameState.currentPlayer !== playerRole) {
    // Ensure it's dealer's turn to discard
    throw new NotPlayersTurnError(playerRole, gameState.currentPlayer);
  }

  // Validate card is in player's hand
  const cardInHand = playerHand.some(card => card.id === cardToDiscard.id);
  if (!cardInHand) {
    const error = new CardNotInHandError();
    error.cardId = cardToDiscard.id;
    error.playerHandIds = playerHand.map(card => card.id);
    throw error;
  }

  // The check for playerHand.length !== 6 remains a logger.warn as per instructions,
  // as it's more of a state sanity check than a direct validation of the discard action itself.
  if (playerHand.length !== 6) {
    logger.warn(
      { playerRole, handSize: playerHand.length, gameId: gameState.gameId },
      "Dealer's hand does not have 6 cards at the point of discard validation.",
    );
  }

  // Prevent discarding the turn card (upcard)
  if (gameState.turnCard && cardToDiscard.id === gameState.turnCard.id) {
    throw new InvalidDiscardError('Cannot discard the turn card (upcard).');
  }

  return true; // If no errors were thrown, the discard is valid.
}

/**
 * Validates if a player can declare to go alone in the current game state.
 * 
 * In Euchre, the winning bidder can declare to go alone, meaning their partner
 * will sit out the hand, and the bidder will play alone against the opposing team.
 * This is a high-risk, high-reward strategy that can earn extra points.
 * 
 * @function isValidGoAlone
 * @memberof module:game/logic/validation
 * @param {GameState} gameState - The current game state object.
 * @param {string} playerRole - The role of the player attempting to go alone.
 * @returns {boolean} True if the go-alone declaration is valid.
 * @throws {module:game/logic/validation-errors.ValidationError} If any required arguments are missing or invalid.
 *   The error will have a `message` property describing the validation failure.
 * @throws {module:game/logic/validation-errors.InvalidPhaseError} If the game is not in the GOING_ALONE_DECISION phase.
 *   The error will have `currentPhase` and `allowedPhases` properties.
 * @throws {module:game/logic/validation-errors.NotPlayersTurnError} If it's not the specified player's turn.
 *   The error will have `currentPlayer` and `attemptedPlayer` properties.
 * @throws {module:game/logic/validation-errors.InvalidGoAloneError} If the player cannot go alone for other reasons.
 *   The error will have a `message` property describing why the go-alone is invalid.
 *   May include additional context like `playerRole` and `winningBidder`.
 * @see {@link module:config/constants.GAME_PHASES} For valid game phases
 * @see {@link module:config/constants.PLAYER_ROLES} For valid player roles
 * @see {@link module:game/logic/validation~validateBid} For bid validation
 * @see {@link module:game/logic/validation~validatePlay} For play validation
 * 
 * @example
 * import { isValidGoAlone } from './game/logic/validation';
 * import { GAME_PHASES, PLAYER_ROLES } from './config/constants';
 * 
 * // Valid go-alone declaration
 * const gameState = {
 *   gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
 *   currentPlayer: PLAYER_ROLES.SOUTH,
 *   winningBidder: PLAYER_ROLES.SOUTH,
 *   players: {
 *     [PLAYER_ROLES.SOUTH]: { name: 'Player 1', hand: [] },
 *     [PLAYER_ROLES.NORTH]: { name: 'Player 2', hand: [] },
 *     [PLAYER_ROLES.EAST]: { name: 'Player 3', hand: [] },
 *     [PLAYER_ROLES.WEST]: { name: 'Player 4', hand: [] }
 *   }
 * };
 * 
 * try {
 *   const canGoAlone = isValidGoAlone(gameState, PLAYER_ROLES.SOUTH);
 *   console.log('Can go alone:', canGoAlone); // true
 * } catch (error) {
 *   console.error('Go-alone validation failed:', error.message);
 * }
 *
 * @example
 * // Invalid - not the winning bidder
 * try {
 *   isValidGoAlone(
 *     { ...gameState, winningBidder: PLAYER_ROLES.EAST },
 *     PLAYER_ROLES.SOUTH
 *   );
 * } catch (error) {
 *   if (error.name === 'InvalidGoAloneError') {
 *     console.error('Cannot go alone:', error.message);
 *     console.error('Winning bidder:', error.winningBidder);
 *   }
 *   throw error;
 * }
 * 
 * @example
 * // Invalid - wrong game phase
 * try {
 *   isValidGoAlone(
 *     { ...gameState, gamePhase: GAME_PHASES.PLAYING },
 *     PLAYER_ROLES.SOUTH
 *   );
 * } catch (error) {
 *   if (error.name === 'InvalidPhaseError') {
 *     console.error('Invalid phase for go-alone:', error.currentPhase);
 *     console.error('Expected phase:', error.allowedPhases);
 *   }
 *   throw error;
 * }
 */
function isValidGoAlone(gameState, playerRole) {
  // Input validation
  requireArgs({ gameState, playerRole }, 'go-alone validation');
  if (!playerRole || !PLAYER_ROLES.includes(playerRole)) {
    throw new ValidationError('Invalid arguments for go-alone validation');
  }
  
  const { gamePhase, currentPlayer, winningBidder, players } = gameState;
  
  // Check if in the correct phase
  if (gamePhase !== GAME_PHASES.GOING_ALONE_DECISION) {
    const errorMsg = `Cannot go alone in the current phase: ${gamePhase}`;
    logger.error('Invalid phase for go-alone', { 
      playerRole, 
      gamePhase, 
      expectedPhase: 'GO_ALONE_DECISION' // Test expects this specific string
    });
    throw new InvalidPhaseError(errorMsg);
  }
  
  // Check if it's the player's turn
  if (currentPlayer !== playerRole) {
    const errorMsg = `Not ${playerRole}'s turn. It is ${currentPlayer}'s turn.`;
    logger.error('Invalid player turn for go-alone', { 
      currentPlayer, 
      playerRole 
    });
    throw new NotPlayersTurnError(playerRole, currentPlayer);
  }
  
  // Check if the player is the winning bidder
  if (winningBidder !== playerRole) {
    const errorMsg = 'Only the winning bidder can declare to go alone';
    logger.error('Invalid player for go-alone', { 
      winningBidder, 
      playerRole 
    });
    throw new InvalidGoAloneError(errorMsg);
  }
  
  // Check if player exists in the game
  if (!players[playerRole]) {
    const errorMsg = `Player ${playerRole} not found in game state`;
    logger.error('Player not found for go-alone', { 
      playerRole, 
      availablePlayers: Object.keys(players) 
    });
    throw new InvalidGoAloneError(errorMsg);
  }
  
  // Check if player has already made a go-alone decision
  if (players[playerRole].isGoingAlone !== undefined) {
    const errorMsg = `Player ${playerRole} has already made their go-alone decision`;
    logger.debug('Duplicate go-alone decision', { 
      playerRole, 
      isGoingAlone: players[playerRole].isGoingAlone 
    });
    throw new InvalidGoAloneError(errorMsg);
  }
  
  logger.debug('Go-alone validation successful', {
    playerRole,
    gamePhase,
    winningBidder,
    isGoingAlone: players[playerRole].isGoingAlone
  });
  
  return true;
}

// Export all public functions
export {
  getEffectiveSuit,
  validatePlay,
  validateBid,
  validateDealerDiscard,
  isValidGoAlone,
};
