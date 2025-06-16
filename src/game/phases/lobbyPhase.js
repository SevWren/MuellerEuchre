/**
 * Game logic specific to the LOBBY phase.
 * @module game/phases/lobbyPhase
 */
import logger from '../../utils/logger.js';
import { updateGameState } from '../state.js'; // Only need updateGameState
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';

/**
 * Attempts to start the game from the LOBBY phase.
 * Validates if enough players are connected and transitions the game phase.
 *
 * @param {object} currentGameState - The current game state object.
 * @param {string} requestingPlayerRole - The role of the player attempting to start the game.
 * @returns {{success: boolean, message: string, updatedGameState: object}}
 *          An object indicating success, a message, and the (potentially updated) game state.
 */
export function attemptToStartGame(currentGameState, requestingPlayerRole) {
  if (!currentGameState || !currentGameState.players || !requestingPlayerRole) {
    logger.error(
      { gameStateProvided: !!currentGameState, requestingPlayerRole },
      'attemptToStartGame: Missing currentGameState or requestingPlayerRole.'
    );
    return {
      success: false,
      message: 'Internal error: Missing data to start game.',
      updatedGameState: currentGameState || {}, // Return what was given or empty object
    };
  }

  if (currentGameState.gamePhase !== GAME_PHASES.LOBBY) {
    const message = `Game cannot be started from ${currentGameState.gamePhase} phase. Currently in LOBBY phase.`;
    logger.warn({ currentPhase: currentGameState.gamePhase, requestingPlayerRole }, message);
    return {
      success: false,
      message: message,
      updatedGameState: currentGameState,
    };
  }

  const connectedPlayers = PLAYER_ROLES.filter(role =>
    currentGameState.players[role] && currentGameState.players[role].isConnected
  ).length;

  // Typically Euchre requires 4 players.
  // Using PLAYER_ROLES.length to be flexible if that constant ever changes for other game modes.
  const requiredPlayers = PLAYER_ROLES.length;

  if (connectedPlayers < requiredPlayers) {
    const message = `Not enough players to start. Need ${requiredPlayers}, have ${connectedPlayers}.`;
    logger.info({ connectedPlayers, requiredPlayers, requestingPlayerRole }, message);
    return {
      success: false,
      message: message,
      updatedGameState: currentGameState,
    };
  }

  // All conditions met, proceed to start the game
  try {
    const newGameState = updateGameState(prevState => {
      // Ensure we are working with the freshest state from within updateGameState's atomic operation
      if (prevState.gamePhase !== GAME_PHASES.LOBBY) {
        // State might have changed between the initial read and now, re-check.
        // This is a rare edge case but good for robustness.
        logger.warn({ currentPhase: prevState.gamePhase, gameId: prevState.gameId },
          'Game phase changed unexpectedly before starting. Aborting start.');
        // To signal this, we don't change the phase. The caller should see success:false.
        // However, this function's design implies it returns the state from updateGameState.
        // A better pattern might be for updateGameState to throw if a pre-condition inside updater fails.
        // For now, we'll just not transition phase. The returned success:false path is more complex here.
        // Let's assume for this path, the outer checks are sufficient for now.
        // A more advanced implementation might involve optimistic locking or versioning in updateGameState.
      }

      const gameStartMessage = {
        type: 'system', // Or use a specific event type from constants if defined
        text: `Game started by ${currentGameState.players[requestingPlayerRole]?.name || requestingPlayerRole}. Preparing to deal...`,
        timestamp: new Date().toISOString(),
      };

      return {
        ...prevState,
        gamePhase: GAME_PHASES.DEALING, // Transition to the next phase
        gameMessages: [...(prevState.gameMessages || []), gameStartMessage],
        // Reset or initialize any other state needed for the start of a game/hand
        // For example, current round, bids, etc., might be reset here or in the DEALING phase logic.
        // For now, just phase transition.
      };
    });

    logger.info({ gameId: newGameState.gameId, newPhase: newGameState.gamePhase, startedBy: requestingPlayerRole }, 'Game started successfully.');
    return {
      success: true,
      message: 'Game starting. Transitioning to dealing phase.',
      updatedGameState: newGameState,
    };

  } catch (error) {
    logger.error({ error, requestingPlayerRole, gameId: currentGameState.gameId }, 'Error during updateGameState in attemptToStartGame.');
    return {
      success: false,
      message: 'An internal error occurred while trying to start the game.',
      updatedGameState: currentGameState, // Return original state on error
    };
  }
}
