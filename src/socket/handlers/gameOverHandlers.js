import { getGame, updateGame } from '../../db/gameRepository.js';
import { handleNewGameRequest } from '../../game/phases/scoringPhase.js';
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
 * Registers handlers for game over actions.
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerGameOverHandlers(socket, io) {
  socket.on(GAME_EVENTS.ACTION_REQUEST_NEW_GAME, async (data) => {
    const action = GAME_EVENTS.ACTION_REQUEST_NEW_GAME;

    // Input validation
    if (!data || typeof data.gameId !== 'string' || !data.gameId.trim() || typeof data.playerRole !== 'string' || !data.playerRole.trim()) {
      const error = createErrorObject(action, 'INVALID_INPUT', 'gameId and playerRole are required and must be non-empty strings.', { receivedData: data });
      logger.warn({ socketId: socket.id, error, gameId: data?.gameId, playerRole: data?.playerRole }, `Validation error for ${action}`);
      socket.emit(GAME_EVENTS.ERROR, error); // Note: GAME_EVENTS.ERROR is used here as per original code, not GAME_EVENTS.ACTION_ERROR
      return;
    }
    const { gameId, playerRole } = data;

    logger.info({ gameId, playerRole, socketId: socket.id, action }, `Received ${action}`);

    try {
      const gameState = await getGame(gameId);
      if (!gameState) {
        const error = createErrorObject(action, 'GAME_NOT_FOUND', 'Game not found.', { gameId });
        logger.warn({ socketId: socket.id, error, gameId, playerRole }, `${action}: Game not found.`);
        socket.emit(GAME_EVENTS.ERROR, error);
        return;
      }

      // Authorization check
      if (!gameState.players[playerRole] || gameState.players[playerRole].socketId !== socket.id) {
        const error = createErrorObject(action, 'AUTHORIZATION_ERROR', 'Player not authorized or not part of this game.', { gameId, playerRole, expectedSocketId: gameState.players[playerRole]?.socketId, actualSocketId: socket.id });
        logger.warn({ socketId: socket.id, error, gameId, playerRole }, `${action}: Authorization failed.`);
        socket.emit(GAME_EVENTS.ERROR, error);
        return;
      }

      if (gameState.gamePhase !== GAME_PHASES.GAME_OVER) {
        const error = createErrorObject(action, 'INVALID_PHASE', 'Game is not over yet.', { gameId, currentPhase: gameState.gamePhase });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, currentPhase: gameState.gamePhase }, `${action} called when game phase is ${gameState.gamePhase}`);
        socket.emit(GAME_EVENTS.ERROR, error);
        return;
      }

      const newGameState = handleNewGameRequest(gameState);

      // The logic regarding gameId potentially changing and how updateGame/clients handle it is complex.
      // Retaining existing comments and logging for this, as it's important operational context.
      logger.info({ gameId, newGameId: newGameState.gameId, action }, `Proceeding to update game. Original gameId: ${gameId}, new state's gameId: ${newGameState.gameId}`);

      await updateGame(gameId, newGameState); // Assumes updateGame correctly handles replacing the state at 'gameId'

      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, newGameState);
      logger.info({ originalGameId: gameId, newGameId: newGameState.gameId, playerRole, action }, `${action} processed. Emitted ${GAME_EVENTS.GAME_STATE_UPDATE} to room ${gameId}. New state game ID: ${newGameState.gameId}, Phase: ${newGameState.gamePhase}`);

      if (newGameState.gameId !== gameId) {
        logger.warn({ originalGameId: gameId, newGameId: newGameState.gameId, playerRole, action }, `Game was reset, and a new gameId ${newGameState.gameId} was generated. Clients in room ${gameId} received the new state. Ensure client handles potential gameId change.`);
      }

    } catch (e) {
      const error = createErrorObject(action, 'INTERNAL_SERVER_ERROR', e.message || 'Error processing request new game.', { gameId, playerRole, stack: e.stack });
      logger.error({ err: e, socketId: socket.id, gameId, playerRole, action }, `Error processing ${action}.`);
      socket.emit(GAME_EVENTS.ERROR, error);
    }
  });
}
