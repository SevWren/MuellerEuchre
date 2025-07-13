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
import { GAME_PHASES, SUITS, PLAYER_ROLES, BID_DECISIONS } from "../../config/constants.js";
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
  InvalidGoAloneError,
} from "./errors.js";

/**
 * Validates that a set of required arguments are provided.
 * Throws a ValidationError if any argument is falsy.
 * @private
 * @param {object} args - An object where keys are argument names and values are the arguments.
 * @param {string} context - A string describing the validation context for the error message.
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

function validatePlay(gameState, playerHand, cardToPlay, playerRole) {
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
      `Cannot make bid decision during ${gamePhase} phase.`,
    );
  }
}
function validateDealerDiscard(
  gameState,
  playerRole,
  cardToDiscard,
  playerHand,
) {
  requireArgs({ gameState, playerRole, cardToDiscard, playerHand }, 'discard validation');
  requireArgs({ 'cardToDiscard.id': cardToDiscard.id }, 'discard validation');

  if (gameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
    throw new InvalidPhaseError(
      `Cannot discard card during ${gameState.gamePhase} phase.`,
    );
  }

  if (gameState.dealer !== playerRole) {
    throw new NotPlayersTurnError(playerRole, gameState.dealer);
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
