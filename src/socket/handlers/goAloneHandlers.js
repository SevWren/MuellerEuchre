/**
 * Socket event handlers for the "Go Alone" decision phase.
 * @module socket/handlers/goAloneHandlers
 */
import logger from '../../utils/logger.js';
import { handleGoAloneDecision } from '../../game/phases/goAlonePhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { getGame, updateGame } from '../../db/gameRepository.js';
import { GAME_EVENTS } from '../../config/constants.js';

// Helper to create standardized error objects
const createErrorObject = (action, errorType, message, details) => ({
  action,
  errorType,
  message,
  details,
});

/**
 * Registers "go alone" decision event handlers for a given socket.
 * @param {object} socket - The Socket.IO socket instance for a client.
 * @param {object} io - The Socket.IO server instance.
 */
export function registerGoAloneHandlers(socket, io) {
  const action = GAME_EVENTS.ACTION_GO_ALONE_DECISION; // Use action constant

  /**
   * Handles 'action_go_alone_decision' from a client.
   * Expected data: { gameId: string, decision: boolean }
   */
  socket.on(action, async (data) => {
    // Enhanced input validation
    if (!data || typeof data.gameId !== 'string' || !data.gameId.trim() || typeof data.decision !== 'boolean') {
      const errorDetails = { receivedData: data, requiredFields: { gameId: 'non-empty string', decision: 'boolean' } };
      const error = createErrorObject(action, 'INVALID_INPUT', "Invalid 'go alone' decision data: 'gameId' (non-empty string) and 'decision' (boolean) fields are required.", errorDetails);
      logger.warn({ socketId: socket.id, error, gameId: data?.gameId }, `Validation error for ${action}`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return;
    }
    const { gameId, decision } = data;

    try {
      const currentGameState = await getGame(gameId);
      if (!currentGameState) {
        const error = createErrorObject(action, 'GAME_NOT_FOUND', 'Game not found.', { gameId });
        logger.warn({ socketId: socket.id, error, gameId }, `${action}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return;
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        const error = createErrorObject(action, 'PLAYER_NOT_IN_GAME', 'Player role not recognized for this game.', { gameId, socketId: socket.id });
        logger.warn({ socketId: socket.id, error, gameId }, `Received ${action} from unassigned socket for this game.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return;
      }

      logger.info({ socketId: socket.id, playerRole, decision, gameId, action },
                  `Received ${action}: ${decision ? 'Yes (Go Alone)' : 'No (Play with Partner)'}`);

      // Validation of player and phase is handled within handleGoAloneDecision
      const result = handleGoAloneDecision(currentGameState, playerRole, decision);

      if (result.success && result.updatedGameState) {
        await updateGame(gameId, result.updatedGameState);
        logger.info({ gameId, playerRole, decision, newPhase: result.updatedGameState.gamePhase, action, message: result.message },
                    `'Go alone' decision processed successfully, state saved. Broadcasting updated state.`);
        io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, result.updatedGameState); // Broadcast to game room
      } else {
        // Handle errors from handleGoAloneDecision
        const errorType = result.errorType || 'GAME_LOGIC_ERROR'; // Use provided errorType or default
        const errorMessage = result.message || `Could not process 'go alone' decision.`;
        const error = createErrorObject(action, errorType, errorMessage, { gameId, playerRole, decision });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, reason: result.message },
                    `Processing ${action} failed for player ${playerRole}.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      }
    } catch (e) {
      const error = createErrorObject(action, 'INTERNAL_SERVER_ERROR', e.message || `Error processing your 'go alone' decision.`, { gameId, decision, stack: e.stack });
      logger.error({ err: e, socketId: socket.id, gameId, decision, action }, `Error processing ${action}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
    }
  });
}

// Conceptual notes for goAloneHandlers.js tests:
// describe('Go Alone Handlers', () => { // NOSONAR
//   // ... (mock socket, io, getGame, updateGame, handleGoAloneDecision) // NOSONAR
//   it('should process go_alone_decision, save state, and broadcast if successful', async () => { // NOSONAR
//     // Setup: mock getGame, handleGoAloneDecision to return success=true & updatedGameState // NOSONAR
//     // Action: Simulate ACTION_GO_ALONE_DECISION // NOSONAR
//     // Assert: updateGame called, io.to(gameId).emit called. // NOSONAR
//   }); // NOSONAR
//   it('should emit error to player if handleGoAloneDecision returns success=false', async () => { // NOSONAR
//     // Setup: mock getGame, handleGoAloneDecision to return success=false // NOSONAR
//     // Action: Simulate ACTION_GO_ALONE_DECISION // NOSONAR
//     // Assert: socket.emit(ACTION_ERROR, ...) called. // NOSONAR
//     // Assert: updateGame NOT called. // NOSONAR
//   }); // NOSONAR
//   // ... tests for invalid data, game not found, player not in game, errors during phase logic. // NOSONAR
// }); // NOSONAR
