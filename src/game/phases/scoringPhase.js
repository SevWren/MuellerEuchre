// import { updateGameState, resetFullGame } from '../state.js'; // No longer using global updateGameState directly for phase logic. resetFullGame might still be used by gameOverHandlers.
import { resetFullGame } from '../state.js'; // Retain for handleNewGameRequest
import { GAME_PHASES, WINNING_SCORE, TEAMS, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer } from '../../utils/players.js';
import logger from '../../utils/logger.js';
import { updateGame } from '../../db/gameRepository.js'; // Import for persistence

/**
 * Calculates the score for the completed hand and updates the game state, including persistence.
 * @param {object} gameState The current game state (expected to be mutable or a fresh copy).
 * @returns {Promise<object>} A promise that resolves to the updated game state.
 */
async function calculateAndApplyScore(gameState) {
  // This function is now responsible for mutating and then saving the gameState.
  // Ensure the calling context (e.g., a socket handler) is aware of this.
  if (gameState.gamePhase !== GAME_PHASES.SCORING) {
    logger.warn(`[Game ID: ${gameState.gameId}] calculateAndApplyScore called inappropriately during ${gameState.gamePhase}. Current state will be returned and saved.`);
    // If called incorrectly, we might still want to save the current state to be safe.
    await updateGame(gameState.gameId, gameState);
    return gameState;
  }

  // gameState is modified directly or is a deep copy that will be returned.
  const { tricksTaken, makerTeam, goingAlone, gameId } = gameState; // Removed players, not directly used here

  // Ensure tricksTaken has entries for both teams, even if 0.
  // Ensure tricksTaken is initialized for both teams
  gameState.tricksTaken = {
    [TEAMS.TEAM_NS]: gameState.tricksTaken?.[TEAMS.TEAM_NS] || 0,
    [TEAMS.TEAM_EW]: gameState.tricksTaken?.[TEAMS.TEAM_EW] || 0,
  };

  const makingTeamTricks = gameState.tricksTaken[makerTeam] || 0;
  const opponentTeam = makerTeam === TEAMS.TEAM_NS ? TEAMS.TEAM_EW : TEAMS.TEAM_NS;
  // opponentTricks not strictly needed for logic below but good for clarity if used

  let pointsScored = 0;
  let scoringTeam = null;
  let message = "";

  if (makingTeamTricks === 5) { // Makers took all 5 tricks (March)
    pointsScored = goingAlone ? 4 : 2;
    scoringTeam = makerTeam;
    message = `Team ${makerTeam} achieved a march${goingAlone ? ' (alone)' : ''}! ${pointsScored} points.`;
  } else if (makingTeamTricks >= 3) { // Makers made their bid
    pointsScored = goingAlone ? 1 : 1; // Standard 1 point for 3-4 tricks, even if alone.
                                      // March (5 tricks) when alone is 4 points. March (5 tricks) not alone is 2 points.
    scoringTeam = makerTeam;
    message = `Team ${makerTeam} made their bid${goingAlone && makingTeamTricks < 5 ? ' (alone)' : ''}. ${pointsScored} point.`;
  } else { // Makers were euchred
    pointsScored = 2;
    scoringTeam = opponentTeam;
    message = `Team ${makerTeam} was euchred! Team ${opponentTeam} gets ${pointsScored} points.`;
  }

  // Ensure teamScores is initialized
  gameState.teamScores = {
    [TEAMS.TEAM_NS]: gameState.teamScores?.[TEAMS.TEAM_NS] || 0,
    [TEAMS.TEAM_EW]: gameState.teamScores?.[TEAMS.TEAM_EW] || 0,
  };

  if (scoringTeam) {
    gameState.teamScores[scoringTeam] += pointsScored;
  }

  const scoreMessage = `Current scores: Team NS ${gameState.teamScores[TEAMS.TEAM_NS]}, Team EW ${gameState.teamScores[TEAMS.TEAM_EW]}.`;

  gameState.message = `${message} ${scoreMessage}`;
  gameState.previousTricksTaken = { ...gameState.tricksTaken }; // Keep a record
  gameState.tricksTaken = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }; // Reset for next hand
  gameState.currentTrick = [];
  // Optional: clear other hand-specific fields if not handled by startNewHand logic

  logger.info(`[Game ID: ${gameId}] Scoring complete. ${message}. Scores: NS ${gameState.teamScores[TEAMS.TEAM_NS]}, EW ${gameState.teamScores[TEAMS.TEAM_EW]}`);

  // After scoring, check if game is over. This will also persist.
  return await checkGameOver(gameState); // Renamed call
}

/**
 * Checks if the game is over and updates phase. Persists the state.
 * @param {object} gameState The current game state (expected to be mutable or a fresh copy).
 * @returns {Promise<object>} A promise that resolves to the updated game state.
 */
async function checkGameOver(gameState) { // Renamed function
  const { teamScores, gameId, dealer: currentDealer } = gameState;

  const nsScore = teamScores[TEAMS.TEAM_NS] || 0;
  const ewScore = teamScores[TEAMS.TEAM_EW] || 0;

  let winningTeam = null;
  if (nsScore >= WINNING_SCORE) winningTeam = TEAMS.TEAM_NS;
  else if (ewScore >= WINNING_SCORE) winningTeam = TEAMS.TEAM_EW;

  if (winningTeam) {
    const finalMessage = `Game Over! Team ${winningTeam} wins with ${teamScores[winningTeam]} points! Final Scores: Team NS ${nsScore}, Team EW ${ewScore}.`;
    gameState.gamePhase = GAME_PHASES.GAME_OVER;
    gameState.winningTeam = winningTeam;
    gameState.currentPlayer = null; // No current player when game is over
    gameState.message = finalMessage;
    logger.info(`[Game ID: ${gameId}] Game over. Winner: ${winningTeam}. ${finalMessage}`);
  } else {
    const nextDealerRole = getNextPlayer(currentDealer, PLAYER_ROLES);
    const transitionMessage = `Hand scored. Next hand starting. New dealer: ${nextDealerRole}. Current scores: Team NS ${nsScore}, Team EW ${ewScore}.`;

    // Reset for new hand
    gameState.gamePhase = GAME_PHASES.DEALING;
    gameState.dealer = nextDealerRole;
    gameState.currentPlayer = nextDealerRole; // Dealer starts the dealing phase
    gameState.trumpSuit = null;
    gameState.makerTeam = null;
    gameState.goingAlone = false;
    gameState.playerGoingAlone = null;
    gameState.partnerSittingOut = null;
    gameState.bids = [];
    gameState.orderUpTurn = null;
    gameState.kitty = [];
    gameState.turnCard = null;
    gameState.leadSuit = null;
    // Prepend existing message (from scoring) with transition message for continuity
    gameState.message = `${gameState.message} ${transitionMessage}`;
    logger.info(`[Game ID: ${gameId}] Hand scored. Transitioning to DEALING. New dealer: ${nextDealerRole}.`);
  }

  // Persist the state after phase transition (GAME_OVER or DEALING)
  await updateGame(gameId, gameState);
  logger.info(`[Game ID: ${gameId}] Game state saved after scoring/phase transition. New phase: ${gameState.gamePhase}`);
  return gameState;
}

/**
 * Handles a request to start a new game from the GAME_OVER state.
 * @param {object} gameState The current game state.
 * @returns {object} A completely reset game state for a new lobby.
 */
function handleNewGameRequest(gameState) {
  if (gameState.gamePhase !== GAME_PHASES.GAME_OVER) {
    throw new Error('Can only start a new game from GAME_OVER phase.');
  }
  logger.info(`[Game ID: ${gameState.gameId}] Handling new game request.`);
  // resetFullGame is expected to set up a new game.
  // The concept of "keeping players" by passing them to resetFullGame is removed
  // as resetFullGame reinitializes players. Client connection logic would handle rejoining/reassigning.
  // For simplicity, we are just calling resetFullGame() here.
  // If specific player data needed to be preserved across a reset (e.g. user accounts, stats),
  // that would be a more complex feature involving a separate data store or different reset logic.
  return resetFullGame();
}

export { calculateAndApplyScore, checkGameOver, handleNewGameRequest };
