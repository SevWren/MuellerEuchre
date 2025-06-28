// filepath: src/socket/handlers/gameOverHandlers.js
import { gameRepository } from '../../../src/db/gameRepository.js';
import { handleNewGameRequest } from '../../../src/game/phases/scoringPhase.js'; // Re-using from scoringPhase.js as it contains new game logic
import { GAME_EVENTS, GAME_PHASES } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

/**
 * Registers handlers for game over actions
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerGameOverHandlers(socket, io) {
  socket.on(GAME_EVENTS.ACTION_REQUEST_NEW_GAME, async ({ gameId, playerRole }) => {
    logger.info(`[Game ID: ${gameId}] Received ${GAME_EVENTS.ACTION_REQUEST_NEW_GAME} from ${playerRole} (socket ${socket.id})`);
    try {
      const gameState = await gameRepository.getGame(gameId); // Corrected Call
      if (!gameState) {
        socket.emit(GAME_EVENTS.ERROR, { message: 'Game not found.' });
        logger.error(`[Game ID: ${gameId}] Game not found for ${GAME_EVENTS.ACTION_REQUEST_NEW_GAME}`);
        return;
      }

      if (gameState.gamePhase !== GAME_PHASES.GAME_OVER) {
        socket.emit(GAME_EVENTS.ERROR, { message: 'Game is not over yet.' });
        logger.warn(`[Game ID: ${gameId}] ${GAME_EVENTS.ACTION_REQUEST_NEW_GAME} called when game phase is ${gameState.gamePhase}`);
        return;
      }

      const newGameState = handleNewGameRequest(gameState);
      
      await gameRepository.updateGame(gameId, newGameState); // Corrected Call

      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, newGameState);
      logger.info(`[Game ID: ${gameId}] Emitted ${GAME_EVENTS.GAME_STATE_UPDATE} for new game. New state game ID: ${newGameState.gameId}. Phase: ${newGameState.gamePhase}`);

      if (newGameState.gameId !== gameId) {
        logger.warn(`[Game ID: ${gameId}] Game was reset, and a new gameId ${newGameState.gameId} was generated. Clients in room ${gameId} received the new state. Ensure client handles potential gameId change.`);
      }

    } catch (error) {
      logger.error(`[Game ID: ${gameId}] Error in ${GAME_EVENTS.ACTION_REQUEST_NEW_GAME} handler: ${error.message}`);
      socket.emit(GAME_EVENTS.ERROR, { message: error.message });
    }
  });
}