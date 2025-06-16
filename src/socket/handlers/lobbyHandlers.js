/**
 * Socket event handlers for the LOBBY game phase.
 * @module socket/handlers/lobbyHandlers
 */
import logger from '../../utils/logger.js';
import { getGameState } from '../../game/state.js';
import { attemptToStartGame } from '../../game/phases/lobbyPhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
// import { GAME_EVENTS } from '../../config/constants.js'; // If 'request_start_game' becomes a constant

/**
 * Registers lobby-specific event handlers for a given socket.
 * @param {object} socket - The Socket.IO socket instance for a client.
 * @param {object} io - The Socket.IO server instance.
 */
export function registerLobbyHandlers(socket, io) {
  /**
   * Handles a client's request to start the game.
   */
  socket.on('request_start_game', () => {
    const currentGameState = getGameState();
    const requestingPlayerRole = getRoleBySocketId(currentGameState, socket.id);

    if (!requestingPlayerRole) {
      logger.warn({ socketId: socket.id },
        'Received request_start_game from socket with no assigned role or not found in state.'
      );
      socket.emit('action_error', {
        message: 'Cannot start game: Your player role is not recognized. Please rejoin.',
        event: 'request_start_game'
      });
      return;
    }

    logger.info(
      { socketId: socket.id, role: requestingPlayerRole, gameId: currentGameState.gameId },
      `Player ${requestingPlayerRole} is requesting to start the game.`
    );

    const result = attemptToStartGame(currentGameState, requestingPlayerRole);

    if (result.success) {
      logger.info(
        { gameId: result.updatedGameState.gameId, newPhase: result.updatedGameState.gamePhase },
        `Game start successful. Broadcasting updated state. Message: ${result.message}`
      );
      io.emit('gameState', result.updatedGameState); // Broadcast to all
    } else {
      logger.warn(
        { socketId: socket.id, role: requestingPlayerRole, gameId: currentGameState.gameId, reason: result.message },
        'Request to start game failed.'
      );
      socket.emit('action_error', { // Send error only to the requester
        message: result.message || 'Could not start the game.',
        event: 'request_start_game'
       });
    }
  });

  // Add other lobby-specific handlers here if any in the future
  // For example, a 'player_ready' toggle if that feature is added.
}
