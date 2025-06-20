/**
 * Custom error classes for game logic validation.
 * @module ValidationErrors
 */

/**
 * Base class for validation errors.
 * @extends Error
 */
export class ValidationError extends Error {
  /**
   * Creates an instance of ValidationError.
   * @param {string} message - The error message.
   */
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error for when an action is attempted by a player whose turn it is not.
 * @extends ValidationError
 */
export class NotPlayersTurnError extends ValidationError {
  /**
   * Creates an instance of NotPlayersTurnError.
   * @param {string} playerRole - The role of the player who attempted the action.
   * @param {string} currentPlayer - The role of the player whose turn it currently is.
   */
  constructor(playerRole, currentPlayer) {
    super(`Not ${playerRole}'s turn. It is ${currentPlayer}'s turn.`);
    this.name = 'NotPlayersTurnError';
    this.playerRole = playerRole;
    this.currentPlayer = currentPlayer;
  }
}

/**
 * Error for when an action is attempted during an invalid game phase.
 * @extends ValidationError
 */
export class InvalidPhaseError extends ValidationError {
  /**
   * Creates an instance of InvalidPhaseError.
   * @param {string} message - The error message.
   */
  constructor(message) {
    super(message);
    this.name = 'InvalidPhaseError';
  }
}

/**
 * Error for when a card is not found in a player's hand.
 * @extends ValidationError
 */
export class CardNotInHandError extends ValidationError {
  /**
   * Creates an instance of CardNotInHandError.
   * @param {string} message - The error message.
   */
  constructor(message) {
    super(message);
    this.name = 'CardNotInHandError';
  }
}

/**
 * Error for when a player fails to follow suit when required.
 * @extends ValidationError
 */
export class MustFollowSuitError extends ValidationError {
  /**
   * Creates an instance of MustFollowSuitError.
   * @param {string} message - The error message.
   */
  constructor(message) {
    super(message);
    this.name = 'MustFollowSuitError';
  }
}

/**
 * Error for invalid bidding decisions.
 * @extends ValidationError
 */
export class InvalidBidError extends ValidationError {
  /**
   * Creates an instance of InvalidBidError.
   * @param {string} message - The error message.
   */
  constructor(message) {
    super(message);
    this.name = 'InvalidBidError';
  }
}

/**
 * Error for invalid dealer discard actions.
 * @extends ValidationError
 */
export class InvalidDiscardError extends ValidationError {
  /**
   * Creates an instance of InvalidDiscardError.
   * @param {string} message - The error message.
   */
  constructor(message) {
    super(message);
    this.name = 'InvalidDiscardError';
  }
}

/**
 * Error for issues arising from internal phase logic operations.
 * @extends ValidationError
 */
export class PhaseLogicError extends ValidationError { // Or extends Error directly
  /**
   * Creates an instance of PhaseLogicError.
   * @param {string} message - The error message.
   */
  constructor(message) {
    super(message);
    this.name = 'PhaseLogicError';
  }
}
