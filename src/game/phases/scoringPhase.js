/**
 * @module game/phases/scoringPhase
 * @description Handles the scoring phase of an Euchre game, including point calculation,
 * game over conditions, and new game initialization. This module is responsible for
 * processing the results of a completed hand, updating scores, and determining if the
 * game has been won.
 *
 * @see {@link module:src/game/phases/biddingPhase} - Previous phase in the game flow
 * @see {@link module:src/game/phases/playingPhase} - Previous phase where tricks are played
 * @see {@link module:src/config/constants}
 * @see {@link module:src/utils/players}
 * @see {@link module:src/utils/logger}
 * @see {@link module:src/game/logic/validation-errors}
 * @see {@link module:test/game/phases/scoringPhase.unit.test.js}
 */

import {
  GAME_PHASES,
  WINNING_SCORE,
  TEAMS,
  PLAYER_ROLES,
  CARD_SUITS,
} from "../../config/constants.js";
import { getNextPlayer } from "../../utils/players.js";
import logger from "../../utils/logger.js";
import {
  InvalidPhaseError,
  PhaseLogicError,
} from "../logic/validation-errors.js";

/**
 * A type representing one of the valid player role strings.
 * @typedef {keyof typeof PLAYER_ROLES} PlayerRole
 */

/**
 * A type representing one of the valid team name strings.
 * @typedef {keyof typeof TEAMS} TeamName
 */

/**
 * Represents a playing card.
 * @typedef {object} Card
 * @property {string} id - The unique identifier for the card (e.g., "AS", "9D").
 * @property {keyof typeof CARD_SUITS} suit - The suit of the card, from CARD_SUITS constants.
 * @property {string} value - The face value of the card ('9', '10', 'J', 'Q', 'K', 'A').
 * @property {string} name - The human-readable name (e.g., "Ace of Spades").
 */

/**
 * Represents a single player within the game state.
 * @typedef {object} Player
 * @property {string} name - The display name of the player.
 * @property {string|null} socketId - The socket ID of the connected player, or null if disconnected.
 * @property {Array<Card>} hand - An array of card objects in the player's hand.
 * @property {TeamName} teamId - The ID of the player's team (e.g., 'TEAM_NS', 'TEAM_EW').
 * @property {number} score - The player's current score (or their team's score).
 * @property {boolean} isConnected - True if the player is currently connected.
 * @property {number} tricksWonThisHand - The number of tricks won by this player in the current hand.
 */

/**
 * Represents the complete, canonical state of a single Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game session.
 * @property {keyof typeof GAME_PHASES} gamePhase - The current phase of the game.
 * @property {PlayerRole} dealer - The role of the current dealer.
 * @property {Object.<PlayerRole, Player>} players - A map of player roles to player data.
 * @property {Array<Card>} deck - The array of cards remaining in the deck.
 * @property {keyof typeof CARD_SUITS | null} trumpSuit - The current trump suit.
 * @property {{card: Card, playedBy: PlayerRole}[]} currentTrick - An array of cards played in the current trick.
 * @property {Object.<TeamName, number>} tricksTaken - An object mapping team IDs to the number of tricks taken by that team.
 * @property {TeamName|null} makerTeam - The team that made trump, or null.
 * @property {PlayerRole|null} playerWhoOrderedUp - The player who ordered up.
 * @property {PlayerRole|null} playerWhoCalledTrump - The player who called trump.
 * @property {boolean} goingAlone - True if a player is going alone.
 * @property {PlayerRole|null} playerGoingAlone - The role of the player going alone, if any.
 * @property {PlayerRole|null} partnerSittingOut - The role of the partner sitting out when going alone.
 * @property {Object.<TeamName, number>} teamScores - An object mapping team IDs to their current scores.
 * @property {Array<Card>} kitty - Cards in the kitty.
 * @property {Card|null} turnCard - The card turned up as potential trump.
 * @property {PlayerRole} currentPlayer - The role of the current player.
 * @property {Array<object>} gameMessages - Log of game events and messages.
 * @property {string|null} leadSuit - The lead suit of the current trick.
 * @property {Object.<TeamName, number>} [scores] - Alias for `teamScores` for consistency.
 * @property {Object} [previousTricksTaken] - Tricks taken in the previous hand.
 */

/**
 * Calculates the score for the completed hand and updates the game state.
 * This function will then call `checkGameOver` which handles persistence.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<GameState>} A promise that resolves to the updated game state after scoring and game over check.
 * @throws {InvalidPhaseError} If not in the SCORING phase.
 * @throws {PhaseLogicError} If `makerTeam` is not defined.
 * @see {@link module:src/game/phases/endGame.checkGameOver}
 * @see {@link module:src/game/phases/scoringPhase.unit.test.js}
 */
async function calculateAndApplyScore(gameState) {
  if (gameState.gamePhase !== GAME_PHASES.GAME_PHASE_SCORING) {
    throw new InvalidPhaseError(
      `calculateAndApplyScore called inappropriately during ${gameState.gamePhase} phase.`,
      "calculate and apply score",
      GAME_PHASES.GAME_PHASE_SCORING
    );
  }

  if (!gameState.makerTeam) {
    throw new PhaseLogicError(
      "Cannot calculate score: makerTeam is not defined."
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

  //logger.info(
  //  `[Game ID: ${gameId}] Scoring complete. ${message}. Scores: NS ${newGameState.teamScores[TEAMS.TEAM_NS]}, EW ${newGameState.teamScores[TEAMS.TEAM_EW]}`
  //);

  return checkGameOver(newGameState);
}

/**
 * Checks if the game is over and updates phase. Persists the state.
 * @param {GameState} gameState - The current game state (expected to be mutable or a fresh copy).
 * @returns {Promise<GameState>} A promise that resolves to the updated game state.
 * @see {@link module:src/game/phases/endGame.checkGameOver}
 * @see {@link module:src/game/phases/scoringPhase.unit.test.js}
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
    newGameState.gamePhase = GAME_PHASES.GAME_PHASE_GAME_OVER;
    newGameState.winningTeam = winningTeam;
    newGameState.currentPlayer = null;
    newGameState.message = `${newGameState.message} ${gameOverMessagePart}`;

    //uncomment to enable debug info to terminal
    //logger.info(
    //  `[Game ID: ${gameId}] Game over. Winner: ${winningTeam}. ${gameOverMessagePart}`
    //);
  } else {
    const nextDealerRole = getNextPlayer(currentDealer, PLAYER_ROLES);
    const transitionMessage = `Hand scored. Next hand starting. New dealer: ${nextDealerRole}. Current scores: Team NS ${nsScore}, Team EW ${ewScore}.`;

    newGameState.gamePhase = GAME_PHASES.GAME_PHASE_DEALING;
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

    //uncomment to enable debug info to terminal
    //logger.info(
    //  `[Game ID: ${gameId}] Hand scored. Transitioning to DEALING. New dealer: ${nextDealerRole}.`
    //);
  }
  return newGameState;
}

/**
 * Handles a request to start a new game from the GAME_OVER state.
 * @param {GameState} gameState - The current game state.
 * @returns {GameState} A completely reset game state for a new lobby.
 * @throws {InvalidPhaseError} If the game is not in the GAME_OVER phase.
 * @see {@link module:src/game/phases/scoringPhase.unit.test.js}
 */
export { calculateAndApplyScore, checkGameOver };
