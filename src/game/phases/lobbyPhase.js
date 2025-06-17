/**
 * Game logic specific to the LOBBY phase.
 * @module game/phases/lobbyPhase
 */
import logger from '../../utils/logger.js';
// Removed import of updateGameState from '../state.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';

/**
 * Attempts to start the game from the LOBBY phase.
 * Validates if enough players are connected and transitions the game phase.
 * This is now a pure function. It returns the new game state or throws a structured error.
 *
 * @param {object} currentGameState - The current game state object.
 * @param {string} requestingPlayerRole - The role of the player attempting to start the game.
 * @returns {object} The updated game state.
 * @throws {object} Error object with message, errorType, and details.
 */
export function attemptToStartGame(currentGameState, requestingPlayerRole) {
  const gameId = currentGameState?.gameId; // For logging context

  // Enhanced input parameter validation
  if (!currentGameState || !currentGameState.players) {
    const error = { message: 'Invalid currentGameState: must be provided with players.', errorType: 'INVALID_INPUT', details: { gameStateProvided: !!currentGameState } };
    logger.error({ error, gameId, requestingPlayerRole }, "attemptToStartGame: Missing or invalid currentGameState.");
    throw error;
  }
  if (typeof requestingPlayerRole !== 'string' || !requestingPlayerRole.trim() || !currentGameState.players[requestingPlayerRole]) {
    const error = { message: 'Invalid requestingPlayerRole: must be a non-empty string and exist in players.', errorType: 'INVALID_INPUT', details: { requestingPlayerRole } };
    logger.error({ error, gameId, requestingPlayerRole, players: currentGameState.players }, "attemptToStartGame: Invalid or missing requestingPlayerRole.");
    throw error;
  }

  logger.info({ gameId, requestingPlayerRole }, 'Attempting to start game.');
  const prevState = JSON.parse(JSON.stringify(currentGameState)); // Deep clone

  if (prevState.gamePhase !== GAME_PHASES.LOBBY) {
    const error = {
      message: `Game cannot be started from ${prevState.gamePhase} phase. Must be in LOBBY.`,
      errorType: 'INVALID_PHASE',
      details: { currentPhase: prevState.gamePhase, expectedPhase: GAME_PHASES.LOBBY }
    };
    logger.warn({ error, gameId, requestingPlayerRole }, error.message);
    throw error;
  }

  const connectedPlayers = PLAYER_ROLES.filter(role =>
    prevState.players[role] && prevState.players[role].isConnected
  ).length;

  const requiredPlayers = PLAYER_ROLES.length;

  if (connectedPlayers < requiredPlayers) {
    const error = {
      message: `Not enough players to start. Need ${requiredPlayers}, have ${connectedPlayers}.`,
      errorType: 'NOT_ENOUGH_PLAYERS',
      details: { connectedPlayers, requiredPlayers }
    };
    logger.warn({ error, gameId, requestingPlayerRole }, error.message); // Changed from info to warn as it's a failed attempt
    throw error;
  }

  // All conditions met, proceed to start the game
  const gameStartMessage = {
    type: 'system',
    text: `Game started by ${prevState.players[requestingPlayerRole]?.name || requestingPlayerRole}. Preparing to deal...`,
    timestamp: new Date().toISOString(),
  };

  const updatedGameState = {
    ...prevState,
    gamePhase: GAME_PHASES.DEALING,
    gameMessages: [...(prevState.gameMessages || []), gameStartMessage],
    // Other state resets for a new hand/game (e.g., current round, bids) would typically
    // be handled by the dealing logic itself or a dedicated "startNewHand" function.
    // For now, this function focuses on the phase transition from LOBBY.
  };

  logger.info({ gameId, newPhase: updatedGameState.gamePhase, startedBy: requestingPlayerRole }, 'Game start conditions met. Transitioning to DEALING phase.');
  return updatedGameState;
}
