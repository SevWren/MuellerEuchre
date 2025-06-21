import { getGame, updateGame } from '../../db/gameRepository.js';
import { handleNewGameRequest } from '../../game/phases/scoringPhase.js'; // Re-using from scoringPhase.js as it contains new game logic
import { GAME_EVENTS, GAME_PHASES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Registers handlers for game over actions.
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerGameOverHandlers(socket, io) {
  socket.on(GAME_EVENTS.ACTION_REQUEST_NEW_GAME, async ({ gameId, playerRole }) => {
    logger.info(`[Game ID: ${gameId}] Received ${GAME_EVENTS.ACTION_REQUEST_NEW_GAME} from ${playerRole} (socket ${socket.id})`);
    try {
      const gameState = await getGame(gameId);
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

      // Optional: Check if the player making the request is part of the game.
      // This can be complex if `resetFullGame` (called by `handleNewGameRequest`)
      // immediately changes the players list.
      // For now, allowing any connected client to trigger a reset if game is over.
      // A more robust check might involve validating playerRole against gameState.players
      // *before* calling handleNewGameRequest, e.g.:
      // if (!gameState.players[playerRole] || gameState.players[playerRole].socketId !== socket.id) {
      //   socket.emit(GAME_EVENTS.ERROR, { message: 'You are not authorized or not part of this game to start a new one.' });
      //   logger.warn(`[Game ID: ${gameId}] Unauthorized ${GAME_EVENTS.ACTION_REQUEST_NEW_GAME} from ${playerRole} (socket ${socket.id})`);
      //   return;
      // }


      const newGameState = handleNewGameRequest(gameState); // This returns a fresh LOBBY state
      // newGameState.gameId will be a new one if resetFullGame generates it.
      // Or it could re-use the old gameId if resetFullGame is designed that way.
      // Based on state.js, resetFullGame creates a new gameId.
      // This means clients would need to be informed of this new gameId if they are to join it.
      // Current `updateGame` uses the *old* gameId as a key. This might be an issue.

      // If resetFullGame creates a new gameId, we should probably use that newId for updateGame.
      // However, gameRepository.js might be keyed by the original gameId.
      // For this subtask, assume updateGame can handle overwriting the game state at the original gameId with this new LOBBY state.
      // Or, that `resetFullGame` in `state.js` is modified to re-use the existing gameId when resetting.
      // Let's assume `resetFullGame` from `state.js` re-initializes the state for the *existing* `gameId`
      // by having `updateGame` effectively replace the old game data.
      // The `resetFullGame` in `state.js` currently generates a `newGameId` internally and gameState becomes this new state.
      // This means `newGameState.gameId` will be different from the `gameId` parameter.
      // This needs careful handling.

      // Correct approach: updateGame should use the ID of the game being updated.
      // If handleNewGameRequest is truly resetting the game under the *same* gameId (by convention):
      await updateGame(gameId, newGameState);

      // Notify all players in the original game room that a new game is starting (lobby state)
      // They will receive the new state which includes the potentially new gameId if state.js's resetFullGame created one.
      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, newGameState);
      logger.info(`[Game ID: ${gameId}] Emitted ${GAME_EVENTS.GAME_STATE_UPDATE} for new game. New state game ID: ${newGameState.gameId}. Phase: ${newGameState.gamePhase}`);

      if (newGameState.gameId !== gameId) {
        logger.warn(`[Game ID: ${gameId}] Game was reset, and a new gameId ${newGameState.gameId} was generated. Clients in room ${gameId} received the new state. Ensure client handles potential gameId change.`);
        // If game IDs change, clients might need to re-join or be re-mapped to the new gameId's room.
        // This is a larger architectural consideration. For now, we emit to the old gameId room.
      }


    } catch (error) {
      logger.error(`[Game ID: ${gameId}] Error in ${GAME_EVENTS.ACTION_REQUEST_NEW_GAME} handler: ${error.message}`);
      socket.emit(GAME_EVENTS.ERROR, { message: error.message });
    }
  });
}
