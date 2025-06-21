/**
 * Socket event handlers for the "Go Alone" decision phase.
 * @module socket/handlers/goAloneHandlers
 */
import logger from '../../utils/logger.js';
// import { getGameState } from '../../game/state.js'; // No longer using global state
import { handleGoAloneDecision } from '../../game/phases/goAlonePhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { getGame, updateGame } from '../../db/gameRepository.js';
import { GAME_EVENTS } from '../../config/constants.js';

/**
 * Registers event handlers for the "go alone" decision phase of the game.
 * Specifically, it listens for a player's decision on whether to play alone or with their partner.
 *
 * @param {import('socket.io').Socket} socket - The socket instance for the connected client.
 * @param {import('socket.io').Server} io - The Socket.IO server instance, used for broadcasting.
 */
export function registerGoAloneHandlers(socket, io) {
  const eventName = GAME_EVENTS.ACTION_GO_ALONE_DECISION;

  /**
   * Handles the 'ACTION_GO_ALONE_DECISION' event emitted by a client.
   * This event signifies the trump-making player's choice to "go alone" or play with their partner.
   *
   * The handler validates the incoming data, retrieves the game state, determines the player's role,
   * and then calls `handleGoAloneDecision` from `goAlonePhase.js` to process the decision.
   *
   * If the decision is processed successfully (indicated by `result.success`), the updated game state
   * is saved to the database and broadcast to all clients in the game room via `GAME_EVENTS.GAME_STATE_UPDATE`.
   * If processing fails, an `ACTION_ERROR` is emitted back to the originating client.
   *
   * Note: This handler does not use an explicit `ack` callback pattern like some other handlers.
   * Success/failure is communicated via `GAME_STATE_UPDATE` or `ACTION_ERROR` respectively.
   *
   * @param {object} data - The payload received from the client.
   * @param {string} data.gameId - The ID of the game for which the decision is being made.
   * @param {boolean} data.decision - True if the player chooses to go alone, false otherwise.
   */
  socket.on(eventName, async (data) => {
    if (!data || !data.gameId || typeof data.decision !== 'boolean') {
      logger.warn({ socketId: socket.id, dataReceived: data }, `Invalid data for ${eventName}: gameId and boolean decision required.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: "Invalid 'go alone' decision data: 'gameId' and 'decision' fields are required.", event: eventName });
      return;
    }
    const { gameId, decision } = data;

    try {
      const currentGameState = await getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, `${eventName}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found.', event: eventName });
        return;
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn({ socketId: socket.id, gameId, event: eventName }, `Received event from unassigned socket for this game.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Player role not recognized for this game.', event: eventName });
        return;
      }

      logger.info({ socketId: socket.id, playerRole, decision, gameId },
                  `Received ${eventName}: ${decision ? 'Yes (Go Alone)' : 'No (Play with Partner)'}`);

      // Validation of player and phase is handled within handleGoAloneDecision
      const result = handleGoAloneDecision(currentGameState, playerRole, decision);

      if (result.success && result.updatedGameState) {
        await updateGame(gameId, result.updatedGameState);
        logger.info({ gameId, playerRole, decision, newPhase: result.updatedGameState.gamePhase },
                    `'Go alone' decision processed, state saved. Broadcasting updated state. Message: ${result.message}`);
        io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, result.updatedGameState); // Broadcast to game room
      } else {
        logger.warn({ socketId: socket.id, playerRole, gameId, reason: result.message },
                    `Processing ${eventName} failed for player ${playerRole}.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: result.message || `Could not process 'go alone' decision.`,
          event: eventName
        });
      }
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId, decision }, `Error processing ${eventName}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || `Error processing your 'go alone' decision.`, event: eventName });
    }
  });
}

// Conceptual notes for goAloneHandlers.js tests:
// describe('Go Alone Handlers', () => {
//   // ... (mock socket, io, getGame, updateGame, handleGoAloneDecision)
//   it('should process go_alone_decision, save state, and broadcast if successful', async () => {
//     // Setup: mock getGame, handleGoAloneDecision to return success=true & updatedGameState
//     // Action: Simulate ACTION_GO_ALONE_DECISION
//     // Assert: updateGame called, io.to(gameId).emit called.
//   });
//   it('should emit error to player if handleGoAloneDecision returns success=false', async () => {
//     // Setup: mock getGame, handleGoAloneDecision to return success=false
//     // Action: Simulate ACTION_GO_ALONE_DECISION
//     // Assert: socket.emit(ACTION_ERROR, ...) called.
//     // Assert: updateGame NOT called.
//   });
//   // ... tests for invalid data, game not found, player not in game, errors during phase logic.
// });
