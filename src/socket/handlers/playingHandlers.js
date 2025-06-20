import { getGame, updateGame } from '../../db/gameRepository.js';
import { handlePlayCard } from '../../game/phases/playingPhase.js';
/**
 * Socket event handlers for the main card playing phase of the game.
 * @module socket/handlers/playingHandlers
 */
import { getGame, updateGame } from '../../db/gameRepository.js';
import { handlePlayCard } from '../../game/phases/playingPhase.js';
import { GAME_EVENTS, GAME_PHASES } from '../../config/constants.js'; // Added GAME_PHASES
import logger from '../../utils/logger.js';

/**
 * Registers event handlers related to the card playing phase of the game.
 * Specifically, it listens for a player's action to play a card.
 *
 * @param {import('socket.io').Socket} socket - The socket instance for the connected client.
 * @param {import('socket.io').Server} io - The Socket.IO server instance, used for broadcasting.
 */
export function registerPlayingHandlers(socket, io) {
  /**
   * Handles the 'ACTION_PLAY_CARD' event emitted by a client.
   * This event signifies a player's attempt to play a card during their turn.
   *
   * The handler performs the following steps:
   * 1. Retrieves the current game state using `gameId`.
   * 2. Validates the basic structure of the `card` object.
   * 3. Calls `handlePlayCard` from `playingPhase.js` to process the card play. This function
   *    internally validates the play (turn, phase, card validity, rules like following suit)
   *    and returns the new game state.
   * 4. If the play is successful, the updated game state is saved to the database.
   * 5. The new game state is broadcast to all clients in the game room via `GAME_EVENTS.GAME_STATE_UPDATE`.
   * 6. If the game phase transitions to `SCORING` as a result of the play (i.e., hand is over),
   *    this is logged.
   *
   * Errors during this process (e.g., game not found, invalid card data, errors from `handlePlayCard`
   * such as `NotPlayersTurnError`, `InvalidPhaseError`, `CardNotInHandError`, `MustFollowSuitError`)
   * are caught, logged, and a generic `GAME_EVENTS.ERROR` is emitted back to the originating client.
   *
   * Note: This handler does not use an explicit `ack` callback.
   *
   * @param {object} payload - The data received from the client.
   * @param {string} payload.gameId - The ID of the game.
   * @param {string} payload.playerRole - The role of the player playing the card.
   * @param {object} payload.card - The card object being played.
   * @param {string} payload.card.suit - The suit of the card.
   * @param {string} payload.card.rank - The rank of the card.
   * @param {string} payload.card.id - The unique ID of the card.
   */
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
