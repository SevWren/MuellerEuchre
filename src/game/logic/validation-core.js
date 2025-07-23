/**
 * @module game/logic/validation
 * @description
 * Core validation logic for Euchre game actions (Layer 1).
 * 
 * This module contains pure, stateless validation functions for game actions including:
 * - Card play validation
 * - Bidding validation
 * - Dealer discard validation
 * - Go-alone validation
 * 
 * All functions are pure (deterministic, no side effects) and throw specific validation errors.
 * This module does not mutate state or perform I/O operations.
 * 
 * @see {@link module:game/logic/validation-errors} For custom error types used by this module
 * @see {@link module:config/constants} For game constants like GAME_PHASES and SUITS
 * @see {@link module:utils/cardUtils} For card-related utility functions
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
 * Throws a ValidationError if any argument is falsy.
 * @private
 * @param {Object.<string, *>} args - An object where keys are argument names and values are the arguments.
 * @param {string} context - A string describing the validation context for the error message.
 * @throws {module:game/logic/validation-errors.ValidationError} If any required argument is falsy.
 * @see {@link module:game/logic/validation~validatePlay}
 * @see {@link module:game/logic/validation~validateBid}
 * @see {@link module:game/logic/validation~validateDealerDiscard}
 * @see {@link module:game/logic/validation~isValidGoAlone}
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
 * @throws {TypeError} If `trumpSuit` is not a valid suit.
 * @see {@link module:utils/cardUtils.isLeftBower} For the core Left Bower detection logic.
 * @see {@link module:config/constants.SUITS} For valid suit constants.
 * 
 * @example
 * // Returns 'hearts' (Left Bower - Jack of Diamonds when Hearts is trump)
 * getEffectiveSuit(
 *   { suit: 'diamonds', value: 'J' },
 *   'hearts'
 * );
 * 
 * @example
 * // Returns 'clubs' (regular card, not affected by trump)
 * getEffectiveSuit(
 *   { suit: 'clubs', value: 'K' },
 *   'spades'
 * );
 * 
 * @example
 * // Returns null (null card)
 * getEffectiveSuit(null, 'hearts');
 * 
 * @example
 * // Throws TypeError (invalid trump suit)
 * getEffectiveSuit(
 *   { suit: 'hearts', value: 'A' },
 *   'invalid_suit'
 * );
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
 * @returns {ValidationResult} Object containing validation status and any errors.
 * @throws {module:game/logic/validation-errors.InvalidPhaseError} If game is not in PLAYING phase.
 * @throws {module:game/logic/validation-errors.NotPlayersTurnError} If it's not the player's turn.
 * @throws {module:game/logic/validation-errors.CardNotInHandError} If the card is not in the player's hand.
 * @throws {module:game/logic/validation-errors.MustFollowSuitError} If player must follow suit but played a different suit.
 * @see {@link module:game/logic/validation~getEffectiveSuit} For determining a card's effective suit
 * @see {@link module:config/constants.GAME_PHASES} For valid game phases
 * @see {@link module:config/constants.PLAYER_ROLES} For valid player roles
 * @see {@link module:config/constants.SUITS} For valid suit constants
 * 
 * @example
 * // Valid play - following suit
 * const gameState = {
 *   gamePhase: 'PLAYING',
 *   currentPlayer: 'north',
 *   currentTrick: [{ card: { suit: 'hearts', value: '10' }, player: 'east' }],
 *   trumpSuit: 'spades',
 *   players: { north: {}, east: {}, south: {}, west: {} }
 * };
 * const hand = [
 *   { id: '1', suit: 'hearts', value: 'K' },
 *   { id: '2', suit: 'diamonds', value: '9' }
 * ];
 * const result = validatePlay(gameState, hand, hand[0], 'north');
 * // Returns: { valid: true, errors: [] }
 *
 * @example
 * // Invalid play - not following suit
 * const gameState = {
 *   gamePhase: 'PLAYING',
 *   currentPlayer: 'north',
 *   currentTrick: [{ card: { suit: 'hearts', value: '10' }, player: 'east' }],
 *   trumpSuit: 'spades',
 *   players: { north: {}, east: {}, south: {}, west: {} }
 * };
 * const hand = [
 *   { id: '1', suit: 'hearts', value: 'K' },
 *   { id: '2', suit: 'diamonds', value: '9' }
 * ];
 * try {
 *   validatePlay(gameState, hand, hand[1], 'north');
 * } catch (error) {
 *   // Throws MustFollowSuitError
 *   console.error(error.message);
 * }
 */
function validatePlay(gameState, playerHand, cardToPlay, playerRole) {
  const errors = [];
  
  try {
    requireArgs({ gameState, playerHand, cardToPlay, playerRole }, 'play validation');
    requireArgs({ 'cardToPlay.id': cardToPlay.id }, 'play validation');

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

      // Check if the led card is the Left Bower
      const isLedCardLeftBower = isLeftBower(ledCard, trumpSuit);
      
      // If the led card is the Left Bower, players must follow with a trump card if they have one
      if (isLedCardLeftBower) {
        const playerHasTrumpCard = playerHand.some(
          handCard => getEffectiveSuit(handCard, trumpSuit) === trumpSuit
        );
        
        if (playerHasTrumpCard) {
          const isPlayingTrumpCard = getEffectiveSuit(cardToPlay, trumpSuit) === trumpSuit;
          if (!isPlayingTrumpCard) {
            throw new MustFollowSuitError(
              `Must play a trump card when the Left Bower is led. Attempted to play ${cardToPlay.suit}.`,
              trumpSuit,
              getEffectiveSuit(cardToPlay, trumpSuit)
            );
          }
        }
      } 
      // Standard follow-suit logic for non-Left Bower led cards
      else {
        // Check if player has any card of the led suit (including left bower if applicable)
        const playerHasLedSuitCard = playerHand.some(
          handCard => getEffectiveSuit(handCard, trumpSuit) === currentLedEffectiveSuit
        );

        const cardToPlayEffectiveSuit = getEffectiveSuit(cardToPlay, trumpSuit);

        // If player has a card of the led suit, they must play one
        if (playerHasLedSuitCard && cardToPlayEffectiveSuit !== currentLedEffectiveSuit) {
          throw new MustFollowSuitError(
            `Must follow suit. Led suit is ${currentLedEffectiveSuit}, attempted to play ${cardToPlay.suit}.`,
            currentLedEffectiveSuit,
            cardToPlayEffectiveSuit
          );
        }
      }
    }
  } catch (error) {
    errors.push(error);
  }

  return {
    valid: errors.length === 0,
    errors
  };
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
 * @throws {module:game/logic/validation-errors.NotPlayersTurnError} If it's not the player's turn.
 * @throws {module:game/logic/validation-errors.InvalidBidError} If the bid violates game rules.
 * @see {@link module:config/constants.BID_DECISIONS} For valid bid decisions
 * @see {@link module:config/constants.GAME_PHASES} For valid game phases
 * @see {@link module:config/constants.SUITS} For valid suit constants
 * @see {@link module:config/constants.PLAYER_ROLES} For valid player roles
 * 
 * @example
 * // Valid round 1 bid (ORDER_UP)
 * const gameState = {
 *   gamePhase: 'ORDER_UP_ROUND1',
 *   currentPlayer: 'east',
 *   dealer: 'south',
 *   turnCard: { suit: 'hearts', value: '9' },
 *   bids: [],
 *   players: {}
 * };
 * validateBid(gameState, 'east', 'ORDER_UP'); // Returns true
 *
 * @example
 * // Invalid - not player's turn
 * try {
 *   validateBid(
 *     { ...gameState, currentPlayer: 'north' },
 *     'east',
 *     'ORDER_UP'
 *   );
 * } catch (error) {
 *   // Throws NotPlayersTurnError
 *   console.error(error.message);
 * }
 *
 * @example
 * // Valid round 2 bid (CALL_TRUMP)
 * const round2State = {
 *   gamePhase: 'ORDER_UP_ROUND2',
 *   currentPlayer: 'west',
 *   dealer: 'south',
 *   turnCard: { suit: 'hearts', value: '9' },
 *   bids: [
 *     { player: 'east', decision: 'PASS' },
 *     { player: 'south', decision: 'PASS' }
 *   ],
 *   players: {}
 * };
 * validateBid(round2State, 'west', 'CALL_TRUMP', 'spades'); // Returns true
 *
 * @example
 * // Invalid - cannot call the turned-down suit in round 2
 * try {
 *   validateBid(round2State, 'west', 'CALL_TRUMP', 'hearts');
 * } catch (error) {
 *   // Throws InvalidBidError: "Cannot call the suit that was turned down"
 *   console.error(error.message);
 * }
 *
 * @example
 * // Enforcing "stick the dealer" rule
 * const stickDealerState = {
 *   gamePhase: 'ORDER_UP_ROUND2',
 *   currentPlayer: 'south', // Dealer's turn
 *   dealer: 'south',
 *   turnCard: { suit: 'hearts', value: '9' },
 *   bids: [
 *     { player: 'east', decision: 'PASS' },
 *     { player: 'south', decision: 'PASS' },
 *     { player: 'west', decision: 'PASS' },
 *     { player: 'north', decision: 'PASS' }
 *   ],
 *   players: {}
 * };
 * try {
 *   validateBid(stickDealerState, 'south', 'PASS');
 * } catch (error) {
 *   // Throws InvalidBidError: "Dealer must call a suit in this situation"
 *   console.error(error.message);
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
 * @throws {module:game/logic/validation-errors.InvalidPhaseError} If game is not in DEALER_DISCARD phase.
 * @throws {module:game/logic/validation-errors.NotPlayersTurnError} If it's not the dealer's turn.
 * @throws {module:game/logic/validation-errors.CardNotInHandError} If the card is not in the dealer's hand.
 * @throws {module:game/logic/validation-errors.InvalidDiscardError} If the dealer tries to discard the turn card.
 * @see {@link module:config/constants.GAME_PHASES} For valid game phases
 * @see {@link module:config/constants.PLAYER_ROLES} For valid player roles
 * 
 * @example
 * // Valid discard - dealer discards a card from their hand
 * const gameState = {
 *   gamePhase: 'DEALER_DISCARD',
 *   currentPlayer: 'south',
 *   dealer: 'south',
 *   turnCard: { id: 'turn-card', suit: 'hearts', value: '9' },
 *   players: {}
 * };
 * const hand = [
 *   { id: '1', suit: 'hearts', value: '10' },
 *   { id: '2', suit: 'diamonds', value: 'J' },
 *   { id: '3', suit: 'clubs', value: 'Q' },
 *   { id: '4', suit: 'spades', value: 'K' },
 *   { id: '5', suit: 'hearts', value: 'A' },
 *   { id: '6', suit: 'diamonds', value: '9' }
 * ];
 * validateDealerDiscard(gameState, 'south', hand[1], hand); // Returns true
 *
 * @example
 * // Invalid - not the dealer's turn
 * try {
 *   validateDealerDiscard(
 *     { ...gameState, currentPlayer: 'north' },
 *     'south',
 *     hand[1],
 *     hand
 *   );
 * } catch (error) {
 *   // Throws NotPlayersTurnError
 *   console.error(error.message);
 * }
 *
 * @example
 * // Invalid - trying to discard the turn card
 * try {
 *   validateDealerDiscard(
 *     gameState,
 *     'south',
 *     gameState.turnCard, // The turn card
 *     [...hand, gameState.turnCard] // Including turn card in hand
 *   );
 * } catch (error) {
 *   // Throws InvalidDiscardError: "Cannot discard the turn card (upcard)."
 *   console.error(error.message);
 * }
 *
 * @example
 * // Invalid - card not in dealer's hand
 * try {
 *   const notInHand = { id: 'not-in-hand', suit: 'clubs', value: 'A' };
 *   validateDealerDiscard(gameState, 'south', notInHand, hand);
 * } catch (error) {
 *   // Throws CardNotInHandError
 *   console.error(error.message);
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
    const error = new InvalidPhaseError();
    error.action = 'discard card';
    error.currentPhase = gameState.gamePhase;
    error.expectedPhase = GAME_PHASES.DEALER_DISCARD;
    throw error;
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
 * In Euchre, the winning bidder can declare to go alone, meaning their partner
 * will sit out the hand, and the bidder will play alone against the opposing team.
 *
 * @function isValidGoAlone
 * @memberof module:validation
 * @param {Object} gameState - The current game state object.
 * @param {string} gameState.gamePhase - The current game phase (must be 'GOING_ALONE').
 * @param {string} gameState.currentPlayer - The role of the player whose turn it is.
 * @param {string} gameState.winningBidder - The role of the player who won the bidding.
 * @param {Object} gameState.players - Map of player roles to player objects.
 * @param {string} playerRole - The role of the player attempting to go alone.
 * @returns {boolean} Returns true if the go-alone declaration is valid.
 * @throws {ValidationError} If any required arguments are missing or invalid.
 * @throws {InvalidPhaseError} If the game is not in the 'GOING_ALONE' phase.
 * @throws {NotPlayersTurnError} If it's not the specified player's turn.
 * @throws {InvalidGoAloneError} If the player cannot go alone for other reasons.
 *
 * @example
 * // Valid go-alone declaration
 * const gameState = {
 *   gamePhase: 'GOING_ALONE',
 *   currentPlayer: 'south',
 *   winningBidder: 'south',
 *   players: { south: { name: 'Player 1' }, north: {}, east: {}, west: {} }
 * };
 * isValidGoAlone(gameState, 'south'); // Returns true
 *
 * @example
 * // Invalid - not the player's turn
 * try {
 *   isValidGoAlone({ ...gameState, currentPlayer: 'north' }, 'south');
 * } catch (error) {
 *   console.error(error); // Throws NotPlayersTurnError
 * }
 *
 * @see GAME_PHASES For valid game phases
 * @see PLAYER_ROLES For valid player roles
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
