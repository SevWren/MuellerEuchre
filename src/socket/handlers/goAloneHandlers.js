/**
 * Socket event handlers for the "Go Alone" decision phase.
 * @module socket/handlers/goAloneHandlers
 */
import logger from '../../utils/logger.js';
import { getGameState } from '../../game/state.js';
import { handleGoAloneDecision } from '../../game/phases/goAlonePhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
// import { GAME_EVENTS } from '../../config/constants.js'; // If event name becomes a constant

/**
 * Registers "go alone" decision event handlers for a given socket.
 * @param {object} socket - The Socket.IO socket instance for a client.
 * @param {object} io - The Socket.IO server instance.
 */
export function registerGoAloneHandlers(socket, io) {
  const eventName = 'action_go_alone_decision'; // As per plan

  /**
   * Handles 'action_go_alone_decision' from a client.
   * Expected data: { decision: boolean } (true for 'yes, go alone', false for 'no, play with partner')
   */
  socket.on(eventName, (data) => {
    const currentGameState = getGameState();
    const playerRole = getRoleBySocketId(currentGameState, socket.id);

    if (!playerRole) {
      logger.warn({ socketId: socket.id, event: eventName }, `Received event from unassigned socket.`);
      socket.emit('action_error', { message: 'Player role not recognized. Please rejoin.', event: eventName });
      return;
    }

    if (!data || typeof data.decision !== 'boolean') {
        logger.warn({ socketId: socket.id, playerRole, dataReceived: data }, `Invalid data for ${eventName}: 'decision' must be a boolean.`);
        socket.emit('action_error', { message: "Invalid 'go alone' decision data: 'decision' field must be true or false.", event: eventName });
        return;
    }
    const { decision } = data; // decision is true or false

    logger.info({ socketId: socket.id, playerRole, decision, gameId: currentGameState.gameId },
                `Received ${eventName}: ${decision ? 'Yes (Go Alone)' : 'No (Play with Partner)'}`);

    // Validation of whether it's the correct player's turn and phase is handled within handleGoAloneDecision
    try {
      const result = handleGoAloneDecision(currentGameState, playerRole, decision);

      if (result.success) {
        logger.info({ gameId: result.updatedGameState.gameId, playerRole, decision, newPhase: result.updatedGameState.gamePhase },
                    `'Go alone' decision processed. Broadcasting updated state. Message: ${result.message}`);
        io.emit('gameState', result.updatedGameState); // Broadcast to all
      } else {
        logger.warn({ socketId: socket.id, playerRole, gameId: currentGameState.gameId, reason: result.message },
                    `Processing ${eventName} failed for player ${playerRole}.`);
        socket.emit('action_error', { // Send error only to the requester
          message: result.message || `Could not process 'go alone' decision.`,
          event: eventName
        });
      }
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, playerRole, decision }, `Error processing ${eventName}.`);
      socket.emit('action_error', { message: error.message || `Error processing your 'go alone' decision.`, event: eventName });
    }
  });
}
