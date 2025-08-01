/**
 * Socket event handlers for bidding-related game actions in the Euchre game.
 * Handles player decisions during the bidding phase including ordering up, passing,
 * and dealer discarding.
 *
 * @module socket/handlers/biddingHandlers
 * @see {@link module:game/phases/biddingPhase} For core bidding phase logic
 * @see {@link module:game/logic/validation-core} For validation of bids and discards
 * @see {@link module:db/gameRepository} For game state persistence
 * @see {@link module:config/constants} For game events and phases constants
 * @see {@link module:utils/players} For player role and partner utilities
 * @see {@link module:utils/logger} For application logging
 */

import { GAME_EVENTS, GAME_PHASES } from '../../config/constants.js';
import { gameRepository } from '../../db/gameRepository.js';
import {
  isValidBid,
  isValidDealerDiscard,
} from '../../game/logic/validation-core.js';
import {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision,
} from '../../game/phases/biddingPhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
import logger from '../../utils/logger.js';

export function registerBiddingHandlers(socket, io) {
  socket.on(GAME_EVENTS.ACTION_ORDER_UP_DECISION, async (data, ack) => {
    ack = typeof ack === "function" ? ack : () => {};
    if (!data || !data.gameId || typeof data.decision !== "string") {
      logger.warn(
        { socketId: socket.id, dataReceived: data },
        "Invalid data for order_up_decision: gameId and decision string required.",
      );
      socket.emit(GAME_EVENTS.ACTION_ERROR, {
        message: "Invalid decision data: gameId and decision string required.",
        event: GAME_EVENTS.ACTION_ORDER_UP_DECISION,
      });
      return ack({
        status: "error",
        message: "Invalid decision data: gameId and decision string required.",
      });
    }
    const { gameId, decision } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        logger.warn(
          { socketId: socket.id, gameId },
          `${GAME_EVENTS.ACTION_ORDER_UP_DECISION}: Game not found.`,
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Game not found.",
          event: GAME_EVENTS.ACTION_ORDER_UP_DECISION,
        });
        return ack({ status: "error", message: "Game not found." });
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn(
          {
            socketId: socket.id,
            gameId,
            event: GAME_EVENTS.ACTION_ORDER_UP_DECISION,
          },
          "Received event from unassigned socket or player not in game.",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Player role not recognized for this game.",
          event: GAME_EVENTS.ACTION_ORDER_UP_DECISION,
        });
        return ack({
          status: "error",
          message: "Player role not recognized for this game.",
        });
      }

      // Moved current player check after playerRole is confirmed valid for this game state
      if (currentGameState.currentPlayer !== playerRole) {
        logger.warn(
          {
            gameId,
            playerRole,
            expectedPlayer: currentGameState.currentPlayer,
          },
          "Attempted bid by non-current player",
        );
        return ack({
          status: "error",
          message: "Not your turn to make a bidding decision.",
        });
      }

      logger.info(
        { socketId: socket.id, playerRole, decision, gameId },
        `Received ${GAME_EVENTS.ACTION_ORDER_UP_DECISION}: ${decision}`,
      );

      // isValidBid might be better placed after basic checks in a real scenario
      const validationResult = isValidBid(
        currentGameState,
        playerRole,
        decision,
      );
      if (!validationResult.isValid) {
        logger.warn(
          {
            socketId: socket.id,
            playerRole,
            gameId,
            decision,
            reason: validationResult.message,
          },
          "Invalid order_up_decision.",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: validationResult.message,
          event: GAME_EVENTS.ACTION_ORDER_UP_DECISION,
        });
        return ack({ status: "error", message: validationResult.message });
      }

      const wantsToOrderUp = decision === "orderUp";
      const updatedGameState = handleOrderUpDecision(
        currentGameState,
        playerRole,
        wantsToOrderUp,
      );

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, updatedGameState);
      logger.info(
        { gameId, playerRole, decision },
        "Order up decision processed, state saved and broadcasted.",
      );
      return ack(null, {
        status: "ok",
        message: "Order up decision processed.",
      });
    } catch (error) {
      logger.error(
        { err: error, socketId: socket.id, gameId, decision },
        `Error processing ${GAME_EVENTS.ACTION_ORDER_UP_DECISION}.`,
      );
      socket.emit(GAME_EVENTS.ACTION_ERROR, {
        message: error.message || "Error processing your decision.",
        event: GAME_EVENTS.ACTION_ORDER_UP_DECISION,
      });
      return ack({
        status: "error",
        message: error.message || "Error processing your decision.",
      });
    }
  });

  socket.on(GAME_EVENTS.ACTION_DEALER_DISCARD, async (data, ack) => {
    ack = typeof ack === "function" ? ack : () => {};
    if (!data || !data.gameId || typeof data.cardId !== "string") {
      logger.warn(
        { socketId: socket.id, dataReceived: data },
        "Invalid data for dealer_discard: gameId and cardId string required.",
      );
      socket.emit(GAME_EVENTS.ACTION_ERROR, {
        message:
          "Invalid discard data: cardId must be a string and gameId provided.",
        event: GAME_EVENTS.ACTION_DEALER_DISCARD,
      });
      return ack({
        status: "error",
        message:
          "Invalid discard data: cardId must be a string and gameId provided.",
      });
    }
    const { gameId, cardId } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        logger.warn(
          { socketId: socket.id, gameId },
          `${GAME_EVENTS.ACTION_DEALER_DISCARD}: Game not found.`,
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Game not found.",
          event: GAME_EVENTS.ACTION_DEALER_DISCARD,
        });
        return ack({ status: "error", message: "Game not found." });
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn(
          {
            socketId: socket.id,
            gameId,
            event: GAME_EVENTS.ACTION_DEALER_DISCARD,
          },
          "Received event from unassigned socket.",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Player role not recognized for this game.",
          event: GAME_EVENTS.ACTION_DEALER_DISCARD,
        });
        return ack({
          status: "error",
          message: "Player role not recognized for this game.",
        });
      }

      if (playerRole !== currentGameState.dealer) {
        logger.warn(
          {
            socketId: socket.id,
            playerRole,
            gameId,
            dealer: currentGameState.dealer,
          },
          "Non-dealer attempted to discard.",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Only the dealer can discard.",
          event: GAME_EVENTS.ACTION_DEALER_DISCARD,
        });
        return ack({
          status: "error",
          message: "Only the dealer can discard.",
        });
      }

      if (currentGameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
        logger.warn(
          {
            socketId: socket.id,
            playerRole,
            gameId,
            currentPhase: currentGameState.gamePhase,
          },
          "Attempted discard outside of DEALER_DISCARD phase.",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Not the correct game phase for dealer to discard.",
          event: GAME_EVENTS.ACTION_DEALER_DISCARD,
        });
        return ack({
          status: "error",
          message: "Not the correct game phase for dealer to discard.",
        });
      }

      const playerHand = currentGameState.players[playerRole]?.hand;
      const cardToDiscard = playerHand?.find((c) => c.id === cardId);

      logger.info(
        { socketId: socket.id, playerRole, cardId, gameId },
        `Received ${GAME_EVENTS.ACTION_DEALER_DISCARD}: ${cardId}`,
      );

      // isValidDealerDiscard might be better placed after basic checks
      const validationResult = isValidDealerDiscard(
        currentGameState,
        playerRole,
        cardToDiscard,
        playerHand,
      );
      if (!validationResult.isValid) {
        logger.warn(
          {
            socketId: socket.id,
            playerRole,
            gameId,
            cardId,
            reason: validationResult.message,
          },
          "Invalid dealer_discard.",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: validationResult.message,
          event: GAME_EVENTS.ACTION_DEALER_DISCARD,
        });
        return ack({ status: "error", message: validationResult.message });
      }

      const updatedGameState = handleDealerDiscard(
        currentGameState,
        playerRole,
        cardId,
      );

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, updatedGameState);
      logger.info(
        { gameId, playerRole, cardId },
        "Dealer discard processed, state saved and broadcasted.",
      );
      return ack(null, { status: "ok", message: "Dealer discard processed." });
    } catch (error) {
      logger.error(
        { err: error, socketId: socket.id, gameId, cardId },
        `Error processing ${GAME_EVENTS.ACTION_DEALER_DISCARD}.`,
      );
      socket.emit(GAME_EVENTS.ACTION_ERROR, {
        message: error.message || "Error processing your discard.",
        event: GAME_EVENTS.ACTION_DEALER_DISCARD,
      });
      return ack({
        status: "error",
        message: error.message || "Error processing your discard.",
      });
    }
  });

  socket.on(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION, async (data, ack) => {
    ack = typeof ack === "function" ? ack : () => {};
    if (
      !data ||
      !data.gameId ||
      typeof data.decision !== "string" ||
      (data.decision === "callTrump" && typeof data.suit !== "string")
    ) {
      logger.warn(
        { socketId: socket.id, dataReceived: data },
        "Invalid data for call_trump_decision.",
      );
      socket.emit(GAME_EVENTS.ACTION_ERROR, {
        message: "Invalid call trump decision data.",
        event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
      });
      return ack({
        status: "error",
        message: "Invalid call trump decision data.",
      });
    }
    const { gameId, decision, suit } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        logger.warn(
          { socketId: socket.id, gameId },
          `${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}: Game not found.`,
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Game not found.",
          event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
        });
        return ack({ status: "error", message: "Game not found." });
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn(
          {
            socketId: socket.id,
            gameId,
            event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
          },
          "Received event from unassigned socket.",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Player role not recognized for this game.",
          event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
        });
        return ack({
          status: "error",
          message: "Player role not recognized for this game.",
        });
      }

      if (currentGameState.currentPlayer !== playerRole) {
        logger.warn(
          {
            gameId,
            playerRole,
            expectedPlayer: currentGameState.currentPlayer,
          },
          "Attempted call trump by non-current player",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Not your turn to call trump.",
          event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
        });
        return ack({
          status: "error",
          message: "Not your turn to call trump.",
        });
      }

      if (currentGameState.gamePhase !== GAME_PHASES.ORDER_UP_ROUND2) {
        logger.warn(
          `Attempt to call trump outside of ORDER_UP_ROUND2 phase. Game: ${gameId}, Phase: ${currentGameState.gamePhase}`,
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: "Not the correct phase to call trump.",
          event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
        });
        return ack({
          status: "error",
          message: "Not the correct phase to call trump.",
        });
      }

      logger.info(
        { socketId: socket.id, playerRole, decision, suit, gameId },
        `Received ${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}: ${decision} ${suit || ""}`,
      );

      const validationResult = isValidBid(
        currentGameState,
        playerRole,
        decision,
        suit,
      );
      if (!validationResult.isValid) {
        logger.warn(
          {
            socketId: socket.id,
            playerRole,
            gameId,
            decision,
            suit,
            reason: validationResult.message,
          },
          "Invalid call_trump_decision.",
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, {
          message: validationResult.message,
          event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
        });
        return ack({ status: "error", message: validationResult.message });
      }

      const wantsToCall = decision === "callTrump";
      const updatedGameState = handleCallTrumpDecision(
        currentGameState,
        playerRole,
        wantsToCall,
        suit,
      );

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, updatedGameState);
      logger.info(
        { gameId, playerRole, decision, suit },
        "Call trump decision processed, state saved and broadcasted.",
      );
      return ack(null, {
        status: "ok",
        message: "Call trump decision processed.",
      });
    } catch (error) {
      logger.error(
        { err: error, socketId: socket.id, gameId, decision, suit },
        `Error processing ${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}.`,
      );
      socket.emit(GAME_EVENTS.ACTION_ERROR, {
        message: error.message || "Error processing your decision.",
        event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
      });
      return ack({
        status: "error",
        message: error.message || "Error processing your decision.",
      });
    }
  });
}
