/**
 * Socket event handlers for the LOBBY game phase.
 * @module socket/handlers/lobbyHandlers
 */
import logger from '../../utils/logger.js';
import { attemptToStartGame } from '../../game/phases/lobbyPhase.js';
// NOTE: GAME_EVENTS.ACTION_ERROR is used for generic errors in some places,
// ensure the new error objects are compatible or update event names if needed.
import { getRoleBySocketId } from '../../utils/players.js';
import { gameRepository } from '../../db/gameRepository.js';
import { GAME_EVENTS, PLAYER_ROLES, GAME_PHASES, TEAMS as APP_TEAMS } from '../../config/constants.js';
import { createInitialGameState } from '../../game/state.js';
import { startNewHand } from '../../game/phases/startNewHandPhase.js';

// Standardized error object creation helper
const createErrorObject = (action, errorType, message, details) => ({
  action,
  errorType,
  message,
  details,
});

// Temporary minimal utility functions (scope indicates these are to be left as is)
const TEAMS = APP_TEAMS; // Assuming APP_TEAMS is correctly imported and used
function assignRoleToPlayer(gameState, role, userId, playerName, socketId) {
  const newGameState = JSON.parse(JSON.stringify(gameState)); // Consider a deep clone utility for robustness
  newGameState.players[role] = {
    ...(newGameState.players[role] || {}), id: userId, name: playerName,
    socketId: socketId, isConnected: true, role: role,
    teamId: (PLAYER_ROLES.indexOf(role) % 2 === 0) ? TEAMS.TEAM_NS : TEAMS.TEAM_EW,
  };
  if (newGameState.players[role].tricksWonThisHand === undefined) newGameState.players[role].tricksWonThisHand = 0;
  if (newGameState.players[role].score === undefined) newGameState.players[role].score = 0;
  newGameState.players[role].isActive = true; // Ensure player is marked active
  return newGameState;
}

function isLobbyFull(gameState) {
  if (!gameState || !gameState.players) return false;
  return PLAYER_ROLES.every(role =>
    gameState.players[role] &&
    gameState.players[role].isConnected &&
    gameState.players[role].isActive // Added isActive check for consistency
  );
}

function getNextAvailableRole(gameState) {
  if (!gameState || !gameState.players) return null;
  for (const role of PLAYER_ROLES) {
    if (!gameState.players[role] || !gameState.players[role].isConnected || !gameState.players[role].isActive) {
      return role;
    }
  }
  return null;
}
// End temporary utils

export function registerLobbyHandlers(socket, io) {
  socket.on('request_start_game', async (data, ack) => {
    const action = 'request_start_game';
    ack = typeof ack === 'function' ? ack : () => {};

    if (!data || typeof data.gameId !== 'string' || !data.gameId.trim()) {
      const error = createErrorObject(action, 'VALIDATION_ERROR', 'Invalid request: gameId (non-empty string) is required.', { receivedData: data });
      logger.warn({ socketId: socket.id, error, gameId: data?.gameId }, `Validation error for ${action}`);
      // Avoid redundant socket.emit if ack is used for request-specific errors
      return ack({ status: 'error', error });
    }
    const { gameId } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        const error = createErrorObject(action, 'NOT_FOUND_ERROR', 'Game not found. Cannot start.', { gameId });
        logger.warn({ socketId: socket.id, error, gameId }, `${action}: Game not found.`);
        return ack({ status: 'error', error });
      }

      const requestingPlayerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!requestingPlayerRole) {
        const error = createErrorObject(action, 'AUTHORIZATION_ERROR', 'Cannot start game: Your player role is not recognized for this game. Please rejoin.', { gameId, socketId: socket.id });
        logger.warn({ socketId: socket.id, error, gameId }, `${action}: Requesting user not found or has no role.`);
        return ack({ status: 'error', error });
      }

      logger.info({ socketId: socket.id, role: requestingPlayerRole, gameId, action }, `Player ${requestingPlayerRole} is requesting to start game ${gameId}.`);

      const stateAfterAttemptStart = attemptToStartGame(currentGameState, requestingPlayerRole);

      if (stateAfterAttemptStart.success === false) {
        const error = createErrorObject(action, 'GAME_LOGIC_ERROR', stateAfterAttemptStart.message || 'Failed to start game due to game logic.', { gameId, requestingPlayerRole, details: stateAfterAttemptStart.details });
        logger.warn({ socketId: socket.id, error, gameId, role: requestingPlayerRole, reason: stateAfterAttemptStart.message }, `Request to start game failed: ${stateAfterAttemptStart.message}`);
        return ack({ status: 'error', error });
      }

      if (stateAfterAttemptStart.updatedGameState.gamePhase === GAME_PHASES.DEALING) {
        logger.info({ gameId, currentPhase: stateAfterAttemptStart.updatedGameState.gamePhase, action }, 'Game phase is DEALING, proceeding to deal hands.');
        try {
          const stateAfterDealing = startNewHand(stateAfterAttemptStart.updatedGameState);
          await gameRepository.updateGame(gameId, stateAfterDealing);
          logger.info({ gameId, newPhase: stateAfterDealing.gamePhase, action }, `Game started and hands dealt. Broadcasting updated state.`);
          io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, stateAfterDealing);
          return ack(null, { status: 'ok', message: 'Game started and hands dealt.', gameState: stateAfterDealing });
        } catch (snhError) {
          const error = createErrorObject(action, 'SERVER_ERROR', `Failed to deal cards: ${snhError.message}`, { gameId, stack: snhError.stack });
          logger.error({ err: snhError, socketId: socket.id, error, gameId }, `Error during startNewHand after ${action}.`);
          await gameRepository.updateGame(gameId, stateAfterAttemptStart.updatedGameState); // Save DEALING phase state
          io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, stateAfterAttemptStart.updatedGameState);
          // Emitting general error to room as it affects all players if cards aren't dealt.
          io.to(gameId).emit(GAME_EVENTS.ACTION_ERROR, createErrorObject(action, 'SERVER_ERROR', `A server error occurred while dealing cards. The game is in DEALING phase but cards might be missing.`, { gameId }));
          return ack({ status: 'error', error }); // Also ack back to requester
        }
      } else {
        // This path implies attemptToStartGame succeeded but didn't set phase to DEALING.
        // Or, stateAfterAttemptStart.success was true but updatedGameState was not as expected.
        const error = createErrorObject(action, 'GAME_LOGIC_ERROR', stateAfterAttemptStart.message || 'Could not start the game (conditions not met or unexpected phase).', { gameId, resultingPhase: stateAfterAttemptStart.updatedGameState?.gamePhase });
        logger.warn({ socketId: socket.id, error, gameId, resultingPhase: stateAfterAttemptStart.updatedGameState?.gamePhase }, `${action}: Game start conditions not fully met or phase logic changed.`);
        await gameRepository.updateGame(gameId, stateAfterAttemptStart.updatedGameState); // Save this state
        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, stateAfterAttemptStart.updatedGameState);
        return ack({ status: 'error', error });
      }
    } catch (e) {
      const error = createErrorObject(action, 'SERVER_ERROR', e.message || 'An error occurred while trying to start the game.', { gameId, stack: e.stack });
      logger.error({ err: e, socketId: socket.id, error, gameId }, `Error processing ${action} for game ${gameId}.`);
      return ack({ status: 'error', error });
    }
  });

  socket.on(GAME_EVENTS.JOIN_GAME, async (data, ack) => {
    const action = GAME_EVENTS.JOIN_GAME;
    ack = typeof ack === 'function' ? ack : () => {};

    if (!data || typeof data.playerName !== 'string' || !data.playerName.trim() || (data.gameIdToJoin && (typeof data.gameIdToJoin !== 'string' || !data.gameIdToJoin.trim()))) {
      const error = createErrorObject(action, 'VALIDATION_ERROR', 'Invalid request: playerName (non-empty string) is required. If gameIdToJoin is provided, it must also be a non-empty string.', { receivedData: data });
      logger.warn({ socketId: socket.id, error, dataReceived: data }, `Validation error for ${action}`);
      return ack({ status: 'error', error });
    }

    const { playerName } = data;
    let { gameIdToJoin } = data;
    const user = socket.request.user || { id: socket.id }; // Basic user identification

    try {
      let gameState;
      let assignedRole;

      if (!gameIdToJoin) { // Create new game
        gameIdToJoin = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        gameState = createInitialGameState(gameIdToJoin);
        gameState.hostId = user.id;
        assignedRole = PLAYER_ROLES[0]; // First player is host and gets first role
        gameState = assignRoleToPlayer(gameState, assignedRole, user.id, playerName, socket.id);

        await gameRepository.createGame(gameIdToJoin, gameState);
        logger.info({ socketId: socket.id, userId: user.id, playerName, gameId: gameIdToJoin, role: assignedRole, action }, `New game created.`);

        socket.join(gameIdToJoin);
        socket.gameId = gameIdToJoin;
        if(socket.request.user) socket.request.user.role = assignedRole; else socket.request.user = { role: assignedRole, id: user.id};


        socket.emit(GAME_EVENTS.ASSIGN_ROLE, { gameId: gameIdToJoin, role: assignedRole, players: gameState.players, isHost: true, playerId: user.id });
        // No need to updateGame and emit STATE_UPDATE here, as it's a new game, client gets role.
        // The next STATE_UPDATE will happen when another player joins or game starts.
        // However, for consistency and to ensure host has full state, emitting an initial state:
        io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, gameState);
        logger.info({ socketId: socket.id, gameId: gameIdToJoin, action }, `Initial state broadcasted for new game.`);
        return ack(null, { status: 'ok', message: 'New game created and joined.', gameId: gameIdToJoin, role: assignedRole, players: gameState.players, gameState });

      } else { // Join existing game
        gameState = await gameRepository.getGame(gameIdToJoin);
        if (!gameState) {
          const error = createErrorObject(action, 'NOT_FOUND_ERROR', `Game ${gameIdToJoin} not found.`, { gameIdToJoin });
          logger.warn({ socketId: socket.id, error, gameIdToJoin, playerName }, `Player tried to join non-existent game.`);
          return ack({ status: 'error', error });
        }

        if (gameState.gamePhase !== GAME_PHASES.LOBBY) {
          const error = createErrorObject(action, 'GAME_LOGIC_ERROR', `Game ${gameIdToJoin} is not in lobby phase. Current phase: ${gameState.gamePhase}.`, { gameIdToJoin, currentPhase: gameState.gamePhase });
          logger.warn({ socketId: socket.id, error, gameIdToJoin, playerName }, `Player tried to join active/ended game.`);
          return ack({ status: 'error', error });
        }

        // Check if player is rejoining or already connected
        let existingPlayerRole = null;
        for (const role of PLAYER_ROLES) {
          if (gameState.players[role]?.id === user.id) {
            if (!gameState.players[role].isConnected) {
              existingPlayerRole = role; // Player is rejoining
              break;
            } else { // Player is already connected
              const error = createErrorObject(action, 'GAME_LOGIC_ERROR', 'You are already in this game and connected.', { gameIdToJoin, playerRole: role });
              logger.warn({ socketId: socket.id, error, gameIdToJoin, playerName, userId: user.id }, `Player attempted to join game but is already connected as ${role}.`);
              return ack({ status: 'error', error });
            }
          }
        }

        if (existingPlayerRole) {
          assignedRole = existingPlayerRole;
          gameState.players[assignedRole].socketId = socket.id;
          gameState.players[assignedRole].isConnected = true;
          gameState.players[assignedRole].name = playerName; // Update name on rejoin
          gameState.players[assignedRole].isActive = true;
          logger.info({ socketId: socket.id, userId: user.id, playerName, gameId: gameIdToJoin, role: assignedRole, action }, `Player rejoining game.`);
        } else { // New player joining
          if (isLobbyFull(gameState)) {
            const error = createErrorObject(action, 'GAME_LOGIC_ERROR', 'Game is full.', { gameIdToJoin });
            logger.warn({ socketId: socket.id, error, gameIdToJoin, playerName }, `Player tried to join full game.`);
            return ack({ status: 'error', error });
          }
          assignedRole = getNextAvailableRole(gameState);
          if (!assignedRole) {
            const error = createErrorObject(action, 'SERVER_ERROR', 'Failed to assign role, lobby might be in an inconsistent state or no roles available.', { gameIdToJoin });
            logger.error({ socketId: socket.id, error, gameIdToJoin }, `Lobby join error: No role available despite not being full.`);
            return ack({ status: 'error', error });
          }
          gameState = assignRoleToPlayer(gameState, assignedRole, user.id, playerName, socket.id);
          logger.info({ socketId: socket.id, userId: user.id, playerName, gameId: gameIdToJoin, role: assignedRole, action }, `New player joining game.`);
        }

        socket.join(gameIdToJoin);
        socket.gameId = gameIdToJoin;
        if(socket.request.user) socket.request.user.role = assignedRole; else socket.request.user = { role: assignedRole, id: user.id};

        socket.emit(GAME_EVENTS.ASSIGN_ROLE, { gameId: gameIdToJoin, role: assignedRole, players: gameState.players, isHost: gameState.hostId === user.id, playerId: user.id });

        let finalAckMessage = 'Joined existing game.';
        let finalGameStateToSaveAndBroadcast = gameState;

        if (isLobbyFull(finalGameStateToSaveAndBroadcast) && finalGameStateToSaveAndBroadcast.gamePhase === GAME_PHASES.LOBBY) {
          logger.info({ gameId: gameIdToJoin, action }, `Lobby for game is now full. Attempting to auto-start game.`);
          try {
            finalGameStateToSaveAndBroadcast = startNewHand(finalGameStateToSaveAndBroadcast);
            logger.info({ gameId: gameIdToJoin, action, newPhase: finalGameStateToSaveAndBroadcast.gamePhase }, `Game auto-started by lobby full.`);
            finalAckMessage = 'Joined game, and game is now starting.';
          } catch (snhError) {
            const errorForBroadcast = createErrorObject(action, 'SERVER_ERROR', `Failed to auto-start game: ${snhError.message}. Game remains in lobby.`, { gameIdToJoin, stack: snhError.stack });
            logger.error({ err: snhError, socketId: socket.id, error: errorForBroadcast, gameIdToJoin, playerName }, `Failed to auto-start new hand for game after lobby full.`);
            io.to(gameIdToJoin).emit(GAME_EVENTS.ACTION_ERROR, errorForBroadcast); // Inform all players in the room
            // Player still joined, but game didn't start. Save current lobby state (pre-startNewHand attempt).
            await gameRepository.updateGame(gameIdToJoin, gameState); // gameState is pre-snhError
            io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, gameState);
            // Ack success for joining, but failure for auto-start
            const ackError = createErrorObject(action, 'GAME_AUTOSTART_FAILED', 'Joined lobby successfully, but the game failed to auto-start.', { detail: snhError.message });
            return ack(null, { status: 'ok_with_issues', message: ackError.message, error: ackError, gameId: gameIdToJoin, role: assignedRole, players: gameState.players, gameState });
          }
        }

        await gameRepository.updateGame(gameIdToJoin, finalGameStateToSaveAndBroadcast);
        io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, finalGameStateToSaveAndBroadcast);
        logger.info({ socketId: socket.id, userId: user.id, playerName, gameId: gameIdToJoin, role: assignedRole, action, newPhase: finalGameStateToSaveAndBroadcast.gamePhase }, `Player processed for game. State broadcasted.`);
        return ack(null, { status: 'ok', message: finalAckMessage, gameId: gameIdToJoin, role: assignedRole, players: finalGameStateToSaveAndBroadcast.players, gameState: finalGameStateToSaveAndBroadcast });
      }
    } catch (e) {
      const error = createErrorObject(action, 'SERVER_ERROR', e.message || 'An error occurred while joining the lobby.', { gameIdToJoin, playerName, stack: e.stack });
      logger.error({ err: e, socketId: socket.id, error, gameIdToJoin, playerName }, `Error processing ${action} catch block.`);
      return ack({ status: 'error', error });
    }
  });
}
