import { validatePlay } from "../logic/validation-core.js";
import { getNextPlayer } from "../../utils/players.js";
import { getCardRank } from "../../utils/cardUtils.js";
import { GAME_PHASES } from "../../config/constants.js";
import {
  PhaseLogicError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError
} from "../logic/validation-errors.js";

/**
 * Handles a player playing a card.
 * Validates the play, updates the current trick, determines the next player,
 * and transitions to scoring if the hand is over.
 *
 * @param {object} gameState The current state of the game. // Changed from GameState to object for consistency
 * @param {string} playerRole The role of the player making the play (e.g., 'player1', 'player2').
 * @param {object} cardPlayed The card object that was played.
 * @returns {object} The new game state.
 * @throws {Error} If the play is invalid (now via validatePlay or PhaseLogicError).
 * @throws {PhaseLogicError} For internal inconsistencies or logic failures.
 * @throws {NotPlayersTurnError} If it's not the player's turn (from validatePlay).
 * @throws {InvalidPhaseError} If not in PLAYING phase (from validatePlay).
 * @throws {CardNotInHandError} If card not in hand (from validatePlay).
 * @throws {MustFollowSuitError} If player fails to follow suit (from validatePlay).
 */
function deepCloneState(state) {
  try {
    return structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
  } catch (error) {
    throw new Error('Failed to clone game state', { cause: error });
  }
}

function validatePlayer(gameState, playerRole) {
  if (!gameState?.players?.[playerRole]) {
    throw new PhaseLogicError(`Player ${playerRole} not found`);
  }
  return gameState.players[playerRole];
}

function handlePlayCard(gameState, playerRole, cardPlayed, deckUtils = {}) {
  if (!gameState || typeof gameState !== 'object') {
    throw new TypeError('gameState must be an object');
  }
  if (!playerRole || typeof playerRole !== 'string') {
    throw new TypeError('playerRole must be a non-empty string');
  }
  if (!cardPlayed || typeof cardPlayed !== 'object') {
    throw new TypeError('cardPlayed must be an object');
  }
  if (typeof deckUtils.getCardRank !== 'function') {
    throw new TypeError('deckUtils.getCardRank must be a function');
  }
  
  const player = validatePlayer(gameState, playerRole);

  // Validate the play and throw any validation errors
  const validation = validatePlay(gameState, player.hand, cardPlayed, playerRole);
  // Handle both boolean and object return types from validatePlay
  if (typeof validation === 'object' && !validation.valid) {
    // If validation is an object with valid: false, throw the first error
    throw validation.errors[0];
  } else if (validation !== true) {
    // If validation is not true, it's an unexpected return value
    throw new Error('Unexpected return value from validatePlay');
  }

  // Create a deep clone of the game state
  let newGameState = deepCloneState(gameState);

  // Remove card from player's hand
  const newHand = player.hand.filter((card) => card.id !== cardPlayed.id);
  newGameState.players = {
    ...newGameState.players,
    [playerRole]: {
      ...newGameState.players[playerRole],
      hand: newHand,
    },
  };

  // Add card to current trick
  newGameState.currentTrick = [
    ...newGameState.currentTrick,
    { ...cardPlayed, playedBy: playerRole },
  ];

  // Determine next player or end trick/hand
  if (newGameState.currentTrick.length === 4) {
    // Determine trick winner
    const trickWinnerRole = determineTrickWinner(
      newGameState.currentTrick,
      newGameState.trumpSuit,
      newGameState.currentTrick[0]?.playedBy,
      deckUtils
    );
    
    const winningPlayer = newGameState.players[trickWinnerRole];
    const winnerTeam = winningPlayer?.teamId;
    
    if (winnerTeam === undefined) {
      throw new PhaseLogicError(
        `Could not determine teamId for trick winner: ${trickWinnerRole}`
      );
    }

    const updatedTricksTaken = {
      ...newGameState.tricksTaken,
      [winnerTeam]: (newGameState.tricksTaken[winnerTeam] || 0) + 1
    };

    newGameState.tricksTaken = updatedTricksTaken;
    newGameState.currentTrick = [];
    newGameState.currentPlayer = trickWinnerRole;
    newGameState.lastTrickWinner = trickWinnerRole;
    newGameState.message = `${trickWinnerRole} wins the trick.`;

    const totalTricksPlayedThisHand = Object.values(
      newGameState.tricksTaken,
    ).reduce((sum, count) => sum + count, 0);

    if (totalTricksPlayedThisHand === 5) {
      const finalTricksMessageSegment = `Scores for this hand: ${JSON.stringify(newGameState.tricksTaken)}.`;
      newGameState.gamePhase = GAME_PHASES.SCORING;
      newGameState.currentPlayer = null;
      newGameState.message = `Hand over. ${finalTricksMessageSegment} Moving to scoring.`;
    }
  } else {
    // Advance to next player if trick is not over
    const playerRoles = Object.keys(newGameState.players);
    const nextPlayerForTrick = getNextPlayer(
      playerRole,
      playerRoles,
      newGameState.goingAlone,
      newGameState.partnerSittingOut,
    );
    newGameState.currentPlayer = nextPlayerForTrick;
    newGameState.message = `${playerRole} played ${cardPlayed.rank} of ${cardPlayed.suit}. Next player: ${nextPlayerForTrick}.`;
  }
  return newGameState;
}

/**
 * Determines the winner of a completed trick.
 *
 * @param {Array<object>} trick Array of cards played in the trick, with {playedBy, suit, rank} or {card: {suit, value}, playedBy}.
 * @param {string} trumpSuit The trump suit for the current hand.
 * @param {string} leadPlayerRole The role of the player who led the trick.
 * @param {object} deckUtils The deck utilities object containing getCardRank function.
 * @returns {string} The role of the player who won the trick.
 */
function validateTrick(trick) {
  if (!Array.isArray(trick) || trick.length !== 4) {
    throw new PhaseLogicError('Trick must have 4 cards to determine a winner');
  }
}

function determineTrickWinner(trick, trumpSuit, leadPlayerRole, deckUtils = {}) {
  if (typeof deckUtils.getCardRank !== 'function') {
    throw new TypeError('deckUtils.getCardRank must be a function');
  }
  
  validateTrick(trick);
  
  if (!leadPlayerRole) {
    throw new PhaseLogicError('leadPlayerRole is required');
  }

  // Normalize the trick to handle both formats: {suit, value, playedBy} and {card: {suit, value}, playedBy}
  const normalizedTrick = trick.map(cardObj => {
    if (cardObj.card) {
      // Handle nested card format: {card: {suit, value}, playedBy}
      return {
        ...cardObj.card,
        playedBy: cardObj.playedBy
      };
    }
    // Handle direct format: {suit, value, playedBy}
    return cardObj;
  });

  const leadCard = normalizedTrick[0];
  let winningCard = leadCard;

  for (let i = 1; i < normalizedTrick.length; i++) {
    const currentCard = normalizedTrick[i];
    const winningRank = deckUtils.getCardRank(winningCard, trumpSuit, leadCard.suit);
    const currentRank = deckUtils.getCardRank(currentCard, trumpSuit, leadCard.suit);

    if (currentRank > winningRank) {
      winningCard = currentCard;
    }
  }
  return winningCard.playedBy;
}

export { handlePlayCard, determineTrickWinner };
