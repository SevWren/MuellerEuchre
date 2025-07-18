/**
 * Utility functions related to player management, teams, and turn order.
 * @module players
 */
import { PLAYER_ROLES, TEAMS } from "../config/constants.js";
import logger from "./logger.js"; // Use the new Pino logger

/**
 * A type representing one of the valid player role strings.
 * @typedef {'south'|'west'|'north'|'east'} PlayerRole
 */

/**
 * Represents the structure of a player object within the game state.
 * @typedef {object} Player
 * @property {string} name - The display name of the player.
 * @property {string|null} socketId - The socket ID of the connected player, or null if disconnected.
 * @property {Array<object>} hand - An array of card objects in the player's hand.
 * @property {string} teamId - The ID of the player's team (e.g., 'TEAM_NS', 'TEAM_EW').
 * @property {number} score - The player's current score (or their team's score).
 * @property {boolean} isConnected - True if the player is currently connected.
 * @property {number} tricksWonThisHand - The number of tricks won by this player in the current hand.
 */

/**
 * Represents the state of a Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game.
 * @property {string} phase - The current phase of the game (e.g., 'DEALING', 'BIDDING').
 * @property {PlayerRole} dealer - The role of the current dealer.
 * @property {object<PlayerRole, Player>} players - An object mapping player roles to player data.
 * @property {Array<object>} deck - The array of cards remaining in the deck.
 * @property {string} trumpSuit - The current trump suit.
 * @property {Array<object>} currentTrick - An array of cards played in the current trick.
 * @property {object<string, number>} tricksTaken - An object mapping team IDs to the number of tricks taken by that team.
 * @property {string|null} makerTeam - The team that made trump, or null.
 * @property {PlayerRole|null} makerPlayerRole - The player who made trump, or null.
 * @property {boolean} goingAlone - True if a player is going alone.
 * @property {PlayerRole|null} partnerSittingOut - The role of the partner sitting out when going alone.
 * @property {object<string, number>} teamScores - An object mapping team IDs to their current scores.
 * @property {Array<object>} kitty - Cards in the kitty.
 * @property {object|null} trumpCard - The card turned up as potential trump.
 */

/**
 * Gets the team identifier for a given player role.
 * (e.g., 'north' and 'south' are on one team, 'east' and 'west' on another).
 * @param {PlayerRole} playerRole - The player's role (e.g., 'south', 'west').
 * @returns {string} The team identifier (e.g., 'south_north', 'west_east').
 * @private // This function is only used internally by isTeammate
 */
function getTeamForPlayer(playerRole) {
  // Assuming PLAYER_ROLES = ['south', 'west', 'north', 'east']
  // Team NS: south, north
  // Team EW: west, east
  if (playerRole === PLAYER_ROLES[0] || playerRole === PLAYER_ROLES[2]) {
    return `${PLAYER_ROLES[0]}_${PLAYER_ROLES[2]}`; // e.g. "south_north"
  }
  // west or east. No need for an else-if, as isTeammate validates roles.
  return `${PLAYER_ROLES[1]}_${PLAYER_ROLES[3]}`; // e.g. "west_east"
}

/**
 * Checks if two players are on the same team.
 * @param {PlayerRole} player1Role - The first player's role.
 * @param {PlayerRole} player2Role - The second player's role.
 * @returns {boolean} True if the players are on the same team, false otherwise.
 */
function isTeammate(player1Role, player2Role) {
  if (
    !player1Role ||
    !player2Role ||
    !PLAYER_ROLES.includes(player1Role) ||
    !PLAYER_ROLES.includes(player2Role)
  ) {
    logger.warn(
      { player1Role, player2Role },
      "Invalid role(s) passed to isTeammate",
    );
    return false;
  }
  if (player1Role === player2Role) return false; // A player is not their own teammate for game logic purposes

  const team1 = getTeamForPlayer(player1Role);
  const team2 = getTeamForPlayer(player2Role);

  return team1 !== "" && team1 === team2;
}

/**
 * Gets the partner's role for a given player role.
 * @param {PlayerRole} playerRole - The player's role (e.g., 'south', 'west', 'north', 'east').
 * @returns {PlayerRole|undefined} The partner's role, or undefined if the role is invalid.
 * @see src/game/phases/goAlonePhase.js
 */
function getPartner(playerRole) {
  // Assuming PLAYER_ROLES = ['south', 'west', 'north', 'east']
  // South's partner is North, West's partner is East.
  const partnerMap = {
    [PLAYER_ROLES[0]]: PLAYER_ROLES[2], // south: north
    [PLAYER_ROLES[1]]: PLAYER_ROLES[3], // west: east
    [PLAYER_ROLES[2]]: PLAYER_ROLES[0], // north: south
    [PLAYER_ROLES[3]]: PLAYER_ROLES[1], // east: west
  };
  if (!PLAYER_ROLES.includes(playerRole)) {
    logger.warn({ playerRole }, "Invalid playerRole passed to getPartner");
    return undefined;
  }
  return partnerMap[playerRole];
}

/**
 * Gets the next player in turn order, skipping a sitting out partner if applicable.
 * @param {PlayerRole} currentPlayerRole - The current player's role.
 * @param {Array<PlayerRole>} [playerSlots=PLAYER_ROLES] - Ordered array of player roles for the current game. Defaults to PLAYER_ROLES.
 * @param {boolean} [goingAlone=false] - Whether a player is "going alone".
 * @param {PlayerRole} [partnerSittingOut] - The role of the partner who is sitting out (if goingAlone is true).
 * @returns {PlayerRole|undefined} The next player's role, or undefined if inputs are invalid.
 * @see src/game/phases/goAlonePhase.js
 * @see src/game/phases/biddingPhase.js
 */
function getNextPlayer(
  currentPlayerRole,
  playerSlots = PLAYER_ROLES,
  goingAlone = false,
  partnerSittingOut = null,
) {
  if (!currentPlayerRole || !playerSlots) {
    logger.warn(
      { currentPlayerRole, playerSlots },
      'Invalid parameters for getNextPlayer',
    );
    return undefined;
  }
  
  // Check if playerSlots is an array and has exactly 4 elements
  if (!Array.isArray(playerSlots) || playerSlots.length !== 4) {
    logger.warn(
      { currentPlayerRole, playerSlots },
      'Invalid parameters for getNextPlayer: playerSlots must be an array of length 4',
    );
    return undefined;
  }

  const currentIndex = playerSlots.indexOf(currentPlayerRole);
  if (currentIndex === -1) {
    logger.warn(
      { currentPlayerRole, playerSlots },
      `Current player role ${currentPlayerRole} not found in provided player slots`,
    );
    return undefined;
  }

  let nextIndex = (currentIndex + 1) % playerSlots.length;
  let nextPlayer = playerSlots[nextIndex];

  // If going alone, and the next player is the one sitting out, skip them.
  if (goingAlone && partnerSittingOut && nextPlayer === partnerSittingOut) {
    nextIndex = (nextIndex + 1) % playerSlots.length;
    nextPlayer = playerSlots[nextIndex];
  }

  return nextPlayer;
}

/**
 * Gets a player object by their socket ID from the game state.
 * @param {GameState} gameState - The current game state, containing a `players` object.
 * @param {string} socketId - The socket ID to look up.
 * @returns {Player|null} The player object (value from the gameState.players map) or null if not found or inputs are invalid.
 */
function getPlayerBySocketId(gameState, socketId) {
  if (
    !gameState ||
    !gameState.players ||
    typeof gameState.players !== "object" ||
    !socketId
  ) {
    logger.warn(
      { gameStateExists: !!gameState, socketId },
      "Invalid arguments for getPlayerBySocketId.",
    );
    return null;
  }

  for (const role in gameState.players) {
    if (gameState.players[role].socketId === socketId) {
      return gameState.players[role];
    }
  }
  return null;
}

/**
 * Gets a player's role by their socket ID from the game state.
 * @param {GameState} gameState - The current game state, containing a `players` object.
 * @param {string} socketId - The socket ID to look up.
 * @returns {PlayerRole|null} The player's role (key from the gameState.players map) or null if not found or inputs are invalid.
 * @see src/socket/handlers/playerConnectionHandlers.js
 * @see src/socket/handlers/lobbyHandlers.js
 * @see src/socket/handlers/goAloneHandlers.js
 * @see src/socket/handlers/biddingHandlers.js
 */
function getRoleBySocketId(gameState, socketId) {
  if (
    !gameState ||
    !gameState.players ||
    typeof gameState.players !== "object" ||
    !socketId
  ) {
    logger.warn(
      { gameStateExists: !!gameState, socketId },
      "Invalid arguments for getRoleBySocketId.",
    );
    return null;
  }

  for (const role in gameState.players) {
    if (gameState.players[role].socketId === socketId) {
      return role;
    }
  }
  return null;
}

/**
 * Initializes the players object with default values for a new game.
 * Each player has a team, empty hand, zero score, null socketId, default name,
 * isConnected status, and zero tricksWonThisHand.
 * @returns {object<PlayerRole, Player>} The initialized players object, mapping roles to player data.
 */
function initializePlayers() {
  const players = {};
  PLAYER_ROLES.forEach((role, index) => {
    // Determine team: PLAYER_ROLES = ['south', 'west', 'north', 'east']
    // South & North (indices 0, 2) are TEAM_NS
    // West & East (indices 1, 3) are TEAM_EW
    const teamId = index % 2 === 0 ? TEAMS.TEAM_NS : TEAMS.TEAM_EW;
    players[role] = {
      name: role.charAt(0).toUpperCase() + role.slice(1), // e.g., 'South'
      socketId: null,
      hand: [],
      teamId: teamId, // Assign to TEAM_NS or TEAM_EW
      score: 0, // Overall game score for this player's team (might be redundant if teamScores used in gameState)
      isConnected: false,
      tricksWonThisHand: 0,
    };
  });
  return players;
}

/**
 * Gets the team ID for a given player object.
 * @param {Player} player - The player object.
 * @returns {string|undefined} The team ID of the player, or undefined if player is invalid or teamId is not set.
 */
function getPlayerTeam(player) {
  if (!player || typeof player !== "object") {
    logger.warn({ player }, "Invalid player object passed to getPlayerTeam.");
    return undefined;
  }
  if (player.teamId === undefined) {
    logger.warn(
      { playerId: player.id, playerName: player.name },
      "Player object does not have a teamId.",
    );
    // Fallback or error handling could be more sophisticated here if needed
  }
  return player.teamId;
}

export {
  isTeammate,
  getPartner,
  getNextPlayer,
  getPlayerBySocketId,
  getRoleBySocketId,
  initializePlayers,
  getPlayerTeam
};
