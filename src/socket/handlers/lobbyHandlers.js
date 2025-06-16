/**
 * Socket event handlers for the LOBBY game phase.
 * @module socket/handlers/lobbyHandlers
 */
import logger from '../../utils/logger.js';
// import { getGameState } from '../../game/state.js'; // No longer using global state directly for game operations
import { attemptToStartGame } from '../../game/phases/lobbyPhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { getGame, updateGame } from '../../db/gameRepository.js';
import { GAME_EVENTS } from '../../config/constants.js'; // Using for event names like 'gameState', 'action_error'

/**
 * Registers lobby-specific event handlers for a given socket.
 * @param {object} socket - The Socket.IO socket instance for a client.
 * @param {object} io - The Socket.IO server instance.
 */
export function registerLobbyHandlers(socket, io) {
  /**
   * Handles a client's request to start the game.
   * Expected data: { gameId: string }
   */
  socket.on('request_start_game', async (data) => {
    if (!data || !data.gameId) {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for request_start_game: gameId missing.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { // Use constant for event name
        message: 'Invalid request: gameId is required.',
        event: 'request_start_game'
      });
      return;
    }
    const { gameId } = data;

    try {
      const currentGameState = await getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, 'request_start_game: Game not found.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found. Cannot start.', event: 'request_start_game' });
        return;
      }

      const requestingPlayerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!requestingPlayerRole) {
        logger.warn({ socketId: socket.id, gameId }, 'request_start_game: Requesting user not found in this game or has no role.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: 'Cannot start game: Your player role is not recognized for this game. Please rejoin.',
          event: 'request_start_game'
        });
        return;
      }

      logger.info(
        { socketId: socket.id, role: requestingPlayerRole, gameId },
        `Player ${requestingPlayerRole} is requesting to start game ${gameId}.`
      );

      const result = attemptToStartGame(currentGameState, requestingPlayerRole);

      if (result.success && result.updatedGameState) {
        await updateGame(gameId, result.updatedGameState);
        logger.info(
          { gameId, newPhase: result.updatedGameState.gamePhase },
          `Game start successful. Broadcasting updated state. Message: ${result.message}`
        );
        io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, result.updatedGameState); // Broadcast to game room
      } else {
        logger.warn(
          { socketId: socket.id, role: requestingPlayerRole, gameId, reason: result.message },
          'Request to start game failed.'
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: result.message || 'Could not start the game.',
          event: 'request_start_game'
         });
      }
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId }, `Error processing request_start_game for game ${gameId}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, {
        message: error.message || 'An error occurred while trying to start the game.',
        event: 'request_start_game'
      });
    }
  });

  // Note: Player joining/leaving lobby would also need to use getGame/updateGame.
  // These are typically part of playerConnectionHandlers (handlePlayerConnect, handlePlayerDisconnect, handleRejoinGame)
  // which should already be updating the specific game state in DB after a player joins/leaves a game's player list.
  // If there are lobby-specific actions beyond starting (e.g. "ready" button), they'd follow this pattern:
  // socket.on('action_player_ready', async ({ gameId, isReady }) => { ... getGame, modify, updateGame ... });
}

// Conceptual notes for lobbyHandlers.js tests:
// describe('Lobby Handlers', () => {
//   // ... (mock socket, io, getGame, updateGame)
//   it('should start the game and save state if conditions are met', async () => {
//     // Setup: mock getGame to return a valid lobby state.
//     // mock attemptToStartGame to return success = true and an updatedGameState.
//     // Action: Simulate 'request_start_game' event.
//     // Assert: updateGame was called with the updatedGameState.
//     // Assert: io.to(gameId).emit was called with GAME_STATE_UPDATE.
//   });
//   it('should emit error if game not found', async () => {
//     // Setup: mock getGame to return null.
//     // Action: Simulate 'request_start_game'.
//     // Assert: socket.emit(ACTION_ERROR, ...) was called.
//     // Assert: updateGame was NOT called.
//   });
//   // ... other tests for invalid player, attemptToStartGame failure, etc.
// });
