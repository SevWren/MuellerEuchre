/**
 * Utilities for calculating and updating game statistics
 * @module utils/statsUtils
 * @description Contains functions for calculating hand statistics and updating player stats
 */

import { PhaseLogicError } from '../game/logic/errors.js';
import { logger } from './logger.js';
import { TEAMS } from '../config/constants.js';

/**
 * Default player stats schema
 * @type {Object}
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
  tricksTaken: 0
};

/**
 * Calculates hand statistics based on the completed game state
 * @param {Object} completedGameState - The completed game state
 * @param {string} completedGameState.makerTeam - The team that made the bid
 * @param {string} [completedGameState.makerPlayerRole] - The player role that went alone (if any)
 * @param {Object} completedGameState.tricksTaken - Object mapping team IDs to number of tricks taken
 * @param {Array} completedGameState.players - Array of player objects
 * @returns {Object} Hand statistics including scoring team and points
 * @throws {PhaseLogicError} If the input is invalid
 */
export function calculateHandStats(completedGameState) {
  if (completedGameState === null || completedGameState === undefined) {
    throw new PhaseLogicError('Invalid completedGameState provided for stats calculation.');
  }

  if (typeof completedGameState !== 'object' || Array.isArray(completedGameState)) {
    throw new PhaseLogicError('Invalid completedGameState provided for stats calculation.');
  }

  const { makerTeam, makerPlayerRole, tricksTaken, players } = completedGameState;

  if (!makerTeam || !tricksTaken || !players || !Array.isArray(players)) {
    throw new PhaseLogicError('Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players.');
  }

  const defendingTeam = makerTeam === TEAMS.TEAM_NS ? TEAMS.TEAM_EW : TEAMS.TEAM_NS;
  const makerTricks = tricksTaken[makerTeam] || 0;
  const defenderTricks = tricksTaken[defendingTeam] || 0;
  
  let scoringTeam = null;
  let pointsScored = 0;
  let isEuchre = false;
  let wentAlone = false;
  
  // Determine if the maker went alone (makerPlayerRole is set and partner has no cards)
  if (makerPlayerRole) {
    const partner = players.find(p => p.team === makerTeam && p.role !== makerPlayerRole);
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
    wentAlone
  };
}

/**
 * Updates player statistics based on the hand result
 * @param {Object} currentStats - Current player statistics
 * @param {Object} handResult - Result of the hand from calculateHandStats
 * @param {string} playerTeamId - The team ID of the player
 * @returns {Object} Updated player statistics
 */
export function updatePlayerStats(currentStats = {}, handResult = {}, playerTeamId) {
  // Initialize stats with current values or defaults
  const stats = { ...DEFAULT_STATS, ...currentStats };
  const updatedStats = { ...stats };
  
  // If hand result is malformed, log a warning and return current stats with incremented hands played
  if (!handResult || typeof handResult !== 'object' || handResult.scoringTeam === undefined) {
    logger.warn('Invalid handResult provided to updatePlayerStats');
    return {
      ...stats,
      handsPlayed: (stats.handsPlayed || 0) + 1
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
