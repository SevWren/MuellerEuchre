// File is generating terminal pollution
// is not a layer 1 file so we need to temporarily
// at least prohibit terminal spam in this file

/**
 * Game logic specific to the LOBBY phase.
 * @module game/phases/lobbyPhase
 *
 * @see {@link module:src/config/constants}
 * @see {@link module:src/utils/logger}
 * @see {@link module:src/game/logic/validation-errors}
 * @see {@link module:test/game/phases/lobbyPhase.unit.test.js}
 */
import {
  GAME_PHASES,
  PLAYER_ROLES,
  PLAYER_POSITIONS,
} from "../../config/constants.js";
import {
  ValidationError,
  InvalidPhaseError,
  PhaseLogicError,
} from "../logic/validation-errors.js"; //file was moved for restructuring and rename to validation-errors.js
import logger from "../../utils/logger.js";

/**
 * A type representing one of the valid player role strings.
 * @typedef {'PLAYER_SOUTH'|'PLAYER_WEST'|'PLAYER_NORTH'|'PLAYER_EAST'} PlayerRole
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
 * @property {keyof typeof GAME_PHASES} gamePhase - Current phase of the game.
 * @property {PlayerRole} dealer - The role of the current dealer.
 * @property {Object.<PlayerRole, Player>} players - An object mapping player roles to player data.
 * @property {Array<object>} deck - The array of cards remaining in the deck.
 * @property {string|null} trumpSuit - The current trump suit.
 * @property {Array<object>} currentTrick - An array of cards played in the current trick.
 * @property {object<string, number>} tricksTaken - An object mapping team IDs to the number of tricks taken by that team.
 * @property {string|null} makerTeam - The team that made trump, or null.
 * @property {PlayerRole|null} makerPlayerRole - The player who made trump, or null.
 * @property {boolean} goingAlone - True if a player is going alone.
 * @property {PlayerRole|null} playerGoingAlone - The role of the player going alone, if any.
 * @property {PlayerRole|null} partnerSittingOut - The role of the partner sitting out when going alone.
 * @property {object<string, number>} teamScores - An object mapping team IDs to their current scores.
 * @property {Array<object>} kitty - Cards in the kitty.
 * @property {object|null} turnCard - The card turned up as potential trump.
 * @property {PlayerRole} currentPlayer - The role of the current player.
 * @property {Array<object>} gameMessages - Log of game events and messages.
 * @property {string|null} leadSuit - The lead suit of the current trick.
 */

/**
 * Attempts to start the game from the LOBBY phase.
 * Validates if enough players are connected and transitions the game phase.
 *
 * @param {GameState} currentGameState - The current game state object.
 * @param {PlayerRole} requestingPlayerRole - The role of the player attempting to start the game.
 * @returns {{success: boolean, updatedGameState: GameState, message: string}} An object indicating success, the updated game state, and a message.
 * @throws {ValidationError} If `currentGameState` or `requestingPlayerRole` is missing.
 * @throws {InvalidPhaseError} If the game is not in the LOBBY phase, or if phase changes unexpectedly.
 * @throws {PhaseLogicError} If not enough players are connected.
 */
export function attemptToStartGame(currentGameState, requestingPlayerRole) {
  logger.debug(
    { gameId: currentGameState?.gameId, requestingPlayerRole },
    "Attempting to start game from lobby."
  );

  if (!currentGameState || !currentGameState.players || !requestingPlayerRole) {
    logger.warn(
      { currentGameState, requestingPlayerRole },
      "ValidationError: Missing currentGameState or requestingPlayerRole to start game."
    );
    throw new ValidationError(
      "Internal error: Missing currentGameState or requestingPlayerRole to start game."
    );
  }

  if (currentGameState.gamePhase !== GAME_PHASES.GAME_PHASE_LOBBY) {
    logger.warn(
      {
        gameId: currentGameState.gameId,
        currentPhase: currentGameState.gamePhase,
      },
      `InvalidPhaseError: Game cannot be started from ${currentGameState.gamePhase} phase. Must be in LOBBY phase.`
    );
    throw new InvalidPhaseError(
      `Game cannot be started from ${currentGameState.gamePhase} phase. Must be in LOBBY phase.`,
      "start game",
      GAME_PHASES.GAME_PHASE_LOBBY
    );
  }

  const connectedPlayers = PLAYER_ROLES.filter(
    (role) =>
      currentGameState.players[role] &&
      currentGameState.players[role].isConnected
  ).length;

  const requiredPlayers = PLAYER_ROLES.length;

  if (connectedPlayers < requiredPlayers) {
    logger.warn(
      { gameId: currentGameState.gameId, connectedPlayers, requiredPlayers },
      `PhaseLogicError: Not enough players to start. Need ${requiredPlayers}, have ${connectedPlayers}.`
    );
    throw new PhaseLogicError(
      `Not enough players to start. Need ${requiredPlayers}, have ${connectedPlayers}.`
    );
  }

  // All conditions met, proceed to start the game
  // Create a deep clone to ensure immutability of the input state
  const newState = JSON.parse(JSON.stringify(currentGameState));

  const gameStartMessage = {
    type: "system",
    text: `Game started by ${newState.players[requestingPlayerRole]?.name || requestingPlayerRole}. Preparing to deal...`,
    timestamp: new Date().toISOString(),
  };

  newState.gamePhase = GAME_PHASES.GAME_PHASE_DEALING;
  newState.gameMessages = [...(newState.gameMessages || []), gameStartMessage];
  // Initialize/reset other relevant fields for a new game start
  // currentPlayer will be set by the DEALING phase itself (startNewHand).
  // For now, just ensure phase transition.
  
    //uncomment to enable debug info to terminal  
  //logger.info(
  //  { gameId: newState.gameId, newPhase: newState.gamePhase },
  //  "Game successfully transitioned to DEALING phase."
  //);
  return {
    success: true,
    updatedGameState: newState,
    message: "Game successfully transitioned to DEALING phase.",
  };
}
