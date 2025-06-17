import { getGame, updateGame } from '../../db/gameRepository.js';
import { handlePlayCard } from '../../game/phases/playingPhase.js';
import { GAME_EVENTS, GAME_PHASES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

// Helper to create standardized error objects
const createErrorObject = (action, errorType, message, details) => ({
  action,
  errorType,
  message,
  details,
});

/**
 * Registers handlers for playing phase actions.
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerPlayingHandlers(socket, io) {
  const action = GAME_EVENTS.ACTION_PLAY_CARD;

  socket.on(action, async (data) => {
    // Input validation
    if (!data ||
        typeof data.gameId !== 'string' || !data.gameId.trim() ||
        typeof data.playerRole !== 'string' || !data.playerRole.trim() ||
        !data.card ||
        typeof data.card.suit !== 'string' || !data.card.suit.trim() ||
        typeof data.card.rank !== 'string' || !data.card.rank.trim()) {
      const error = createErrorObject(
        action,
        'VALIDATION_ERROR',
        'Invalid play card data: gameId, playerRole, and card (with non-empty suit and rank) are required.',
        { receivedData: data }
      );
      logger.warn({ socketId: socket.id, error, gameId: data?.gameId, playerRole: data?.playerRole }, `Validation error for ${action}`);
      socket.emit(GAME_EVENTS.ERROR, error); // Using GAME_EVENTS.ERROR as per original file's pattern
      return;
    }

    const { gameId, playerRole, card } = data;

    logger.info({ socketId: socket.id, gameId, playerRole, card, action }, `Received ${action}: ${playerRole} plays ${card.rank} of ${card.suit}`);

    try {
      const gameState = await getGame(gameId);
      if (!gameState) {
        const error = createErrorObject(action, 'NOT_FOUND_ERROR', 'Game not found.', { gameId });
        logger.warn({ socketId: socket.id, error, gameId, playerRole }, `${action}: Game not found.`);
        socket.emit(GAME_EVENTS.ERROR, error);
        return;
      }

      // Note: Authorization (is it player's turn? is player in game? is card in hand?)
      // is assumed to be handled by handlePlayCard and will throw an error if invalid.

      const newGameState = handlePlayCard(gameState, playerRole, card);
      await updateGame(gameId, newGameState);

      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, newGameState);
      logger.info({ gameId, action, currentPlayer: newGameState.currentPlayer, phase: newGameState.gamePhase },
                  `Emitted ${GAME_EVENTS.GAME_STATE_UPDATE} after card play.`);

      if (newGameState.gamePhase === GAME_PHASES.SCORING) {
        logger.info({ gameId, action }, `Hand complete. Game phase changed to SCORING.`);
        // Further specific events for SCORING could be emitted here if needed.
      }

    } catch (e) {
      // Errors from handlePlayCard are typically game logic errors (e.g., card not in hand, not player's turn)
      const errorType = e.errorType || 'GAME_LOGIC_ERROR'; // Allow error to specify its type
      const error = createErrorObject(action, errorType, e.message || 'Error processing your card play.', { gameId, playerRole, card, stack: e.stack });
      logger.warn({ socketId: socket.id, err: e, error, gameId, playerRole, card }, `Error processing ${action}: ${e.message}`);
      socket.emit(GAME_EVENTS.ERROR, error);
    }
  });
}
