/**
 * Game logic specific to the LOBBY phase.
 * @module game/phases/lobbyPhase
 */
import { GAME_PHASES, PLAYER_ROLES } from "../../config/constants.js";
import {
  ValidationError,
  InvalidPhaseError,
  PhaseLogicError,
} from "../logic/errors.js";
import logger from "../../utils/logger.js";

/**
 * Attempts to start the game from the LOBBY phase.
 * Validates if enough players are connected and transitions the game phase.
 *
 * @param {object} currentGameState - The current game state object.
 * @param {string} requestingPlayerRole - The role of the player attempting to start the game.
 * @returns {object} The updated game state.
 * @throws {ValidationError} If `currentGameState` or `requestingPlayerRole` is missing.
 * @throws {InvalidPhaseError} If the game is not in the LOBBY phase, or if phase changes unexpectedly.
 * @throws {PhaseLogicError} If not enough players are connected.
 */
export function attemptToStartGame(currentGameState, requestingPlayerRole) {
  logger.debug(
    { gameId: currentGameState?.gameId, requestingPlayerRole },
    "Attempting to start game from lobby.",
  );

  if (!currentGameState || !currentGameState.players || !requestingPlayerRole) {
    logger.warn(
      { currentGameState, requestingPlayerRole },
      "ValidationError: Missing currentGameState or requestingPlayerRole to start game.",
    );
    throw new ValidationError(
      "Internal error: Missing currentGameState or requestingPlayerRole to start game.",
    );
  }

  if (currentGameState.gamePhase !== GAME_PHASES.LOBBY) {
    logger.warn(
      {
        gameId: currentGameState.gameId,
        currentPhase: currentGameState.gamePhase,
      },
      `InvalidPhaseError: Game cannot be started from ${currentGameState.gamePhase} phase. Must be in LOBBY phase.`,
    );
    throw new InvalidPhaseError(
      `Game cannot be started from ${currentGameState.gamePhase} phase. Must be in LOBBY phase.`,
    );
  }

  const connectedPlayers = PLAYER_ROLES.filter(
    (role) =>
      currentGameState.players[role] &&
      currentGameState.players[role].isConnected,
  ).length;

  const requiredPlayers = PLAYER_ROLES.length;

  if (connectedPlayers < requiredPlayers) {
    logger.warn(
      { gameId: currentGameState.gameId, connectedPlayers, requiredPlayers },
      `PhaseLogicError: Not enough players to start. Need ${requiredPlayers}, have ${connectedPlayers}.`,
    );
    throw new PhaseLogicError(
      `Not enough players to start. Need ${requiredPlayers}, have ${connectedPlayers}.`,
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

  newState.gamePhase = GAME_PHASES.DEALING;
  newState.gameMessages = [...(newState.gameMessages || []), gameStartMessage];
  // Initialize/reset other relevant fields for a new game start
  // currentPlayer will be set by the DEALING phase itself (startNewHand).
  // For now, just ensure phase transition.
  logger.info(
    { gameId: newState.gameId, newPhase: newState.gamePhase },
    "Game successfully transitioned to DEALING phase.",
  );
  return {
    success: true,
    updatedGameState: newState,
    message: "Game successfully transitioned to DEALING phase.",
  };
}
