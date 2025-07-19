

// filepath: src/game/logic/validation-errors.js
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
 * @param {string} message - Human-readable description of the error.
 * @param {string} [code='GENERIC_VALIDATION_ERROR'] - A unique, machine-readable error code.
 * @property {string} name - The error name ('ValidationError').
 * @property {string} code - The machine-readable error code.
 * @property {string} message - The error message (inherited from Error).
 * @property {string} [stack] - The stack trace (inherited from Error).
 *
 * @example
 * // Creating a validation error
 * throw new ValidationError('Invalid game state', 'E_INVALID_STATE');
 *
 * @example
 * // Checking error type
 * try {
 *   validateGameState(state);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error(`Validation failed with code ${error.code}:`, error.message);
 *   }
 * }
 */
class ValidationError extends Error {
  constructor(message, code = 'GENERIC_VALIDATION_ERROR') {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

/**
 * Thrown when a player attempts to take an action when it's not their turn.
 *
 * @class NotPlayersTurnError
 * @extends ValidationError
 * @param {string} playerRole - The role of the player who attempted the action.
 * @param {string} currentPlayer - The role of the player whose turn it actually is.
 * @property {string} name - The error name ('NotPlayersTurnError').
 * @property {string} code - The error code ('E_NOT_YOUR_TURN').
 * @property {string} playerRole - The role that attempted the action.
 * @property {string} currentPlayer - The role whose turn it actually is.
 *
 * @example
 * // Throwing the error
 * if (gameState.currentPlayer !== playerRole) {
 *   throw new NotPlayersTurnError(playerRole, gameState.currentPlayer);
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   makeMove(gameState, playerRole, move);
 * } catch (error) {
 *   if (error instanceof NotPlayersTurnError) {
 *     // Client can use error.currentPlayer to highlight the correct player
 *     socket.emit('action_error', {
 *       message: `It's ${error.currentPlayer}'s turn, not yours.`,
 *       code: error.code,
 *       context: { currentPlayer: error.currentPlayer }
 *     });
 *   }
 * }
 *
 * @see {@link module:validation.validatePlay}
 * @see {@link module:validation.validateBid}
 */
class NotPlayersTurnError extends ValidationError {
  constructor(playerRole, currentPlayer) {
    super(`Not ${playerRole}'s turn. It is ${currentPlayer}'s turn.`, 'E_NOT_YOUR_TURN');
    this.name = "NotPlayersTurnError";
    this.playerRole = playerRole;
    this.currentPlayer = currentPlayer;
  }
}

/**
 * Thrown when a game action is attempted during an invalid game phase.
 *
 * @class InvalidPhaseError
 * @extends ValidationError
 * @param {string} action - A description of the action being attempted.
 * @param {string} currentPhase - The phase the game was in during the attempt.
 * @param {string|string[]} expectedPhase - The phase or phases that were expected.
 * @property {string} name - The error name ('InvalidPhaseError').
 * @property {string} code - The error code ('E_INVALID_PHASE').
 * @property {string} action - The attempted action.
 * @property {string} currentPhase - The phase the game was in.
 * @property {string|string[]} expectedPhase - The expected phase(s).
 *
 * @example
 * // Throwing the error
 * if (gameState.phase !== 'PLAYING') {
 *   throw new InvalidPhaseError('play a card', gameState.phase, 'PLAYING');
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   playCard(gameState, playerId, card);
 * } catch (error) {
 *   if (error instanceof InvalidPhaseError) {
 *     console.error(`Action '${error.action}' is not allowed during phase '${error.currentPhase}'.`);
 *   }
 * }
 *
 * @see {@link module:validation.validatePlay}
 * @see {@link module:validation.validateBid}
 * @see {@link module:validation.validateDealerDiscard}
 */
class InvalidPhaseError extends ValidationError {
  constructor(action, currentPhase, expectedPhase) {
    const message = `Cannot ${action} during the ${currentPhase} phase. Expected ${Array.isArray(expectedPhase) ? expectedPhase.join(' or ') : expectedPhase}.`;
    super(message, 'E_INVALID_PHASE');
    this.name = "InvalidPhaseError";
    this.action = action;
    this.currentPhase = currentPhase;
    this.expectedPhase = expectedPhase;
  }
}

/**
 * Thrown when a player attempts to play a card that is not in their hand.
 *
 * @class CardNotInHandError
 * @extends ValidationError
 * @param {string} cardId - The ID of the card that was not found.
 * @param {string[]} playerHandIds - An array of card IDs that were in the player's hand, for debugging.
 * @property {string} name - The error name ('CardNotInHandError').
 * @property {string} code - The error code ('E_CARD_NOT_IN_HAND').
 * @property {string} cardId - The ID of the card that was attempted to be played.
 * @property {string[]} playerHandIds - The IDs of the cards actually in the player's hand.
 *
 * @example
 * // Throwing the error
 * const cardInHand = playerHand.find(c => c.id === cardToPlay.id);
 * if (!cardInHand) {
 *   throw new CardNotInHandError(cardToPlay.id, playerHand.map(c => c.id));
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   playCard(gameState, playerId, card);
 * } catch (error) {
 *   if (error instanceof CardNotInHandError) {
 *     // This error likely indicates a client-server state discrepancy.
 *     logger.warn({
 *       playedCard: error.cardId,
 *       serverHand: error.playerHandIds
 *     }, 'Client tried to play a card not in their hand.');
 *     // Force a state resync for the client.
 *   }
 * }
 *
 * @see {@link module:validation.validatePlay}
 */
class CardNotInHandError extends ValidationError {
  constructor(cardId, playerHandIds) {
    super(`Card with ID '${cardId}' not found in player's hand.`, 'E_CARD_NOT_IN_HAND');
    this.name = "CardNotInHandError";
    this.cardId = cardId;
    this.playerHandIds = playerHandIds;
  }
}

/**
 * Thrown when a player fails to follow suit when required by Euchre rules.
 *
 * @class MustFollowSuitError
 * @extends ValidationError
 * @param {string} ledSuit - The suit that was led.
 * @param {string} playedSuit - The suit of the card that was illegally played.
 * @property {string} name - The error name ('MustFollowSuitError').
 * @property {string} code - The error code ('E_MUST_FOLLOW_SUIT').
 * @property {string} ledSuit - The suit that the player was required to follow.
 * @property {string} playedSuit - The suit of the card the player attempted to play.
 *
 * @example
 * // Throwing the error
 * if (playerHasLedSuit && playedCardEffectiveSuit !== ledSuit) {
 *   throw new MustFollowSuitError(ledSuit, playedCardEffectiveSuit);
 * }
 *
 * @example
 * // Catching and handling the error
 * try {
 *   playCard(gameState, playerId, card);
 * } catch (error) {
 *   if (error instanceof MustFollowSuitError) {
 *     // Client UI can use this to highlight cards of the correct suit (error.ledSuit)
 *     socket.emit('action_error', {
 *        message: `You must follow suit. Please play a ${error.ledSuit} card.`,
 *        code: error.code,
 *        context: { ledSuit: error.ledSuit }
 *     });
 *   }
 * }
 *
 * @see {@link module:validation.validatePlay}
 * @see {@link module:validation.getEffectiveSuit}
 */
class MustFollowSuitError extends ValidationError {
  constructor(ledSuit, playedSuit) {
    super(`Must follow suit. Led suit is ${ledSuit}, attempted to play a card of ${playedSuit}.`, 'E_MUST_FOLLOW_SUIT');
    this.name = "MustFollowSuitError";
    this.ledSuit = ledSuit;
    this.playedSuit = playedSuit;
  }
}

/**
 * Thrown when an invalid bid is made during the Euchre bidding phase.
 *
 * @class InvalidBidError
 * @extends ValidationError
 * @param {string} message - Description of the bidding error.
 * @param {object} [details] - Optional object with more context about the invalid bid.
 * @param {string} [details.decision] - The bid decision made (e.g., 'orderUp', 'pass').
 * @param {string} [details.suit] - The suit that was called, if any.
 * @param {number} [details.round] - The bidding round number (1 or 2).
 * @property {string} name - The error name ('InvalidBidError').
 * @property {string} code - The error code ('E_INVALID_BID').
 * @property {object} details - Additional context about the bid.
 *
 * @example
 * // Throwing the error
 * if (decision === 'callTrump' && suit === gameState.turnCard.suit) {
 *   throw new InvalidBidError('Cannot call the suit that was turned down.', { decision, suit });
 * }
 *
 * @see {@link module:validation.validateBid}
 */
class InvalidBidError extends ValidationError {
  constructor(message, details = {}) {
    super(message, 'E_INVALID_BID');
    this.name = "InvalidBidError";
    this.details = details;
  }
}

/**
 * Thrown when an invalid discard is attempted by the dealer.
 *
 * @class InvalidDiscardError
 * @extends ValidationError
 * @param {string} message - Description of the discard error.
 * @param {object} [details] - Optional context.
 * @param {object} [details.card] - The card that was invalidly discarded.
 * @property {string} name - The error name ('InvalidDiscardError').
 * @property {string} code - The error code ('E_INVALID_DISCARD').
 * @property {object} details - Additional context.
 *
 * @example
 * // Throwing the error
 * if (cardToDiscard.id === gameState.turnCard.id) {
 *   throw new InvalidDiscardError('Cannot discard the turn card.', { card: cardToDiscard });
 * }
 *
 * @see {@link module:validation.validateDealerDiscard}
 */
class InvalidDiscardError extends ValidationError {
  constructor(message, details = {}) {
    super(message, 'E_INVALID_DISCARD');
    this.name = "InvalidDiscardError";
    this.details = details;
  }
}

/**
 * Thrown when an internal error occurs during game phase transitions or logic execution.
 *
 * @class PhaseLogicError
 * @extends ValidationError
 * @param {string} message - Description of the phase logic error.
 * @property {string} name - The error name ('PhaseLogicError').
 * @property {string} code - The error code ('E_PHASE_LOGIC').
 *
 * @example
 * // Throwing the error
 * if (!gameState.turnCard) {
 *   throw new PhaseLogicError('Cannot order up: turn card is missing from game state.');
 * }
 */
class PhaseLogicError extends ValidationError {
  constructor(message) {
    super(message, 'E_PHASE_LOGIC');
    this.name = "PhaseLogicError";
  }
}

/**
 * Thrown when an invalid go-alone declaration is made.
 *
 * @class InvalidGoAloneError
 * @extends ValidationError
 * @param {string} message - Description of the go-alone validation error.
 * @property {string} name - The error name ('InvalidGoAloneError').
 * @property {string} code - The error code ('E_INVALID_GO_ALONE').
 *
 * @example
 * // Throwing the error
 * if (playerRole !== winningBidder) {
 *   throw new InvalidGoAloneError('Only the winning bidder can declare to go alone.');
 * }
 *
 * @see {@link module:validation.isValidGoAlone}
 */
class InvalidGoAloneError extends ValidationError {
  constructor(message) {
    super(message, 'E_INVALID_GO_ALONE');
    this.name = 'InvalidGoAloneError';
  }
}

/**
 * Thrown when an invalid card object or property is encountered.
 *
 * @class InvalidCardError
 * @extends ValidationError
 * @param {string} message - Description of the card validation error.
 * @param {object} [card] - The invalid card object, for debugging.
 * @property {string} name - The error name ('InvalidCardError').
 * @property {string} code - The error code ('E_INVALID_CARD').
 * @property {object} [card] - The invalid card object that caused the error.
 *
 * @example
 * // Throwing the error
 * if (!card || typeof card.suit !== 'string') {
 *   throw new InvalidCardError('Card object must have a suit property.', card);
 * }
 *
 * @see {@link module:deck}
 */
class InvalidCardError extends ValidationError {
  constructor(message, card) {
    super(message, 'E_INVALID_CARD');
    this.name = "InvalidCardError";
    this.card = card;
  }
}

/**
 * Thrown when a player's hand size is invalid for the current game action.
 *
 * @class HandSizeError
 * @extends ValidationError
 * @param {string} message - Description of the hand size error.
 * @param {number} actualSize - The actual size of the hand.
 * @param {number} expectedSize - The expected size of the hand.
 * @property {string} name - The error name ('HandSizeError').
 * @property {string} code - The error code ('E_HAND_SIZE').
 * @property {number} actualSize - The actual number of cards in the hand.
 * @property {number} expectedSize - The expected number of cards.
 *
 * @example
 * // Throwing the error
 * if (dealerHand.length !== 6) {
 *   throw new HandSizeError('Dealer must have 6 cards to discard.', dealerHand.length, 6);
 * }
 */
class HandSizeError extends ValidationError {
  constructor(message, actualSize, expectedSize) {
    super(message, 'E_HAND_SIZE');
    this.name = "HandSizeError";
    this.actualSize = actualSize;
    this.expectedSize = expectedSize;
  }
}

/**
 * Thrown when a player who is not the dealer attempts to perform a dealer-only action.
 *
 * @class NotDealerError
 * @extends ValidationError
 * @param {string} attemptedBy - The role that made the attempt.
 * @param {string} dealer - The role of the actual dealer.
 * @property {string} name - The error name ('NotDealerError').
 * @property {string} code - The error code ('E_NOT_DEALER').
 * @property {string} attemptedBy - The role of the player who wrongly attempted the action.
 * @property {string} dealer - The role of the player who is the actual dealer.
 *
 * @example
 * // Throwing the error
 * if (playerRole !== gameState.dealer) {
 *   throw new NotDealerError(playerRole, gameState.dealer);
 * }
 *
 * @see {@link module:validation.validateDealerDiscard}
 */
class NotDealerError extends ValidationError {
  constructor(attemptedBy, dealer) {
    super(`Action can only be performed by the dealer (${dealer}). Player ${attemptedBy} attempted the action.`, 'E_NOT_DEALER');
    this.name = "NotDealerError";
    this.attemptedBy = attemptedBy;
    this.dealer = dealer;
  }
}

export {
  ValidationError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
  PhaseLogicError,
  InvalidGoAloneError,
  InvalidCardError,
  HandSizeError,
  NotDealerError,
};