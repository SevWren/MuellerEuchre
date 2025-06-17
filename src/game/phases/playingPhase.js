import logger from '../../utils/logger.js'; // Added logger
// Removed import of updateGameState from '../state.js';
import { isValidPlay } from '../logic/validation.js';
import { getCardRank } from '../../utils/deck.js';
import { getNextPlayer } from '../../utils/players.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js'; // Added PLAYER_ROLES for validation if needed, though getNextPlayer uses it.

/**
 * Handles a player playing a card.
 * Validates the play, updates the current trick, determines the next player,
 * and transitions to scoring if the hand is over.
 * This is now a pure function.
 *
 * @param {object} gameState The current state of the game.
 * @param {string} playerRole The role of the player making the play.
 * @param {object} cardPlayed The card object that was played.
 * @returns {object} The new game state.
 * @throws {object} Error object with message, errorType, and details.
 */
function handlePlayCard(gameState, playerRole, cardPlayed) {
  const gameId = gameState?.gameId; // For logging

  // Input Parameter Validation
  if (!gameState || typeof gameState !== 'object' || !gameState.players || typeof gameState.players !== 'object') {
    const error = { message: 'Invalid gameState: must be an object with a players object.', errorType: 'INVALID_INPUT', details: { gameStateProvided: !!gameState } };
    logger.error({ error, gameId, playerRole, cardPlayed }, "handlePlayCard: Invalid gameState provided.");
    throw error;
  }
  if (typeof playerRole !== 'string' || !playerRole.trim() || !gameState.players[playerRole]) {
    const error = { message: 'Invalid playerRole: must be a non-empty string and exist in gameState.players.', errorType: 'INVALID_INPUT', details: { playerRole } };
    logger.error({ error, gameId, cardPlayed, players: gameState.players }, "handlePlayCard: Invalid playerRole.");
    throw error;
  }
  if (!cardPlayed || typeof cardPlayed !== 'object' ||
      typeof cardPlayed.suit !== 'string' || !cardPlayed.suit.trim() ||
      typeof cardPlayed.rank !== 'string' || !cardPlayed.rank.trim()) {
    const error = { message: 'Invalid cardPlayed: must be an object with non-empty suit and rank strings.', errorType: 'INVALID_INPUT', details: { cardPlayed } };
    logger.error({ error, gameId, playerRole }, "handlePlayCard: Invalid cardPlayed object.");
    throw error;
  }

  logger.info({ gameId, playerRole, cardPlayed }, `Attempting to play card: ${cardPlayed.rank} of ${cardPlayed.suit} by ${playerRole}`);
  const newState = JSON.parse(JSON.stringify(gameState)); // Deep clone

  if (newState.gamePhase !== GAME_PHASES.PLAYING) {
    const error = { message: 'Not in PLAYING phase.', errorType: 'INVALID_PHASE', details: { currentPhase: newState.gamePhase } };
    logger.warn({ error, gameId, playerRole, cardPlayed }, error.message);
    throw error;
  }
  if (newState.currentPlayer !== playerRole) {
    const error = { message: `Not player ${playerRole}'s turn. It's ${newState.currentPlayer}'s turn.`, errorType: 'NOT_PLAYER_TURN', details: { currentPlayer: newState.currentPlayer, attemptedPlayer: playerRole } };
    logger.warn({ error, gameId, playerRole, cardPlayed }, error.message);
    throw error;
  }

  const player = newState.players[playerRole];
  // Player existence is already checked by input validation, but player variable is still useful.

  if (!isValidPlay(newState, player.hand, cardPlayed, playerRole)) {
    const error = { message: 'Invalid play.', errorType: 'INVALID_PLAY', details: { playerHand: player.hand, cardPlayed, currentTrick: newState.currentTrick, trumpSuit: newState.trumpSuit } };
    logger.warn({ error, gameId, playerRole, cardPlayed }, error.message);
    throw error;
  }

  // Remove card from player's hand
  newState.players[playerRole].hand = player.hand.filter(card => !(card.suit === cardPlayed.suit && card.rank === cardPlayed.rank));

  // Add card to current trick
  newState.currentTrick.push({ ...cardPlayed, playedBy: playerRole });

  // Determine next player or end trick/hand
  if (newState.currentTrick.length === 4) {
    const trickWinnerRole = determineTrickWinner(newState.currentTrick, newState.trumpSuit); // Removed leadPlayerRole as it's implicit from trick[0]
    const winningPlayer = newState.players[trickWinnerRole];

    if (!winningPlayer || winningPlayer.teamId === undefined) {
      const error = { message: `Could not determine teamId for trick winner: ${trickWinnerRole}`, errorType: 'INTERNAL_STATE_ERROR', details: { trickWinnerRole, winningPlayer } };
      logger.error({ error, gameId, playerRole, cardPlayed }, error.message);
      throw error;
    }
    const winnerTeam = winningPlayer.teamId;

    newState.tricksTaken[winnerTeam]++;
    newState.currentTrick = [];
    newState.currentPlayer = trickWinnerRole; // Winner of the trick leads the next trick
    newState.lastTrickWinner = trickWinnerRole; // Keep track of who won the last trick
    newState.gameMessages = [...(newState.gameMessages || []), { type: 'trick_end', text: `${trickWinnerRole} wins the trick.`, timestamp: new Date().toISOString() }];
    logger.info({ gameId, trickWinnerRole, winnerTeam }, `${trickWinnerRole} (Team ${winnerTeam}) wins the trick.`);

    const totalTricksPlayedThisHand = Object.values(newState.tricksTaken).reduce((sum, count) => sum + count, 0);

    if (totalTricksPlayedThisHand === 5) { // Assuming 5 tricks per hand
      const finalTricksMessageSegment = `Scores for this hand: ${JSON.stringify(newState.tricksTaken)}.`;
      newState.gamePhase = GAME_PHASES.SCORING;
      newState.currentPlayer = null; // Or set to a specific player for scoring acknowledgment if needed
      newState.gameMessages = [...(newState.gameMessages || []), { type: 'hand_end', text: `Hand over. ${finalTricksMessageSegment} Moving to scoring.`, timestamp: new Date().toISOString() }];
      logger.info({ gameId, tricksTaken: newState.tricksTaken }, "Hand over. Moving to SCORING phase.");
    }
  } else {
    // playerRoles might not be needed if getNextPlayer can infer from gameState.players
    const playerRoles = PLAYER_ROLES; // Assuming PLAYER_ROLES is available and correct
    const nextPlayerForTrick = getNextPlayer(playerRole, playerRoles, newState.goingAlone, newState.partnerSittingOut);
    newState.currentPlayer = nextPlayerForTrick;
    newState.gameMessages = [...(newState.gameMessages || []), { type: 'card_played', text: `${playerRole} played ${cardPlayed.rank} of ${cardPlayed.suit}. Next player: ${nextPlayerForTrick}.`, timestamp: new Date().toISOString() }];
    logger.info({ gameId, playerRole, cardPlayed, nextPlayer: nextPlayerForTrick }, `Card played. Next player is ${nextPlayerForTrick}.`);
  }
  return newState;
}

/**
 * Determines the winner of a completed trick.
 *
 * @param {Array<object>} trick Array of cards played in the trick, with {playedBy, suit, rank}.
 * @param {string | null} trumpSuit The trump suit for the current hand. Can be null if no trump.
 * @returns {string} The role of the player who won the trick.
 * @throws {object} Error object with message and errorType.
 */
function determineTrickWinner(trick, trumpSuit) { // Removed leadPlayerRole as it's trick[0].playedBy
  // Input Validation
  if (!Array.isArray(trick)) {
    const error = { message: 'Invalid trick: must be an array.', errorType: 'INVALID_INPUT', details: { trickType: typeof trick } };
    logger.error({ error }, "determineTrickWinner: Invalid trick type.");
    throw error;
  }
  if (trick.length !== 4) {
    const error = { message: 'Trick must have 4 cards to determine a winner.', errorType: 'INVALID_TRICK_STATE', details: { trickLength: trick.length } };
    logger.warn({ error }, error.message); // Warn as it's a game state issue
    throw error;
  }
  if (trumpSuit !== null && typeof trumpSuit !== 'string') {
    const error = { message: 'Invalid trumpSuit: must be a string or null.', errorType: 'INVALID_INPUT', details: { trumpSuitType: typeof trumpSuit } };
    logger.error({ error, trumpSuit }, "determineTrickWinner: Invalid trumpSuit type.");
    throw error;
  }
  // Further validation for card objects within the trick could be added here.

  const leadCard = trick[0];
  if (!leadCard || typeof leadCard.suit !== 'string' || typeof leadCard.playedBy !== 'string') {
     const error = { message: 'Invalid lead card in trick.', errorType: 'INVALID_TRICK_STATE', details: { leadCard } };
     logger.error({ error, trick }, "determineTrickWinner: Invalid lead card.");
     throw error;
  }
  let winningCard = leadCard;

  for (let i = 1; i < trick.length; i++) {
    const currentCard = trick[i];
    if (!currentCard || typeof currentCard.suit !== 'string' || typeof currentCard.playedBy !== 'string') {
        const error = { message: `Invalid card at index ${i} in trick.`, errorType: 'INVALID_TRICK_STATE', details: { card: currentCard, index: i } };
        logger.error({ error, trick }, `determineTrickWinner: Invalid card in trick.`);
        throw error;
    }
    const winningRank = getCardRank(winningCard, trumpSuit, leadCard.suit);
    const currentRank = getCardRank(currentCard, trumpSuit, leadCard.suit);

    if (currentRank > winningRank) {
      winningCard = currentCard;
    }
  }
  logger.debug({ winningCard: winningCard.playedBy, trumpSuit, leadSuit: leadCard.suit, trick }, `Trick winner determined: ${winningCard.playedBy}`);
  return winningCard.playedBy;
}

export { handlePlayCard, determineTrickWinner };
