// filepath: src/utils/statsUtils.js

import { PhaseLogicError } from "../game/logic/errors.js"; // Assuming errors utility exists here
import { logger } from "./logger.js"; // Assuming logger utility exists here
import { TEAMS } from "../config/constants.js"; // Assuming constants exists here

/**
 * Calculates the statistics for a completed hand based on the final game state.
 * This function is pure and does not modify the input state.
 *
 * @param {object} completedGameState - The game state object at the end of a hand.
 * @returns {{scoringTeam: string|null, pointsScored: number, wasEuchre: boolean, wentAlone: boolean}} A structured result object.
 * @throws {PhaseLogicError} If the completedGameState is incomplete or malformed for scoring.
 */
export function calculateHandStats(completedGameState) {
  if (!completedGameState || typeof completedGameState !== "object") {
    throw new PhaseLogicError(
      "Invalid completedGameState provided for stats calculation."
    );
  }

  const { makerTeam, tricksTaken, players } = completedGameState;

  if (!makerTeam || !tricksTaken || !players) {
    throw new PhaseLogicError(
      "Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players."
    );
  }

  const makerTeamTricks = tricksTaken[makerTeam] || 0;
  const opponentTeam = makerTeam === TEAMS.TEAM_1 ? TEAMS.TEAM_2 : TEAMS.TEAM_1;
  const opponentTeamTricks = tricksTaken[opponentTeam] || 0;

  let pointsScored = 0;
  let wasEuchre = false;
  let wentAlone = false;

  // Determine if the maker team went alone
  const makerPlayers = players.filter((p) => p.team === makerTeam);
  if (makerPlayers.length === 2) {
    // Assuming 2 players per team
    const partner = makerPlayers.find(
      (p) => p.role !== completedGameState.makerPlayerRole
    ); // Assuming makerPlayerRole exists
    if (partner && partner.hand.length === 0) {
      // Assuming empty hand indicates going alone
      wentAlone = true;
    }
  }

  if (makerTeamTricks === 5) {
    pointsScored = wentAlone ? 4 : 2;
  } else if (makerTeamTricks === 3 || makerTeamTricks === 4) {
    pointsScored = 1;
  } else {
    // Opponent team euchred the maker team
    pointsScored = 2;
    wasEuchre = true;
    // Scoring team is the opponent team in case of a euchre
    return {
      scoringTeam: opponentTeam,
      pointsScored,
      wasEuchre,
      wentAlone: false, // Euchre means alone attempt failed
    };
  }

  // If not euchred, the scoring team is the maker team
  return {
    scoringTeam: makerTeam,
    pointsScored,
    wasEuchre,
    wentAlone,
  };
}

/**
 * Updates player statistics based on the result of a hand.
 * This function is pure and returns a new stats object.
 *
 * @param {object} currentStats - The current player statistics.
 * @param {{scoringTeam: string|null, pointsScored: number, wasEuchre: boolean, wentAlone: boolean}} handResult - The result of the completed hand.
 * @param {string} playerTeamId - The ID of the player's team.
 * @returns {object} A new object containing the updated statistics.
 */
export function updatePlayerStats(currentStats = {}, handResult, playerTeamId) {
  const defaultStats = {
    handsPlayed: 0,
    handsWon: 0,
    pointsScored: 0,
    euchres: 0,
    wentAlone: 0,
    aloneHandsWon: 0,
    tricksTaken: 0, // Total tricks taken across hands
  };

  // Merge current stats with defaults to ensure all properties exist
  const newStats = { ...defaultStats, ...currentStats };

  newStats.handsPlayed++;

  if (!handResult || typeof handResult !== "object") {
    logger.warn(
      `Invalid handResult provided to updatePlayerStats for team ${playerTeamId}: ${JSON.stringify(handResult)}`
    );
    return newStats; // Return stats incremented by handsPlayed
  }

  const { scoringTeam, pointsScored, wasEuchre, wentAlone } = handResult;

  if (scoringTeam === playerTeamId) {
    newStats.handsWon++;
    newStats.pointsScored += pointsScored;
    if (wentAlone) {
      newStats.aloneHandsWon++;
    }
  }

  if (wasEuchre && handResult.scoringTeam !== playerTeamId) {
    newStats.euchres++;
  }

  if (wentAlone && scoringTeam === playerTeamId) {
    newStats.wentAlone++; // Track successful alone attempts
  }

  // Note: Tricks taken per player is not directly available in handResult,
  // would need to be passed in detailsObject if needed for stats.
  // Assuming tricksTaken in handResult refers to the scoring team's tricks for that hand.
  // If we wanted individual player tricks, we'd need a different input structure.

  return newStats;
}
