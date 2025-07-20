/**
 * @file Mock implementation of player-related utilities for testing.
 * @module test/__mocks__/players
 * @description
 *   Provides mock implementations of player utility functions with deterministic
 *   behavior for testing. This mock supports:
 *   - Getting next player in rotation (`getNextPlayer`)
 *   - Finding player partners (`getPartner`)
 *   - Validating player roles and teams (`getTeamId`, `isValidPlayerRole`)
 *   - Tracking function calls for assertions (`callHistory`)
 *
 *   All functions are designed to be pure and side-effect free, strictly
 *   maintaining test isolation as per Layer 1 purity requirements.
 *
 * @see {@link module:src/utils/players} - The real implementation being mocked.
 * @see {@link module:test/__mocks__/mocks_doc.md} - General mocking guidelines and Layer 1 purity principles.
 */

import { PLAYER_POSITIONS, TEAMS } from '../../../src/config/constants.js';

/**
 * @typedef {object} PlayerRoleObject
 * @property {string} role - The player's role string (e.g., 'PLAYER_NORTH').
 * @property {string} [id] - Optional unique ID for the player.
 */

/**
 * @typedef {object} GetNextPlayerCall
 * @property {string} currentPlayer - The role of the current player.
 * @property {Array<string|PlayerRoleObject>} players - The array of player roles or objects passed.
 * @property {string} nextPlayer - The role of the determined next player.
 */

/**
 * @typedef {object} GetPartnerCall
 * @property {string} playerRole - The role of the player whose partner was requested.
 * @property {string|null} partner - The role of the determined partner, or null if not found.
 */

/**
 * @typedef {object} CallHistory
 * @property {GetNextPlayerCall[]} getNextPlayer - Records calls to `getNextPlayer`.
 * @property {GetPartnerCall[]} getPartner - Records calls to `getPartner`.
 * @property {Array<any>} getPlayerRole - Placeholder for `getPlayerRole` calls (not currently used by this mock).
 */

/**
 * Stores the history of calls made to the mock functions for test assertions.
 * @type {CallHistory}
 */
const callHistory = {
  getNextPlayer: [],
  getPartner: [],
  getPlayerRole: [] // Placeholder for potential future use
};

/**
 * Resets the call history of all mock functions.
 * This function is crucial for ensuring test isolation by clearing any
 * accumulated call data before each new test case.
 * @function reset
 * @returns {void}
 * @see {@link module:test/__mocks__/mocks_doc.md} - Best Practices: Reset Mocks Between Tests.
 */
function reset() {
  Object.values(callHistory).forEach(calls => calls.length = 0);
}

/**
 * Gets the next player in the rotation based on the provided list of players.
 * This mock implementation provides a deterministic circular rotation.
 * @function getNextPlayer
 * @param {string} currentPlayer - The current player's role (e.g., 'PLAYER_SOUTH').
 * @param {Array<string|PlayerRoleObject>} players - An ordered array of player roles (strings)
 *   or player objects (with a `role` property). Defaults to `PLAYER_POSITIONS` values if empty.
 * @returns {string} The role of the next player in the sequence.
 * @see {@link module:src/utils/players.getNextPlayer} - The real implementation.
 * @see {@link module:test/__mocks__/mocks_doc.md} - Core Mocking Principles.
 */
function getNextPlayer(currentPlayer, players) {
  const playerList = Array.isArray(players) && players.length > 0
    ? (typeof players[0] === 'object' ? players.map(p => p.role || p) : [...players])
    : Object.values(PLAYER_POSITIONS);

  const currentIndex = playerList.indexOf(currentPlayer);
  const nextIndex = (currentIndex + 1) % playerList.length;

  const nextPlayerRole = playerList[nextIndex];
  callHistory.getNextPlayer.push({ currentPlayer, players, nextPlayer: nextPlayerRole });
  return nextPlayerRole;
}

/**
 * Gets the partner of a given player role.
 * This mock implementation provides fixed partner assignments.
 * @function getPartner
 * @param {string} playerRole - The player's role (e.g., 'PLAYER_NORTH').
 * @returns {string|null} The partner's role, or `null` if the role is not recognized.
 * @see {@link module:src/utils/players.getPartner} - The real implementation.
 * @see {@link module:test/__mocks__/mocks_doc.md} - Core Mocking Principles.
 */
function getPartner(playerRole) {
  const partners = {
    [PLAYER_POSITIONS.PLAYER_NORTH]: PLAYER_POSITIONS.PLAYER_SOUTH,
    [PLAYER_POSITIONS.PLAYER_SOUTH]: PLAYER_POSITIONS.PLAYER_NORTH,
    [PLAYER_POSITIONS.PLAYER_EAST]: PLAYER_POSITIONS.PLAYER_WEST,
    [PLAYER_POSITIONS.PLAYER_WEST]: PLAYER_POSITIONS.PLAYER_EAST
  };

  const partnerRole = partners[playerRole] || null;
  callHistory.getPartner.push({ playerRole, partner: partnerRole });
  return partnerRole;
}

/**
 * Gets the team ID for a given player role.
 * This mock implementation provides fixed team assignments.
 * @function getTeamId
 * @param {string} playerRole - The player's role (e.g., 'PLAYER_SOUTH').
 * @returns {string} The team ID (e.g., 'TEAM_NS', 'TEAM_EW').
 * @see {@link module:src/utils/players.getPlayerTeam} - The real implementation.
 * @see {@link module:test/__mocks__/mocks_doc.md} - Core Mocking Principles.
 */
function getTeamId(playerRole) {
  const teamMap = {
    [PLAYER_POSITIONS.PLAYER_NORTH]: TEAMS.TEAM_NS,
    [PLAYER_POSITIONS.PLAYER_SOUTH]: TEAMS.TEAM_NS,
    [PLAYER_POSITIONS.PLAYER_EAST]: TEAMS.TEAM_EW,
    [PLAYER_POSITIONS.PLAYER_WEST]: TEAMS.TEAM_EW
  };

  return teamMap[playerRole] || TEAMS.TEAM_UNKNOWN;
}

/**
 * Validates if a given string corresponds to a valid player role.
 * This mock implementation checks against the predefined `PLAYER_POSITIONS`.
 * @function isValidPlayerRole
 * @param {string} role - The string to validate as a player role.
 * @returns {boolean} `true` if the role is valid, `false` otherwise.
 * @see {@link module:src/utils/players} - Related validation in the real module.
 * @see {@link module:test/__mocks__/mocks_doc.md} - Core Mocking Principles.
 */
function isValidPlayerRole(role) {
  return Object.values(PLAYER_POSITIONS).includes(role);
}

/**
 * Exports all mock functions and the `callHistory` object for testing.
 * @type {{
 *   getNextPlayer: function(string, Array<string|PlayerRoleObject>): string,
 *   getPartner: function(string): string|null,
 *   getTeamId: function(string): string,
 *   isValidPlayerRole: function(string): boolean,
 *   callHistory: CallHistory,
 *   reset: function(): void
 * }}
 */
export {
  getNextPlayer,
  getPartner,
  getTeamId,
  isValidPlayerRole,
  callHistory,
  reset
};

/**
 * Default export for easier mocking in other test files.
 * @type {{
 *   getNextPlayer: function(string, Array<string|PlayerRoleObject>): string,
 *   getPartner: function(string): string|null,
 *   getTeamId: function(string): string,
 *   isValidPlayerRole: function(string): boolean,
 *   callHistory: CallHistory,
 *   reset: function(): void
 * }}
 */
export default {
  getNextPlayer,
  getPartner,
  getTeamId,
  isValidPlayerRole,
  callHistory,
  reset
};