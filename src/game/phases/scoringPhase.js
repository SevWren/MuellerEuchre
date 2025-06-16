import { updateGameState, resetFullGame } from '../state.js';
import { GAME_PHASES, WINNING_SCORE, TEAMS, PLAYER_ROLES } from '../../config/constants.js'; // Added PLAYER_ROLES
import { getNextPlayer } from '../../utils/players.js'; // Changed getNextDealer to getNextPlayer
import logger from '../../utils/logger.js';

/**
 * Calculates the score for the completed hand and updates the game state.
 * @param {object} gameState The current game state.
 * @returns {object} The updated game state with new scores and phase.
 */
function calculateAndApplyScore(gameState) {
  if (gameState.gamePhase !== GAME_PHASES.SCORING) {
    // This function should only be called when explicitly in SCORING phase.
    // The transition to SCORING phase happens in playingPhase.js
    logger.warn(`[Game ID: ${gameState.gameId}] calculateAndApplyScore called inappropriately during ${gameState.gamePhase}`);
    return gameState;
  }

  let newGameState = { ...gameState };
  const { tricksTaken, makerTeam, goingAlone, players, gameId } = newGameState;

  // Ensure tricksTaken has entries for both teams, even if 0.
  const currentTricksTaken = {
    ...{ [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, // Default to 0 for both
    ...tricksTaken
  };


  const makingTeamTricks = currentTricksTaken[makerTeam] || 0; // Default to 0 if makerTeam not in tricksTaken
  const opponentTeam = makerTeam === TEAMS.TEAM_NS ? TEAMS.TEAM_EW : TEAMS.TEAM_NS;
  const opponentTricks = currentTricksTaken[opponentTeam] || 0; // Default to 0

  let pointsScored = 0;
  let scoringTeam = null;
  let message = "";

  if (makingTeamTricks === 5) { // Makers took all 5 tricks (March)
    pointsScored = goingAlone ? 4 : 2; // 4 points if alone, 2 if not
    scoringTeam = makerTeam;
    message = `Team ${makerTeam} achieved a march${goingAlone ? ' (alone)' : ''}! ${pointsScored} points.`;
  } else if (makingTeamTricks >= 3) { // Makers made their bid (3 or 4 tricks)
    pointsScored = goingAlone ? 1 : 1; // Standard 1 point.
                                      // Rule variation: some play that going alone and making 3 or 4 tricks scores 4 points.
                                      // Current implementation: 1 point for 3-4 tricks (even if alone), 2 for 5 tricks (not alone), 4 for 5 tricks (alone).
    scoringTeam = makerTeam;
    message = `Team ${makerTeam} made their bid${goingAlone && makingTeamTricks < 5 ? ' (alone)' : ''}. ${pointsScored} point.`;
    // If a rule variation (e.g., 4 points for any successful "go alone" bid) is desired, it would be adjusted here.
    // e.g., if (goingAlone) pointsScored = 4;
  } else { // Makers were euchred (took less than 3 tricks)
    pointsScored = 2; // Opponent team gets 2 points
    scoringTeam = opponentTeam;
    message = `Team ${makerTeam} was euchred! Team ${opponentTeam} gets ${pointsScored} points.`;
  }

  const newTeamScores = {
    ...{ [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, // Ensure both teams exist
    ...newGameState.teamScores
  };

  if (scoringTeam) {
    newTeamScores[scoringTeam] = (newTeamScores[scoringTeam] || 0) + pointsScored;
  }

  const scoreMessage = `Current scores: Team NS ${newTeamScores[TEAMS.TEAM_NS]}, Team EW ${newTeamScores[TEAMS.TEAM_EW]}.`;

  newGameState = updateGameState(gs => ({
    ...gs,
    teamScores: newTeamScores,
    message: `${message} ${scoreMessage}`,
    previousTricksTaken: { ...currentTricksTaken }, // Keep a record of last hand's tricks
    tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, // Reset for next hand
    currentTrick: [],
    // lastTrickWinner: null, // Optional: Clear if not handled by startNewHand logic elsewhere
  }));

  logger.info(`[Game ID: ${gameId}] Scoring complete. ${message}. Scores: NS ${newTeamScores[TEAMS.TEAM_NS]}, EW ${newTeamScores[TEAMS.TEAM_EW]}`);
  return checkGameOver(newGameState);
}

/**
 * Checks if the game is over (a team reached WINNING_SCORE).
 * If over, transitions to GAME_OVER. Otherwise, transitions to DEALING.
 * @param {object} gameState The current game state.
 * @returns {object} The updated game state.
 */
function checkGameOver(gameState) {
  let newGameState = { ...gameState };
  const { teamScores, gameId, dealer: currentDealer } = newGameState; // Removed players from destructuring

  const nsScore = teamScores[TEAMS.TEAM_NS] || 0;
  const ewScore = teamScores[TEAMS.TEAM_EW] || 0;

  if (nsScore >= WINNING_SCORE || ewScore >= WINNING_SCORE) {
    const winningTeam = nsScore >= WINNING_SCORE ? TEAMS.TEAM_NS : TEAMS.TEAM_EW;
    const finalMessage = `Game Over! Team ${winningTeam} wins with ${teamScores[winningTeam]} points! Final Scores: Team NS ${nsScore}, Team EW ${ewScore}.`;
    newGameState = updateGameState(gs => ({
      ...gs,
      gamePhase: GAME_PHASES.GAME_OVER,
      winningTeam: winningTeam,
      currentPlayer: null,
      message: finalMessage,
    }));
    logger.info(`[Game ID: ${gameId}] Game over. Winner: ${winningTeam}. ${finalMessage}`);
  } else {
    // Determine next dealer for the new hand using getNextPlayer
    // PLAYER_ROLES from constants should provide the ordered list of roles.
    const nextDealerRole = getNextPlayer(currentDealer, PLAYER_ROLES);

    const transitionMessage = `Hand scored. Next hand starting. New dealer: ${nextDealerRole}. Current scores: Team NS ${nsScore}, Team EW ${ewScore}.`;
    newGameState = updateGameState(gs => {
      const currentMessage = gs.message; // Get message from the state being updated
      return {
        ...gs,
        gamePhase: GAME_PHASES.DEALING,
        dealer: nextDealerRole,
        currentPlayer: nextDealerRole, // Dealer starts the dealing phase (or bidding after dealing)
        trumpSuit: null,
        makerTeam: null,
        goingAlone: false,
        playerGoingAlone: null, // Also reset who was going alone
        partnerSittingOut: null,
        bids: [],
        orderUpTurn: null, // Who's turn is it to order up/pass
        kitty: [], // Kitty should be reset
        turnCard: null,
        leadSuit: null, // Reset lead suit for the new hand
        message: `${currentMessage} ${transitionMessage}`, // Prepend existing message
      };
    });
    logger.info(`[Game ID: ${gameId}] Hand scored. Transitioning to DEALING. New dealer: ${nextDealerRole}.`);
  }
  return newGameState;
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
