/**
 * Utilities for calculating and updating game statistics
 * @module utils/statsUtils
 * @description Contains functions for calculating hand statistics and updating player stats
 */

import { PhaseLogicError } from "../game/logic/errors.js";
import { logger } from "./logger.js";
import { TEAMS } from "../config/constants.js";

/**
 * Default player stats schema
 * @typedef {object} PlayerStats
 * @property {number} handsPlayed - Total number of hands played.
 * @property {number} handsWon - Number of hands won by the player's team.
 * @property {number} pointsScored - Total points scored by the player's team.
 * @property {number} euchres - Number of times the opponent's team was euchred.
 * @property {number} loners - Number of times the player's team went alone.
 * @property {number} wentAlone - Number of times the player went alone (as maker).
 * @property {number} aloneHandsWon - Number of hands won while going alone.
 * @property {number} highestScore - Highest points scored in a single hand.
 * @property {number} tricksTaken - Total tricks taken by the player's team across all hands.
 */
const DEFAULT_STATS = {
  handsPlayed: 0,
  handsWon: 0,
  pointsScored: 0,
  euchres: 0,
  loners: 0,
  wentAlone: 0,
  aloneHandsWon: 0,
  highestScore: 0,
  tricksTaken: 0,
};

/**
 * Represents the completed game state for stats calculation.
 * @typedef {object} CompletedGameState
 * @property {string} makerTeam - The team that made the bid.
 * @property {string} [makerPlayerRole] - The player role that went alone (if any).
 * @property {object<string, number>} tricksTaken - Object mapping team IDs to number of tricks taken.
 * @property {Array<object>} players - Array of player objects (each with a 'team' and 'role' property).
 */

/**
 * Calculates hand statistics based on the completed game state.
 * @param {CompletedGameState} completedGameState - The completed game state.
 * @returns {object} Hand statistics including scoring team and points.
 * @property {string} scoringTeam - The ID of the team that scored points.
 * @property {number} pointsScored - The number of points scored.
 * @property {boolean} wasEuchre - True if the maker team was euchred.
 * @property {boolean} wentAlone - True if the maker team went alone and won all tricks.
 * @throws {PhaseLogicError} If the input is invalid or incomplete.
 */
export function calculateHandStats(completedGameState) {
  if (completedGameState === null || completedGameState === undefined) {
    throw new PhaseLogicError(
      "Invalid completedGameState provided for stats calculation.",
    );
  }

  if (
    typeof completedGameState !== "object" ||
    Array.isArray(completedGameState)
  ) {
    throw new PhaseLogicError(
      "Invalid completedGameState provided for stats calculation.",
    );
  }

  const { makerTeam, makerPlayerRole, tricksTaken, players } =
    completedGameState;

  if (!makerTeam || !tricksTaken || !players || !Array.isArray(players)) {
    throw new PhaseLogicError(
      "Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players.",
    );
  }

  const defendingTeam =
    makerTeam === TEAMS.TEAM_NS ? TEAMS.TEAM_EW : TEAMS.TEAM_NS;
  const makerTricks = tricksTaken[makerTeam] || 0;
  const defenderTricks = tricksTaken[defendingTeam] || 0;

  let scoringTeam = null;
  let pointsScored = 0;
  let isEuchre = false;
  let wentAlone = false;

  // Determine if the maker went alone (makerPlayerRole is set and partner has no cards)
  if (makerPlayerRole) {
    const partner = players.find(
      (p) => p.team === makerTeam && p.role !== makerPlayerRole,
    );
    // Went alone only if partner has no cards
    wentAlone = !partner?.hand || partner.hand.length === 0;
  }

  if (makerTricks >= 5) {
    // Maker team won all 5 tricks - 4 points if went alone, 2 points otherwise
    scoringTeam = makerTeam;
    pointsScored = wentAlone ? 4 : 2;
  } else if (makerTricks >= 3) {
    // Maker team won 3-4 tricks - 1 point
    scoringTeam = makerTeam;
    pointsScored = 1;
    wentAlone = false; // Can't go alone if didn't win all tricks
  } else {
    // Maker team won 0-2 tricks - euchred, other team gets 2 points
    scoringTeam = makerTeam === TEAMS.TEAM_NS ? TEAMS.TEAM_EW : TEAMS.TEAM_NS;
    pointsScored = 2;
    isEuchre = true;
    wentAlone = false; // Can't go alone if euchred
  }

  return {
    scoringTeam,
    pointsScored,
    wasEuchre: isEuchre,
    wentAlone,
  };
}

/**
 * Updates player statistics based on the hand result.
 * @param {PlayerStats} currentStats - Current player statistics.
 * @param {object} handResult - Result of the hand from calculateHandStats.
 * @property {string} handResult.scoringTeam - The ID of the team that scored points.
 * @property {number} handResult.pointsScored - The number of points scored.
 * @property {boolean} handResult.wasEuchre - True if the maker team was euchred.
 * @property {boolean} handResult.wentAlone - True if the maker team went alone.
 * @param {string} playerTeamId - The team ID of the player for whom stats are being updated.
 * @returns {PlayerStats} Updated player statistics.
 */
export function updatePlayerStats(
  currentStats = {},
  handResult = {},
  playerTeamId,
) {
  // Initialize stats with current values or defaults
  const stats = { ...DEFAULT_STATS, ...currentStats };
  const updatedStats = { ...stats };

  // If hand result is malformed, log a warning and return current stats with incremented hands played
  if (
    !handResult ||
    typeof handResult !== "object" ||
    handResult.scoringTeam === undefined
  ) {
    logger.warn("Invalid handResult provided to updatePlayerStats");
    return {
      ...stats,
      handsPlayed: (stats.handsPlayed || 0) + 1,
    };
  }

  const { scoringTeam, pointsScored, wasEuchre, wentAlone } = handResult;
  const isPlayerTeam = playerTeamId === scoringTeam;

  // Always increment hands played
  updatedStats.handsPlayed = (stats.handsPlayed || 0) + 1;

  if (isPlayerTeam) {
    // Player's team won the hand
    updatedStats.handsWon = (stats.handsWon || 0) + 1;
    updatedStats.pointsScored = (stats.pointsScored || 0) + (pointsScored || 0);

    if (wentAlone) {
      updatedStats.wentAlone = (stats.wentAlone || 0) + 1;
      if (pointsScored > 0) {
        updatedStats.aloneHandsWon = (stats.aloneHandsWon || 0) + 1;
      }
    }

    // Update highest score if applicable
    if (pointsScored > (stats.highestScore || 0)) {
      updatedStats.highestScore = pointsScored;
    }
  } else if (wasEuchre) {
    // Player's team was euchred
    updatedStats.euchres = (stats.euchres || 0) + 1;
  }

  return updatedStats;
}
