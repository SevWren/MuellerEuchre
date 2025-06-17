/**
 * Custom error classes for game logic validation.
 * @module ValidationErrors
 */

/**
 * Base class for validation errors.
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error for when an action is attempted by a player whose turn it is not.
 */
export class NotPlayersTurnError extends ValidationError {
  constructor(playerRole, currentPlayer) {
    super(`Not ${playerRole}'s turn. It is ${currentPlayer}'s turn.`);
    this.name = 'NotPlayersTurnError';
    this.playerRole = playerRole;
    this.currentPlayer = currentPlayer;
  }
}

/**
 * Error for when an action is attempted during an invalid game phase.
 */
export class InvalidPhaseError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidPhaseError';
  }
}

/**
 * Error for when a card is not found in a player's hand.
 */
export class CardNotInHandError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'CardNotInHandError';
  }
}

/**
 * Error for when a player fails to follow suit when required.
 */
export class MustFollowSuitError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'MustFollowSuitError';
  }
}

/**
 * Error for invalid bidding decisions.
 */
export class InvalidBidError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidBidError';
  }
}

/**
 * Error for invalid dealer discard actions.
 */
export class InvalidDiscardError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = 'InvalidDiscardError';
  }
}

/**
 * Error for issues arising from internal phase logic operations.
 */
export class PhaseLogicError extends ValidationError { // Or extends Error directly
  constructor(message) {
    super(message);
    this.name = 'PhaseLogicError';
  }
}
