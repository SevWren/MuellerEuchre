import { resetFullGame } from '../state.js';
import { GAME_PHASES, WINNING_SCORE, TEAMS, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer } from '../../utils/players.js';
import logger from '../../utils/logger.js';
import { updateGame } from '../../db/gameRepository.js';

/**
 * Calculates the score for the completed hand and updates the game state, including persistence.
 * @param {object} gameState The current game state.
 * @returns {Promise<object>} A promise that resolves to the updated game state.
 * @throws {object} Error object with message, errorType, and details.
 */
async function calculateAndApplyScore(gameState) {
  // Input Validation
  if (!gameState || typeof gameState !== 'object') {
    const error = { message: 'Invalid gameState: must be an object.', errorType: 'INVALID_INPUT', details: { gameStateProvided: !!gameState } };
    // Cannot log gameId if gameState itself is invalid
    logger.error({ error }, "calculateAndApplyScore: Invalid gameState provided.");
    throw error;
  }
  const gameId = gameState.gameId; // For logging once gameState is confirmed to be an object
  if (typeof gameId !== 'string' || !gameId.trim()) {
    const error = { message: 'Invalid gameState: gameId is required.', errorType: 'INVALID_INPUT', details: { gameId } };
    logger.error({ error }, "calculateAndApplyScore: Missing or invalid gameId.");
    throw error;
  }
  if (!gameState.players || typeof gameState.players !== 'object' ||
      !gameState.tricksTaken || typeof gameState.tricksTaken !== 'object' ||
      !gameState.teamScores || typeof gameState.teamScores !== 'object') {
    const error = { message: 'Invalid gameState: missing players, tricksTaken, or teamScores.', errorType: 'PRECONDITION_FAILED', details: { gameId } };
    logger.error({ error, gameId }, "calculateAndApplyScore: Invalid gameState structure.");
    throw error;
  }

  const newState = JSON.parse(JSON.stringify(gameState));
  logger.info({ gameId: newState.gameId }, "Calculating and applying score.");

  if (newState.gamePhase !== GAME_PHASES.SCORING) {
    const error = { message: "Cannot calculate score: Not in SCORING phase.", errorType: "INVALID_PHASE", details: { currentPhase: newState.gamePhase, gameId: newState.gameId } };
    logger.warn({ error, gameId: newState.gameId }, error.message);
    // Even if in wrong phase, persist any prior state changes before throwing for safety, then throw.
    // However, the prompt implies throwing instead of returning. If this function is called at the wrong time,
    // it's a logic flaw elsewhere. We'll throw as requested. The caller should handle this.
    // No, if it's an invalid phase, we should not proceed to save. We should throw.
    // await updateGame(newState.gameId, newState); // Removed this save on invalid phase
    throw error;
  }

  if (!newState.makerTeam) {
    const error = { message: "Cannot calculate score: makerTeam is not defined.", errorType: "INTERNAL_STATE_ERROR", details: { gameId: newState.gameId } };
    logger.error({ error, gameId: newState.gameId }, error.message);
    throw error;
  }

  newState.tricksTaken = {
    [TEAMS.TEAM_NS]: newState.tricksTaken?.[TEAMS.TEAM_NS] || 0,
    [TEAMS.TEAM_EW]: newState.tricksTaken?.[TEAMS.TEAM_EW] || 0,
  };

  const makingTeamTricks = newState.tricksTaken[newState.makerTeam] || 0;
  const opponentTeam = newState.makerTeam === TEAMS.TEAM_NS ? TEAMS.TEAM_EW : TEAMS.TEAM_NS;

  let pointsScored = 0;
  let scoringTeam = null;
  let message = "";

  if (makingTeamTricks === 5) {
    pointsScored = newState.goingAlone ? 4 : 2;
    scoringTeam = newState.makerTeam;
    message = `Team ${newState.makerTeam} achieved a march${newState.goingAlone ? ' (alone)' : ''}! ${pointsScored} points.`;
  } else if (makingTeamTricks >= 3) {
    pointsScored = newState.goingAlone && makingTeamTricks < 5 ? 1 : 1; // Standard 1 point for 3-4 if alone (march is 4)
    scoringTeam = newState.makerTeam;
    message = `Team ${newState.makerTeam} made their bid${newState.goingAlone && makingTeamTricks < 5 ? ' (alone)' : ''}. ${pointsScored} point.`;
  } else {
    pointsScored = 2;
    scoringTeam = opponentTeam;
    message = `Team ${newState.makerTeam} was euchred! Team ${opponentTeam} gets ${pointsScored} points.`;
  }

  newState.teamScores = {
    [TEAMS.TEAM_NS]: newState.teamScores?.[TEAMS.TEAM_NS] || 0,
    [TEAMS.TEAM_EW]: newState.teamScores?.[TEAMS.TEAM_EW] || 0,
  };

  if (scoringTeam) {
    newState.teamScores[scoringTeam] += pointsScored;
  }

  const scoreMessage = `Current scores: Team NS ${newState.teamScores[TEAMS.TEAM_NS]}, Team EW ${newState.teamScores[TEAMS.TEAM_EW]}.`;
  newState.message = `${message} ${scoreMessage}`;
  newState.previousTricksTaken = { ...newState.tricksTaken };
  newState.tricksTaken = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 };
  newState.currentTrick = [];

  logger.info({ gameId: newState.gameId, message, scores: newState.teamScores }, "Scoring complete.");
  return await checkGameOver(newState); // Pass the modified newState
}

/**
 * Checks if the game is over and updates phase. Persists the state.
 * @param {object} gameState The current game state.
 * @returns {Promise<object>} A promise that resolves to the updated game state.
 * @throws {object} Error object with message, errorType, and details.
 */
async function checkGameOver(gameState) {
  // Input Validation
  if (!gameState || typeof gameState !== 'object') {
    const error = { message: 'Invalid gameState: must be an object.', errorType: 'INVALID_INPUT', details: { gameStateProvided: !!gameState } };
    logger.error({ error }, "checkGameOver: Invalid gameState provided.");
    throw error;
  }
  const gameId = gameState.gameId;
  if (typeof gameId !== 'string' || !gameId.trim()) {
    const error = { message: 'Invalid gameState: gameId is required.', errorType: 'INVALID_INPUT', details: { gameId } };
    logger.error({ error }, "checkGameOver: Missing or invalid gameId.");
    throw error;
  }
  if (!gameState.teamScores || typeof gameState.teamScores !== 'object' || typeof gameState.dealer !== 'string' || !gameState.dealer.trim()) {
    const error = { message: 'Invalid gameState: missing teamScores or dealer.', errorType: 'PRECONDITION_FAILED', details: { gameId } };
    logger.error({ error, gameId }, "checkGameOver: Invalid gameState structure.");
    throw error;
  }

  const newState = JSON.parse(JSON.stringify(gameState));
  logger.info({ gameId: newState.gameId }, "Checking game over status.");

  const nsScore = newState.teamScores[TEAMS.TEAM_NS] || 0;
  const ewScore = newState.teamScores[TEAMS.TEAM_EW] || 0;

  let winningTeam = null;
  if (nsScore >= WINNING_SCORE) winningTeam = TEAMS.TEAM_NS;
  else if (ewScore >= WINNING_SCORE) winningTeam = TEAMS.TEAM_EW;

  if (winningTeam) {
    const finalMessage = `Game Over! Team ${winningTeam} wins with ${newState.teamScores[winningTeam]} points! Final Scores: Team NS ${nsScore}, Team EW ${ewScore}.`;
    newState.gamePhase = GAME_PHASES.GAME_OVER;
    newState.winningTeam = winningTeam;
    newState.currentPlayer = null;
    newState.message = finalMessage;
    logger.info({ gameId: newState.gameId, winner: winningTeam, finalMessage }, "Game over.");
  } else {
    const nextDealerRole = getNextPlayer(newState.dealer, PLAYER_ROLES);
    const transitionMessage = `Hand scored. Next hand starting. New dealer: ${nextDealerRole}. Current scores: Team NS ${nsScore}, Team EW ${ewScore}.`;

    newState.gamePhase = GAME_PHASES.DEALING;
    newState.dealer = nextDealerRole;
    newState.currentPlayer = nextDealerRole;
    newState.trumpSuit = null;
    newState.makerTeam = null;
    newState.goingAlone = false;
    newState.playerGoingAlone = null;
    newState.partnerSittingOut = null;
    newState.bids = [];
    // Removed orderUpTurn, kitty, turnCard, leadSuit as they are typically reset/set by dealing logic
    // If they must be cleared here, they can be added back.
    // newState.orderUpTurn = null; // Example if needed
    // newState.kitty = []; // Example if needed
    // newState.turnCard = null; // Example if needed
    // newState.leadSuit = null; // Example if needed
    newState.message = `${newState.message} ${transitionMessage}`; // Appends to scoring message
    logger.info({ gameId: newState.gameId, newDealer: nextDealerRole }, "Hand scored. Transitioning to DEALING.");
  }

  await updateGame(newState.gameId, newState); // Persist using the cloned and modified newState
  logger.info({ gameId: newState.gameId, newPhase: newState.gamePhase }, "Game state saved after checkGameOver.");
  return newState;
}

/**
 * Handles a request to start a new game from the GAME_OVER state.
 * @param {object} gameState The current game state.
 * @returns {object} A completely reset game state for a new lobby.
 * @throws {object} Error object with message, errorType, and details.
 */
function handleNewGameRequest(gameState) {
  // Input Validation
  if (!gameState || typeof gameState !== 'object' || typeof gameState.gamePhase !== 'string' || typeof gameState.gameId !== 'string' ) {
    const error = { message: 'Invalid gameState: must be an object with gamePhase and gameId.', errorType: 'INVALID_INPUT', details: { gameStateProvided: !!gameState } };
    logger.error({ error, gameId: gameState?.gameId }, "handleNewGameRequest: Invalid gameState provided.");
    throw error;
  }
  // Cloning is less critical here as we don't modify and reuse `gameState` before calling `resetFullGame`.
  // However, for consistency in accessing properties like gameId for logging:
  const currentPhase = gameState.gamePhase;
  const gameId = gameState.gameId;


  if (currentPhase !== GAME_PHASES.GAME_OVER) {
    const error = { message: "Can only start a new game from GAME_OVER phase.", errorType: "INVALID_PHASE", details: { currentPhase, gameId } };
    logger.warn({ error, gameId }, error.message);
    throw error;
  }
  logger.info({ gameId }, "Handling new game request.");
  return resetFullGame(); // resetFullGame creates a new state object.
}

export { calculateAndApplyScore, checkGameOver, handleNewGameRequest };
