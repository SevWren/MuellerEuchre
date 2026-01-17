/**
 * @module game/phases/endGame
 * @description Manages the end-game phase of an Euchre game, including game over conditions,
 * final score calculation, and new game initialization. This module handles the transition
 * from active play to game completion, including winner determination and match statistics.
 *
 * @see {@link module:src/game/phases/scoringPhase} - Previous phase that triggers end-game checks
 * @see {@link module:src/config/constants} - For GAME_PHASES and TEAMS constants
 * @see {@link module:test/game/phases/endGame.unit.test.js} for test coverage
 *
 * @example
 * // In a game flow controller:
 * if (currentPhase === GAME_PHASES.END_GAME) {
 *   const updatedState = checkGameOver(gameState);
 *   if (updatedState.gameOver) {
 *     // Handle game over UI/cleanup
 *   }
 * }
 *
 * @requires module:src/config/constants
 * @requires module:src/utils/logger
 */

import { GAME_PHASES, WINNING_SCORE, TEAMS } from "../../config/constants.js";
import { log as defaultLogger } from "../../utils/logger.js";

/**
 * Creates an instance of the endGame module with the specified logger
 * @param {Object} [dependencies] - Dependencies
 * @param {Function} [dependencies.log] - Logger function (defaults to defaultLogger)
 * @returns {Object} End game module functions
 */
function createEndGameModule({ log = defaultLogger } = {}) {

/**
 * @typedef {Object} PlayerState
 * @property {string} id - The unique ID of the player.
 * @property {string} name - The display name of the player.
 * @property {string} teamId - The ID of the team the player belongs to (e.g., 'TEAM_NS', 'TEAM_EW').
 */

/**
 * @typedef {Object} TrickResult
 * @property {string} team - The ID of the team that won the trick (e.g., 'TEAM_NS', 'TEAM_EW').
 */

/**
 * @typedef {Object} MatchStats
 * @property {number} gamesPlayed - Total number of games played in the match.
 * @property {Object.<keyof typeof TEAMS, number>} teamWins - Number of wins for each team.
 * @property {string} lastUpdated - ISO timestamp of the last update.
 */

/**
 * @typedef {Object} GameMessage
 * @property {string} type - Message type (e.g., 'game_over', 'score', 'system').
 * @property {string} text - Message content.
 * @property {boolean} important - True if the message is important for display.
 * @property {string} [team] - Optional team ID associated with the message.
 */

/**
 * @typedef {Object} GameState
 * @property {string} gameId - Unique identifier for the game session.
 * @property {keyof typeof GAME_PHASES} gamePhase - Current phase of the game.
 * @property {Object.<string, PlayerState>} players - Map of player roles to player data.
 * @property {string} currentPlayer - Role of the current player.
 * @property {string} dealer - Role of the current dealer.
 * @property {keyof typeof TEAMS} makerTeam - The team that made trump for the current hand.
 * @property {TrickResult[]} tricks - Array of completed trick results for the current hand.
 * @property {Object.<keyof typeof TEAMS, number>} scores - Current scores for each team.
 * @property {boolean} [gameOver=false] - True if the game has ended.
 * @property {keyof typeof TEAMS|null} [winningTeam=null] - The team that won the game.
 * @property {MatchStats} [matchStats] - Statistics for the current match.
 * @property {GameMessage[]} messages - Log of game events and messages.
 * @property {Object.<keyof typeof TEAMS, number>} tricksTaken - Number of tricks taken by each team in the current hand.
 * @property {boolean} [goingAlone=false] - True if the maker went alone in the current hand.
 * @property {Object.<keyof typeof TEAMS, number>} [teamScores] - Alias for `scores` for consistency.
 * @property {Object} [previousTricksTaken] - Tricks taken in the previous hand.
 * @property {Object|null} [trumpSuit] - The current trump suit.
 * @property {Object|null} [playerWhoOrderedUp] - The player who ordered up.
 * @property {Object|null} [playerWhoCalledTrump] - The player who called trump.
 * @property {Object|null} [playerGoingAlone] - The player who went alone.
 * @property {Object|null} [partnerSittingOut] - The partner sitting out.
 * @property {Array} [bids] - History of bids.
 * @property {Object|null} [orderUpTurn] - The player whose turn it is to order up.
 * @property {Array} [kitty] - Cards in the kitty.
 * @property {Object|null} [turnCard] - The turn card.
 * @property {Object|null} [leadSuit] - The lead suit of the current trick.
 * @property {Array} [currentTrick] - Cards played in the current trick.
 */

/**
 * Checks if the game has been won and updates the game state accordingly.
 * This function is typically called after scoring a hand to determine if the match
 * has reached its winning score.
 *
 * @param {GameState} gameState - The current game state.
 * @returns {GameState} Updated game state with game over status if applicable.
 * @see {@link module:src/game/phases/scoringPhase.calculateAndApplyScore}
 * @see {@link module:test/game/phases/endGame.unit.test.js}
 */
function createCheckGameOver(log) {
  return function checkGameOver(gameState) {
    log(1, "[checkGameOver] Checking for game over condition");

  // Ensure it works on a clone to maintain purity
  const updatedState = JSON.parse(JSON.stringify(gameState));

  const currentTeamScores = calculateTeamScores(updatedState);
  const winningTeam = Object.entries(currentTeamScores).find(
    ([teamId, score]) => score >= WINNING_SCORE,
  )?.[0];

  if (winningTeam) {
    return endGame(updatedState, winningTeam, currentTeamScores);
  }

  return updatedState;
  }
}


/**
 * Handles the end of a game, setting the game over flag, winning team,
 * and updating match statistics.
 *
 * @private
 * @param {GameState} gameState - Current game state (will be mutated as it's a clone from `checkGameOver`).
 * @param {keyof typeof TEAMS} winningTeam - The team that won the game.
 * @param {Object.<keyof typeof TEAMS, number>} finalScores - The final scores for each team.
 * @returns {GameState} Updated game state with game over status.
 * @see {@link module:src/game/phases/endGame.checkGameOver}
 * @see {@link module:test/game/phases/endGame.unit.test.js}
 */
function createEndGame(log) {
  return function endGame(gameState, winningTeam, finalScores) {
  const winningTeamDisplay =
    winningTeam === TEAMS.TEAM_NS ? "North/South" : "East/West";
  log(1, `[endGame] Game over! ${winningTeamDisplay} wins!`);

  // Update game state
  gameState.gameOver = true;
  gameState.winningTeam = winningTeam; // Should be TEAMS.TEAM_NS or TEAMS.TEAM_EW
  gameState.currentPhase = GAME_PHASES.GAME_OVER;

  // Add game message
  gameState.messages = gameState.messages || [];
  gameState.messages.push({
    type: "game_over",
    team: winningTeam, // Store short form
    text: `Game Over! Team ${winningTeamDisplay} wins the game!`,
    important: true,
  });

  // Update match statistics
  gameState.matchStats = gameState.matchStats || {
    gamesPlayed: 0,
    teamWins: {
      [TEAMS.TEAM_NS]: 0,
      [TEAMS.TEAM_EW]: 0,
    },
    lastUpdated: new Date().toISOString(),
  };

  gameState.matchStats.gamesPlayed += 1;
  // Ensure winningTeam is the correct key ('NS' or 'EW')
  if (gameState.matchStats.teamWins.hasOwnProperty(winningTeam)) {
    gameState.matchStats.teamWins[winningTeam] += 1;
  } else {
    log(
      3,
      `[endGame] Attempted to increment win for unknown team: ${winningTeam}`,
    );
  }
  gameState.matchStats.lastUpdated = new Date().toISOString();

    return gameState;
  };
}

/**
 * Handles a request to start a new game, resetting the game state to a lobby phase.
 * This function is typically called from the `GAME_OVER` phase.
 *
 * @param {GameState} gameState - Current game state.
 * @returns {GameState} Reset game state for a new game, in the `LOBBY` phase.
 * @see {@link module:src/socket/handlers/gameOverHandlers}
 * @see {@link module:test/game/phases/endGame.unit.test.js}
 */
function createStartNewGame(log) {
  return function startNewGame(gameState) {
  log(1, "[startNewGame] Starting a new game");

  // Create a deep copy of the game state
  const updatedState = JSON.parse(JSON.stringify(gameState));

  // Reset game-specific state
  updatedState.gameOver = false;
  updatedState.winningTeam = null; // Match test expectation
  updatedState.currentPhase = GAME_PHASES.LOBBY; // Match test expectation
  updatedState.players = {}; // Clear players for a fresh lobby
  updatedState.messages = [];

  // Reset player scores
  updatedState.scores = {
    [TEAMS.TEAM_NS]: 0,
    [TEAMS.TEAM_EW]: 0,
  };

  // Add game message
  updatedState.messages.push({
    type: "game",
    text: "A new game is starting!",
    important: true,
  });

  return updatedState;
  }
}

/**
 * Calculates the current scores for each team from the game state's `scores` property.
 *
 * @private
 * @param {GameState} gameState - Current game state.
 * @returns {Object.<keyof typeof TEAMS, number>} An object containing the scores for each team.
 * @see {@link module:src/game/phases/endGame.checkGameOver}
 * @see {@link module:src/game/phases/endGame.handleEndOfHand}
 */
function calculateTeamScores(gameState) {
  // Expects gameState.scores to use TEAMS.TEAM_NS/EW keys
  return {
    [TEAMS.TEAM_NS]: gameState.scores?.[TEAMS.TEAM_NS] || 0,
    [TEAMS.TEAM_EW]: gameState.scores?.[TEAMS.TEAM_EW] || 0,
  };
}

/**
 * Handles the end of a hand, calculates points based on tricks won,
 * updates team scores, and checks for game over conditions.
 *
 * @param {GameState} gameState - Current game state.
 * @returns {GameState} Updated game state with scores and next phase (either `DEALING` or `GAME_OVER`).
 * @see {@link module:src/game/phases/scoringPhase.calculateAndApplyScore}
 * @see {@link module:src/game/phases/endGame.checkGameOver}
 * @see {@link module:src/game/phases/endGame.getOpponentTeam}
 * @see {@link module:test/game/phases/endGame.unit.test.js}
 */
function createHandleEndOfHand(log) {
  return function handleEndOfHand(gameState) {
  log(1, "[handleEndOfHand] Processing end of hand");
  log(
    1,
    `[handleEndOfHand] Initial gameState.scores: NS=${gameState.scores?.[TEAMS.TEAM_NS]}, EW=${gameState.scores?.[TEAMS.TEAM_EW]}`,
  );

  // Create a deep copy of the game state
  const updatedState = JSON.parse(JSON.stringify(gameState)); // Deep copy
  // Ensure scores are initialized with TEAMS constants if not present
  updatedState.scores = {
    [TEAMS.TEAM_NS]: updatedState.scores?.[TEAMS.TEAM_NS] || 0,
    [TEAMS.TEAM_EW]: updatedState.scores?.[TEAMS.TEAM_EW] || 0,
  };
  log(
    1,
    `[handleEndOfHand] Cloned updatedState.scores: NS=${updatedState.scores[TEAMS.TEAM_NS]}, EW=${updatedState.scores[TEAMS.TEAM_EW]}`,
  );

  // Calculate tricks won by each team
  // Expects trick.team to be TEAMS.TEAM_NS or TEAMS.TEAM_EW from test/game setup
  const tricksByTeam = {
    [TEAMS.TEAM_NS]: 0,
    [TEAMS.TEAM_EW]: 0,
  };

  updatedState.tricks.forEach((trick) => {
    if (tricksByTeam.hasOwnProperty(trick.team)) {
      tricksByTeam[trick.team]++;
    } else {
      log(
        2,
        `[handleEndOfHand] Encountered trick with unknown team: ${trick.team}`,
      );
    }
  });

  // Determine if makers made their bid
  const makerTeam = updatedState.makerTeam; // Expected to be TEAMS.TEAM_NS or TEAMS.TEAM_EW
  if (!makerTeam || !tricksByTeam.hasOwnProperty(makerTeam)) {
    log(
      3,
      `[handleEndOfHand] Invalid or missing makerTeam: ${makerTeam}. Cannot determine score.`,
    );
    // Potentially return state or throw error, for now, it will likely result in no score change.
    return checkGameOver(updatedState); // Or handle error more explicitly
  }
  const makerTricks = tricksByTeam[makerTeam]; // Already initialized to 0
  const makerWon = makerTricks >= 3;
  let points = 0;
  let scoringTeam = null;
  let messageText = "";

  if (makerWon) {
    scoringTeam = makerTeam;
    if (makerTricks === 5) {
      // March
      points = 2; // Standard Euchre march score for makers
      messageText = `Team ${makerTeam} made a march! ${points} points!`;
    } else {
      // Made bid (3 or 4 tricks)
      points = 1;
      messageText = `Team ${makerTeam} made their bid! ${points} point.`;
    }
  } else {
    // Euchred (makers got 0, 1, or 2 tricks)
    scoringTeam = getOpponentTeam(makerTeam);
    points = 2; // Opponents always get 2 points for 2 points for a euchre
    messageText = `Team ${makerTeam} was euchred! ${points} points for ${scoringTeam}!`;
  }

  updatedState.messages.push({
    type: "score",
    text: messageText,
    important: true,
  });

  // Update scores
  log(
    1,
    `[handleEndOfHand] About to update scores. scoringTeam: ${scoringTeam}, makerTricks: ${makerTricks}, points: ${points}`,
  );
  if (scoringTeam) {
    const currentScore = updatedState.scores[scoringTeam] || 0;
    log(
      1,
      `[handleEndOfHand] Updating score for ${scoringTeam}. Current: ${currentScore}, Adding: ${points}`,
    );
    updatedState.scores[scoringTeam] = currentScore + points;
    log(
      1,
      `[handleEndOfHand] New score for ${scoringTeam}: ${updatedState.scores[scoringTeam]}`,
    );
    updatedState.scores[scoringTeam] = currentScore + points;
    log(
      1,
      `[handleEndOfHand] New score for ${scoringTeam}: ${updatedState.scores[scoringTeam]}`,
    );
  }

  // Add score summary
  const teamNSDisplay = TEAMS.TEAM_NS; // Could be 'N/S' or similar for display later
  const teamEWDisplay = TEAMS.TEAM_EW;

  updatedState.messages.push({
    type: "score_summary",
    text: `Scores - ${teamNSDisplay}: ${updatedState.scores[TEAMS.TEAM_NS]}, ${teamEWDisplay}: ${updatedState.scores[TEAMS.TEAM_EW]}`,
    important: true,
  });

  // Check for game over
    return checkGameOver(updatedState);
  };
}

/**
 * Gets the opponent team for a given team.
 * Expects team to be TEAMS.TEAM_NS or TEAMS.TEAM_EW.
 * @private
 * @param {keyof typeof TEAMS} team - The team to get the opponent for (e.g., TEAMS.TEAM_NS).
 * @returns {keyof typeof TEAMS|null} The opponent team (e.g., TEAMS.TEAM_EW), or null if the input team is invalid.
 * @see {@link module:src/game/phases/endGame.handleEndOfHand}
 */
function createGetOpponentTeam(log) {
  return function getOpponentTeam(team) {
  if (team === TEAMS.TEAM_NS) return TEAMS.TEAM_EW;
  if (team === TEAMS.TEAM_EW) return TEAMS.TEAM_NS;
  log(3, `[getOpponentTeam] Unknown team provided: ${team}`);
    return null; // Or throw an error
  };
}

  // Create the module functions with the provided logger
  const checkGameOver = createCheckGameOver(log);
  const endGame = createEndGame(log);
  const startNewGame = createStartNewGame(log);
  const handleEndOfHand = createHandleEndOfHand(log);
  const getOpponentTeam = createGetOpponentTeam(log);

  return {
    checkGameOver,
    endGame,
    startNewGame,
    handleEndOfHand,
    getOpponentTeam,
  };
}

// Create and export the default instance
export default createEndGameModule({ log: defaultLogger });

// Export the factory function
export { createEndGameModule };
