import { getGame, updateGame } from '../../db/gameRepository.js';
import { handlePlayCard } from '../../game/phases/playingPhase.js';
import { GAME_EVENTS, GAME_PHASES } from '../../config/constants.js'; // Added GAME_PHASES
import logger from '../../utils/logger.js';

/**
 * Registers handlers for playing phase actions.
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerPlayingHandlers(socket, io) {
  socket.on(GAME_EVENTS.ACTION_PLAY_CARD, async ({ gameId, playerRole, card }) => {
    logger.info(`[Game ID: ${gameId}] Received ${GAME_EVENTS.ACTION_PLAY_CARD} from ${playerRole} with card ${card.rank} of ${card.suit}`);
    try {
      const gameState = await getGame(gameId);
      if (!gameState) {
        socket.emit(GAME_EVENTS.ERROR, { message: 'Game not found.' });
        logger.error(`[Game ID: ${gameId}] Game not found for ${GAME_EVENTS.ACTION_PLAY_CARD}`);
        return;
      }

      // Basic validation for card object
      if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
        socket.emit(GAME_EVENTS.ERROR, { message: 'Invalid card data.' });
        logger.warn(`[Game ID: ${gameId}] Invalid card data from ${playerRole}: ${JSON.stringify(card)}`);
        return;
      }

      const newGameState = handlePlayCard(gameState, playerRole, card);
      await updateGame(gameId, newGameState);

      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, newGameState);
      logger.info(`[Game ID: ${gameId}] Emitted ${GAME_EVENTS.GAME_STATE_UPDATE} after card play. Current player: ${newGameState.currentPlayer}, Phase: ${newGameState.gamePhase}`);

      // If phase changed to SCORING, potentially emit another event or let client handle via gameStateUpdate
      if (newGameState.gamePhase === GAME_PHASES.SCORING) { // Used GAME_PHASES.SCORING
         logger.info(`[Game ID: ${gameId}] Hand complete. Game phase changed to SCORING.`);
         // The GAME_STATE_UPDATE above already sends the new phase.
         // If specific SCORING event is needed, it can be added here.
         // For example: io.to(gameId).emit(GAME_EVENTS.HAND_COMPLETED, newGameState);
      }

    } catch (error) {
      logger.error(`[Game ID: ${gameId}] Error in ${GAME_EVENTS.ACTION_PLAY_CARD} handler: ${error.message}`);
      socket.emit(GAME_EVENTS.ERROR, { message: error.message });
    }
  });
}
