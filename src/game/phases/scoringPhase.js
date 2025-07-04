import {
  GAME_PHASES,
  WINNING_SCORE,
  TEAMS,
  PLAYER_ROLES,
} from "../../config/constants.js";
import { getNextPlayer } from "../../utils/players.js";
import logger from "../../utils/logger.js";
import { InvalidPhaseError, PhaseLogicError } from "../logic/errors.js";

/**
 * Calculates the score for the completed hand and updates the game state.
 * This function will then call `checkGameOver` which handles persistence.
 * @param {object} gameState The current game state.
 * @returns {Promise<object>} A promise that resolves to the updated game state after scoring and game over check.
 * @throws {InvalidPhaseError} If not in the SCORING phase.
 * @throws {PhaseLogicError} If `makerTeam` is not defined.
 */
async function calculateAndApplyScore(gameState) {
  if (gameState.gamePhase !== GAME_PHASES.SCORING) {
    throw new InvalidPhaseError(
      `calculateAndApplyScore called inappropriately during ${gameState.gamePhase}.`,
    );
  }

  if (!gameState.makerTeam) {
    throw new PhaseLogicError(
      "Cannot calculate score: makerTeam is not defined.",
    );
  }

  let newGameState = JSON.parse(JSON.stringify(gameState)); // Work on a clone

  const { tricksTaken, makerTeam, goingAlone, gameId } = newGameState;

  newGameState.tricksTaken = {
    [TEAMS.TEAM_NS]: newGameState.tricksTaken?.[TEAMS.TEAM_NS] || 0,
    [TEAMS.TEAM_EW]: newGameState.tricksTaken?.[TEAMS.TEAM_EW] || 0,
  };

  const makingTeamTricks = newGameState.tricksTaken[makerTeam] || 0;
  const opponentTeam =
    makerTeam === TEAMS.TEAM_NS ? TEAMS.TEAM_EW : TEAMS.TEAM_NS;

  let pointsScored = 0;
  let scoringTeam = null;
  let message = "";

  if (makingTeamTricks === 5) {
    // Makers took all 5 tricks (March)
    pointsScored = goingAlone ? 4 : 2;
    scoringTeam = makerTeam;
    message = `Team ${makerTeam} achieved a march${goingAlone ? " (alone)" : ""}! ${pointsScored} points.`;
  } else if (makingTeamTricks >= 3) {
    // Makers made their bid
    pointsScored = goingAlone ? 1 : 1;
    scoringTeam = makerTeam;
    message = `Team ${makerTeam} made their bid${goingAlone && makingTeamTricks < 5 ? " (alone)" : ""}. ${pointsScored} point.`;
  } else {
    // Makers were euchred
    pointsScored = 2;
    scoringTeam = opponentTeam;
    message = `Team ${makerTeam} was euchred! Team ${opponentTeam} gets ${pointsScored} points.`;
  }

  // Ensure teamScores is initialized
  newGameState.teamScores = {
    [TEAMS.TEAM_NS]: newGameState.teamScores?.[TEAMS.TEAM_NS] || 0,
    [TEAMS.TEAM_EW]: newGameState.teamScores?.[TEAMS.TEAM_EW] || 0,
  };

  if (scoringTeam) {
    newGameState.teamScores[scoringTeam] += pointsScored;
  }

  const scoreMessage = `Current scores: Team NS ${newGameState.teamScores[TEAMS.TEAM_NS]}, Team EW ${newGameState.teamScores[TEAMS.TEAM_EW]}.`;

  newGameState.message = `${message} ${scoreMessage}`;
  newGameState.previousTricksTaken = { ...newGameState.tricksTaken }; // Keep a record
  newGameState.tricksTaken = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }; // Reset for next hand
  newGameState.currentTrick = [];

  logger.info(
    `[Game ID: ${gameId}] Scoring complete. ${message}. Scores: NS ${newGameState.teamScores[TEAMS.TEAM_NS]}, EW ${newGameState.teamScores[TEAMS.TEAM_EW]}`,
  );

  return checkGameOver(newGameState);
}

/**
 * Checks if the game is over and updates phase. Persists the state.
 * @param {object} gameState The current game state (expected to be mutable or a fresh copy).
 * @returns {Promise<object>} A promise that resolves to the updated game state.
 */
function checkGameOver(gameState) {
  const { teamScores, gameId, dealer: currentDealer } = gameState;

  const nsScore = teamScores[TEAMS.TEAM_NS] || 0;
  const ewScore = teamScores[TEAMS.TEAM_EW] || 0;

  let winningTeam = null;
  if (nsScore >= WINNING_SCORE) winningTeam = TEAMS.TEAM_NS;
  else if (ewScore >= WINNING_SCORE) winningTeam = TEAMS.TEAM_EW;

  let newGameState = JSON.parse(JSON.stringify(gameState)); // Ensure we work on a clone

  if (winningTeam) {
    const gameOverMessagePart = `Game Over! Team ${winningTeam} wins with ${teamScores[winningTeam]} points! Final Scores: Team NS ${nsScore}, Team EW ${ewScore}.`;
    newGameState.gamePhase = GAME_PHASES.GAME_OVER;
    newGameState.winningTeam = winningTeam;
    newGameState.currentPlayer = null;
    newGameState.message = `${newGameState.message} ${gameOverMessagePart}`;
    logger.info(
      `[Game ID: ${gameId}] Game over. Winner: ${winningTeam}. ${gameOverMessagePart}`,
    );
  } else {
    const nextDealerRole = getNextPlayer(currentDealer, PLAYER_ROLES);
    const transitionMessage = `Hand scored. Next hand starting. New dealer: ${nextDealerRole}. Current scores: Team NS ${nsScore}, Team EW ${ewScore}.`;

    newGameState.gamePhase = GAME_PHASES.DEALING;
    newGameState.dealer = nextDealerRole;
    newGameState.currentPlayer = nextDealerRole;
    newGameState.trumpSuit = null;
    newGameState.makerTeam = null;
    newGameState.goingAlone = false;
    newGameState.playerGoingAlone = null;
    newGameState.partnerSittingOut = null;
    newGameState.bids = [];
    newGameState.orderUpTurn = null;
    newGameState.kitty = [];
    newGameState.turnCard = null;
    newGameState.leadSuit = null;
    newGameState.message = `${newGameState.message} ${transitionMessage}`;
    logger.info(
      `[Game ID: ${gameId}] Hand scored. Transitioning to DEALING. New dealer: ${nextDealerRole}.`,
    );
  }
  return newGameState;
}

/**
 * Handles a request to start a new game from the GAME_OVER state.
 * @param {object} gameState The current game state.
 * @returns {object} A completely reset game state for a new lobby.
 * @throws {InvalidPhaseError} If the game is not in the GAME_OVER phase.
 */
export { calculateAndApplyScore, checkGameOver };
