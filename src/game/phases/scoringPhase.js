// import { updateGameState, resetFullGame } from '../state.js'; // No longer using global updateGameState directly for phase logic. resetFullGame might still be used by gameOverHandlers.
import { resetFullGame } from '../state.js'; // Retain for handleNewGameRequest
import { GAME_PHASES, WINNING_SCORE, TEAMS, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer } from '../../utils/players.js';
import logger from '../../utils/logger.js';
import { gameRepository } from '../../db/gameRepository.js'; // Changed import
import { InvalidPhaseError, PhaseLogicError } from '../logic/errors.js';

/**
 * Calculates the score for the completed hand based on tricks taken, the maker team, and whether they went alone.
 * Updates `teamScores`, `message`, `previousTricksTaken`, and resets `tricksTaken` and `currentTrick`.
 * This function mutates the passed `gameState` object and then calls `checkGameOver` which handles further state changes and persistence.
 *
 * @async
 * @param {object} gameState - The current game state.
 * @param {string} gameState.gamePhase - Current phase, must be `SCORING`.
 * @param {string} gameState.makerTeam - The team that made trump.
 * @param {object} gameState.tricksTaken - Object tracking tricks taken by each team (e.g., `{[TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2}`).
 * @param {boolean} [gameState.goingAlone] - Whether the maker team's player went alone.
 * @param {string} [gameState.gameId] - ID of the game (for logging and persistence).
 * @param {object} gameState.teamScores - Current scores for each team.
 * @param {string} [gameState.message] - Current game message.
 * @param {Array<object>} [gameState.currentTrick] - Current trick cards (should be empty or reset).
 * @returns {Promise<object>} A promise that resolves to the updated game state after scoring and game over check.
 * @throws {InvalidPhaseError} If not in the `SCORING` phase.
 * @throws {PhaseLogicError} If `makerTeam` is not defined in `gameState`.
 */
async function calculateAndApplyScore(gameState) {
  if (gameState.gamePhase !== GAME_PHASES.SCORING) {
    throw new InvalidPhaseError(`calculateAndApplyScore called inappropriately during ${gameState.gamePhase}.`);
  }

  if (!gameState.makerTeam) {
    throw new PhaseLogicError("Cannot calculate score: makerTeam is not defined.");
  }

  const { tricksTaken, makerTeam, goingAlone, gameId } = gameState;

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
 * Checks if the game is over by comparing team scores to `WINNING_SCORE`.
 * If the game is over, updates `gamePhase` to `GAME_OVER`, sets `winningTeam`, and updates messages.
 * If not over, resets state for a new hand and transitions to `DEALING` phase.
 * This function mutates the passed `gameState` object and then persists it using `gameRepository.updateGame`.
 *
 * @async
 * @param {object} gameState - The current game state (expected to be mutable or a fresh copy).
 * @param {object} gameState.teamScores - Current scores for each team.
 * @param {string} gameState.gameId - ID of the game.
 * @param {string} gameState.dealer - Role of the current dealer.
 * @param {string} gameState.message - Current game message string, will be appended to.
 * @returns {Promise<object>} A promise that resolves to the (potentially modified and persisted) game state.
 */
async function checkGameOver(gameState) { // Renamed function
  const { teamScores, gameId, dealer: currentDealer } = gameState;

  const nsScore = teamScores[TEAMS.TEAM_NS] || 0;
  const ewScore = teamScores[TEAMS.TEAM_EW] || 0;

  let winningTeam = null;
  if (nsScore >= WINNING_SCORE) winningTeam = TEAMS.TEAM_NS;
  else if (ewScore >= WINNING_SCORE) winningTeam = TEAMS.TEAM_EW;

  if (winningTeam) {
    const gameOverMessagePart = `Game Over! Team ${winningTeam} wins with ${teamScores[winningTeam]} points! Final Scores: Team NS ${nsScore}, Team EW ${ewScore}.`;
    gameState.gamePhase = GAME_PHASES.GAME_OVER;
    gameState.winningTeam = winningTeam;
    gameState.currentPlayer = null; // No current player when game is over
    // Prepend to keep the scoring details from calculateAndApplyScore
    gameState.message = `${gameState.message} ${gameOverMessagePart}`;
    logger.info(`[Game ID: ${gameId}] Game over. Winner: ${winningTeam}. ${gameOverMessagePart}`);
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
  await gameRepository.updateGame(gameId, gameState); // Changed to use gameRepository.updateGame
  logger.info(`[Game ID: ${gameId}] Game state saved after scoring/phase transition. New phase: ${gameState.gamePhase}`);
  return gameState;
}

/**
 * Handles a request to start a new game, typically initiated when the current game is in the `GAME_OVER` state.
 * It calls `resetFullGame` to generate a fresh game state for a new lobby.
 *
 * @param {object} gameState - The current game state.
 * @param {string} gameState.gamePhase - Current phase, must be `GAME_OVER`.
 * @param {string} [gameState.gameId] - ID of the game (for logging).
 * @returns {object} A completely reset game state, suitable for starting a new game in the lobby.
 * @throws {InvalidPhaseError} If the game is not in the `GAME_OVER` phase.
 */
function handleNewGameRequest(gameState) {
  if (gameState.gamePhase !== GAME_PHASES.GAME_OVER) {
    throw new InvalidPhaseError('Can only start a new game from GAME_OVER phase.');
  }
  logger.info(`[Game ID: ${gameState.gameId}] Handling new game request.`);
  return resetFullGame();
}

export { calculateAndApplyScore, checkGameOver, handleNewGameRequest };
