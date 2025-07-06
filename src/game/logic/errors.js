// filepath: src/game/logic/errors.js
/**
 * @module game/logic/errors
 * @description
 * Custom error classes for game logic validation.
 * These errors are used throughout the game to provide specific error information
 * when validation or game rules are violated.
 *
 * All errors extend the base {@link ValidationError} class and include
 * additional context specific to the error condition.
 *
 * @example
 * // Basic usage
 * if (!isValidPlay(card, hand, gameState)) {
 *   throw new InvalidPlayError('Cannot play this card now');
 * }
 *
 * @see ValidationError Base class for all validation errors
 */

/**
 * Base class for all validation-related errors in the game.
 * Provides a consistent interface for error handling and extends the native Error class.
 *
 * @class ValidationError
 * @extends Error
 * @param {string} message - Human-readable description of the error
 * @property {string} name - The error name ('ValidationError')
 * @property {string} message - The error message (inherited from Error)
 * @property {string} [stack] - The stack trace (inherited from Error)
 *
 * @example
 * // Creating a validation error
 * throw new ValidationError('Invalid game state');
 *
 * @example
 * // Checking error type
 * try {
 *   validateGameState(state);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Validation failed:', error.message);
 *   }
 * }
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Thrown when a player attempts to declare 'go alone' in an invalid context.
 * This error indicates that the player cannot declare to go alone, either because
 * they are not the winning bidder, it's not the correct phase, or they've already
 * made their decision.
 *
 * @class InvalidGoAloneError
 * @extends ValidationError
 * @param {string} message - Description of why the go-alone declaration is invalid
 * @property {string} name - The error name ('InvalidGoAloneError')
 *
 * @example
 * // Throwing the error - player not the winning bidder
 * if (playerRole !== winningBidder) {
 *   throw new InvalidGoAloneError('Only the winning bidder can declare to go alone');
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   declareGoAlone(gameState, playerRole);
 * } catch (error) {
 *   if (error instanceof InvalidGoAloneError) {
 *     console.error('Cannot go alone:', error.message);
 *     // Show error to player
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 */
export class InvalidGoAloneError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidGoAloneError';
  }
}

/**
 * Thrown when a player attempts to take an action when it's not their turn.
 *
 * @class NotPlayersTurnError
 * @extends ValidationError
 * @param {string} playerRole - The role of the player who attempted the action
 * @param {string} currentPlayer - The role of the player whose turn it actually is
 * @property {string} name - The error name ('NotPlayersTurnError')
 * @property {string} playerRole - The role that attempted the action
 * @property {string} currentPlayer - The role whose turn it actually is
 *
 * @example
 * // Throwing the error
 * if (currentPlayer !== playerRole) {
 *   throw new NotPlayersTurnError(playerRole, currentPlayer);
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   makeMove(gameState, playerRole, move);
 * } catch (error) {
 *   if (error instanceof NotPlayersTurnError) {
 *     console.error(`It's ${error.currentPlayer}'s turn, not ${error.playerRole}'s`);
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 */
export class NotPlayersTurnError extends ValidationError {
  constructor(playerRole, currentPlayer) {
    super(`Not ${playerRole}'s turn. It is ${currentPlayer}'s turn.`);
    this.name = "NotPlayersTurnError";
    this.playerRole = playerRole;
    this.currentPlayer = currentPlayer;
  }
}

/**
 * Thrown when a game action is attempted during an invalid game phase.
 * This error indicates that the current game state doesn't allow the requested action.
 *
 * @class InvalidPhaseError
 * @extends ValidationError
 * @param {string} message - Description of the phase validation error
 * @property {string} name - The error name ('InvalidPhaseError')
 *
 * @example
 * // Throwing the error
 * if (gameState.phase !== 'PLAYING') {
 *   throw new InvalidPhaseError(`Cannot play cards during ${gameState.phase} phase`);
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   playCard(gameState, playerId, card);
 * } catch (error) {
 *   if (error instanceof InvalidPhaseError) {
 *     console.error('Invalid game phase for this action:', error.message);
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 * @see GAME_PHASES For valid game phase constants
 */
export class InvalidPhaseError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = "InvalidPhaseError";
  }
}

/**
 * Thrown when a player attempts to play a card that is not in their hand.
 * This error indicates an invalid game action where the specified card
 * cannot be found in the player's current hand.
 *
 * @class CardNotInHandError
 * @extends ValidationError
 * @param {string} message - Description of the error, typically including card details
 * @property {string} name - The error name ('CardNotInHandError')
 *
 * @example
 * // Throwing the error
 * const cardInHand = playerHand.some(card => card.id === cardToPlay.id);
 * if (!cardInHand) {
 *   throw new CardNotInHandError(`Card ${cardToPlay.id} not found in player's hand`);
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   playCard(gameState, playerId, card);
 * } catch (error) {
 *   if (error instanceof CardNotInHandError) {
 *     console.error('Invalid card selection:', error.message);
 *     // Optionally reset the player's selection
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 */
export class CardNotInHandError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = "CardNotInHandError";
  }
}

/**
 * Thrown when a player fails to follow suit when required by Euchre rules.
 * In Euchre, if a player has a card of the suit that was led, they must play a card of that suit.
 *
 * @class MustFollowSuitError
 * @extends ValidationError
 * @param {string} message - Description of the error, typically including suit information
 * @property {string} name - The error name ('MustFollowSuitError')
 *
 * @example
 * // Throwing the error
 * if (hasSuit(ledSuit, playerHand) && playedCard.suit !== ledSuit) {
 *   throw new MustFollowSuitError(
 *     `Must follow the led suit: ${ledSuit}`
 *   );
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   playCard(gameState, playerId, card);
 * } catch (error) {
 *   if (error instanceof MustFollowSuitError) {
 *     console.error('Invalid play - must follow suit:', error.message);
 *     // Highlight valid cards in the UI
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 * @see getEffectiveSuit For how card suits are determined when trumps are involved
 */
export class MustFollowSuitError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = "MustFollowSuitError";
  }
}

/**
 * Thrown when an invalid bid is made during the Euchre bidding phase.
 * This includes invalid orders, passes, or suit selections during bidding.
 *
 * @class InvalidBidError
 * @extends ValidationError
 * @param {string} message - Description of the bidding error
 * @property {string} name - The error name ('InvalidBidError')
 *
 * @example
 * // Throwing the error - invalid bid in round 1
 * if (biddingRound === 1 && decision !== 'orderUp' && decision !== 'pass') {
 *   throw new InvalidBidError(
 *     `Invalid bid '${decision}' in round 1. Must be 'orderUp' or 'pass'`
 *   );
 * }
 *
 * @example
 * // Throwing the error - invalid suit in round 2
 * if (biddingRound === 2 && decision === 'callTrump' && !isValidSuit(suit)) {
 *   throw new InvalidBidError(`Invalid trump suit: ${suit}`);
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   placeBid(gameState, playerId, bid);
 * } catch (error) {
 *   if (error instanceof InvalidBidError) {
 *     console.error('Invalid bid:', error.message);
 *     // Show error to player and allow rebid
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 * @see validateBid For the validation logic that throws this error
 */
export class InvalidBidError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = "InvalidBidError";
  }
}

/**
 * Thrown when an invalid discard is attempted by the dealer.
 * In Euchre, after the dealer picks up the turn card, they must discard one card.
 * This error is thrown when the discard is invalid for any reason.
 *
 * @class InvalidDiscardError
 * @extends ValidationError
 * @param {string} message - Description of the discard error
 * @property {string} name - The error name ('InvalidDiscardError')
 *
 * @example
 * // Throwing the error - dealer must discard one card
 * if (playerRole !== dealer) {
 *   throw new InvalidDiscardError('Only the dealer can discard after picking up');
 * }
 *
 * @example
 * // Throwing the error - must discard when picking up
 * if (pickedUpCard && !discardedCard) {
 *   throw new InvalidDiscardError('Dealer must discard one card after picking up');
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   dealerDiscard(gameState, playerId, cardToDiscard);
 * } catch (error) {
 *   if (error instanceof InvalidDiscardError) {
 *     console.error('Invalid discard:', error.message);
 *     // Show error to dealer and allow them to select a different card
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 * @see validateDealerDiscard For the validation logic that throws this error
 */
export class InvalidDiscardError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = "InvalidDiscardError";
  }
}

/**
 * Thrown when an internal error occurs during game phase transitions or logic execution.
 * This error indicates a problem with the game's internal state or logic flow.
 *
 * @class PhaseLogicError
 * @extends ValidationError
 * @param {string} message - Description of the phase logic error
 * @property {string} name - The error name ('PhaseLogicError')
 *
 * @example
 * // Throwing the error - invalid phase transition
 * if (!isValidPhaseTransition(currentPhase, nextPhase)) {
 *   throw new PhaseLogicError(
 *     `Invalid phase transition from ${currentPhase} to ${nextPhase}`
 *   );
 * }
 *
 * @example
 * // Throwing the error - invalid game state for phase
 * if (phase === 'PLAYING' && !currentTrick) {
 *   throw new PhaseLogicError('No current trick in PLAYING phase');
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   advanceGamePhase(gameState);
 * } catch (error) {
 *   if (error instanceof PhaseLogicError) {
 *     console.error('Game phase error:', error.message);
 *     // Reset to a known good state or recover gracefully
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 * @see GAME_PHASES For valid game phase constants
 */
export class PhaseLogicError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = "PhaseLogicError";
  }
}

/**
 * Thrown when an invalid card object or property is encountered.
 * This error indicates that a card object is malformed or contains invalid data.
 *
 * @class InvalidCardError
 * @extends ValidationError
 * @param {string} message - Description of the card validation error
 * @property {string} name - The error name ('InvalidCardError')
 *
 * @example
 * // Throwing the error - invalid card suit
 * if (!Object.values(SUITS).includes(card.suit)) {
 *   throw new InvalidCardError(`Invalid card suit: ${card.suit}`);
 * }
 *
 * @example
 * // Throwing the error - missing required card property
 * if (!card.id || !card.suit || !card.value) {
 *   throw new InvalidCardError('Card is missing required properties');
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   validateCard(card);
 * } catch (error) {
 *   if (error instanceof InvalidCardError) {
 *     console.error('Invalid card:', error.message);
 *     // Handle the invalid card (e.g., remove from deck, log error, etc.)
 *   }
 * }
 *
 * @see ValidationError Base class for all validation errors
 * @see SUITS For valid suit constants
 * @see VALUES For valid card value constants
 */
export class InvalidCardError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = "InvalidCardError";
  }
}
