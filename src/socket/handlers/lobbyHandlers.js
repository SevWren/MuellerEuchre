/**
 * Socket event handlers for the LOBBY game phase.
 * @module socket/handlers/lobbyHandlers
 */
import logger from '../../utils/logger.js';
import { attemptToStartGame } from '../../game/phases/lobbyPhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { gameRepository } from '../../db/gameRepository.js';
import { GAME_EVENTS, PLAYER_ROLES, GAME_PHASES, TEAMS as APP_TEAMS } from '../../config/constants.js';
import { createInitialGameState } from '../../game/state.js';
import { startNewHand } from '../../game/phases/startNewHandPhase.js'; // Now a pure function

// Temporary minimal utility functions
const TEAMS = APP_TEAMS;
function assignRoleToPlayer(gameState, role, userId, playerName, socketId) {
  const newGameState = JSON.parse(JSON.stringify(gameState));
  newGameState.players[role] = {
    ...(newGameState.players[role] || {}), id: userId, name: playerName,
    socketId: socketId, isConnected: true, role: role,
    teamId: (PLAYER_ROLES.indexOf(role) % 2 === 0) ? TEAMS.TEAM_NS : TEAMS.TEAM_EW,
  };
  if (newGameState.players[role].tricksWonThisHand === undefined) newGameState.players[role].tricksWonThisHand = 0;
  if (newGameState.players[role].score === undefined) newGameState.players[role].score = 0;
  newGameState.players[role].isActive = true;
  return newGameState;
}
function isLobbyFull(gameState) {
  if (!gameState || !gameState.players) return false;
  return PLAYER_ROLES.every(role =>
    gameState.players[role] &&
    gameState.players[role].isConnected &&
    gameState.players[role].isActive
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
    ack = typeof ack === 'function' ? ack : () => {};
    if (!data || !data.gameId) {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for request_start_game: gameId missing.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Invalid request: gameId is required.', event: 'request_start_game'});
      return ack({ status: 'error', message: 'Invalid request: gameId is required.'});
    }
    const { gameId } = data;
    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, 'request_start_game: Game not found.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found. Cannot start.', event: 'request_start_game' });
        return ack({ status: 'error', message: 'Game not found. Cannot start.'});
      }
      const requestingPlayerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!requestingPlayerRole) {
        logger.warn({ socketId: socket.id, gameId }, 'request_start_game: Requesting user not found in this game or has no role.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Cannot start game: Your player role is not recognized for this game. Please rejoin.', event: 'request_start_game'});
        return ack({ status: 'error', message: 'Cannot start game: Your player role is not recognized for this game. Please rejoin.'});
      }
      logger.info({ socketId: socket.id, role: requestingPlayerRole, gameId }, `Player ${requestingPlayerRole} is requesting to start game ${gameId}.`);

      // attemptToStartGame needs to be pure or use repository for state changes
      // For now, assuming it might be pure or its side-effects are intended for this handler path.
      // If attemptToStartGame also uses global state.js, it needs same refactor as startNewHand.
      // For this fix, we focus on startNewHand being pure.
      let resultGameState = attemptToStartGame(currentGameState, requestingPlayerRole);
      let resultMessage = "Attempted to start game."; // Default message

      // Assuming attemptToStartGame now returns the new state directly if successful,
      // or throws/returns an error indicator.
      // The original attemptToStartGame was not fully defined in provided context,
      // so this adapts to a common pattern.
      // attemptToStartGame from lobbyPhase.js transitions the state to GAME_PHASES.DEALING
      // but does not deal cards itself.
      let stateAfterAttemptStart = attemptToStartGame(currentGameState, requestingPlayerRole);

      if (stateAfterAttemptStart.success === false) { // attemptToStartGame signals failure
        logger.warn({ socketId: socket.id, role: requestingPlayerRole, gameId, reason: stateAfterAttemptStart.message }, 'Request to start game failed.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: stateAfterAttemptStart.message, event: 'request_start_game'});
        return ack({ status: 'error', message: stateAfterAttemptStart.message});
      }

      // If attemptToStartGame was successful, the phase should be DEALING (or similar, based on its internal logic)
      // For the fix, we specifically check if it's now DEALING phase, then proceed to deal.
      if (stateAfterAttemptStart.updatedGameState.gamePhase === GAME_PHASES.DEALING) {
        logger.info({ gameId, currentPhase: stateAfterAttemptStart.updatedGameState.gamePhase }, 'Game phase is DEALING, proceeding to deal hands.');
        try {
          const stateAfterDealing = startNewHand(stateAfterAttemptStart.updatedGameState); // startNewHand is pure
          await gameRepository.updateGame(gameId, stateAfterDealing);
          logger.info({ gameId, newPhase: stateAfterDealing.gamePhase }, `Game started and hands dealt. Broadcasting updated state.`);
          io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, stateAfterDealing); // Broadcast the state with hands
          return ack(null, { status: 'ok', message: 'Game started and hands dealt.', gameState: stateAfterDealing });
        } catch (snhError) {
          logger.error({ err: snhError, gameId }, `Error during startNewHand after request_start_game.`);
          // Revert to lobby or an error state? For now, emit error and don't change DB from DEALING phase.
          // The game state in DB is still at DEALING phase but without hands. This is not ideal.
          // A more robust solution might try to save a "broken" state or revert to LOBBY.
          // For this fix, we prioritize getting hands saved if startNewHand succeeds.
          // If startNewHand fails, the state in DB (DEALING phase) is problematic.
          // Let's ensure we save the pre-startNewHand state if startNewHand fails, to keep it in DEALING.
          await gameRepository.updateGame(gameId, stateAfterAttemptStart.updatedGameState); // Save the DEALING phase state
          socket.emit(GAME_EVENTS.ACTION_ERROR, { message: `Failed to deal cards: ${snhError.message}`, event: 'request_start_game'});
          io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, stateAfterAttemptStart.updatedGameState); // Inform others
          return ack({ status: 'error', message: `Failed to deal cards: ${snhError.message}`});
        }
      } else {
        // This case implies attemptToStartGame succeeded but didn't set phase to DEALING,
        // or its success/failure reporting changed. Based on current lobbyPhase.js, this path shouldn't be hit if successful.
        logger.warn({ socketId: socket.id, gameId, resultingPhase: stateAfterAttemptStart.updatedGameState.gamePhase }, 'Game start requested, but phase not set to DEALING. Conditions possibly not fully met or phase logic changed.');
        // We might still want to save and broadcast this state if it's a valid intermediate state.
        await gameRepository.updateGame(gameId, stateAfterAttemptStart.updatedGameState);
        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, stateAfterAttemptStart.updatedGameState);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: stateAfterAttemptStart.message || 'Could not start the game (conditions not met).', event: 'request_start_game'});
        return ack({ status: 'error', message: stateAfterAttemptStart.message || 'Could not start the game (conditions not met).'});
      }
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId }, `Error processing request_start_game for game ${gameId}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || 'An error occurred while trying to start the game.', event: 'request_start_game'});
      return ack({ status: 'error', message: error.message || 'An error occurred while trying to start the game.'});
    }
  });

  socket.on(GAME_EVENTS.JOIN_GAME, async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    if (!data || typeof data.playerName !== 'string') {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'JOIN_GAME: playerName string required.'); // Updated log message
      return ack({ status: 'error', message: 'Invalid request: playerName is required.' });
    }

    const { playerName } = data;
    let { gameIdToJoin } = data;
    const user = socket.request.user || { id: socket.id };

    try {
      let gameState;
      let assignedRole;
      let isNewGame = false;

      if (!gameIdToJoin) {
        isNewGame = true;
        gameIdToJoin = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        gameState = createInitialGameState(gameIdToJoin);
        gameState.hostId = user.id;
        assignedRole = PLAYER_ROLES[0];
        gameState = assignRoleToPlayer(gameState, assignedRole, user.id, playerName, socket.id);

        await gameRepository.createGame(gameIdToJoin, gameState);
        logger.info(`New game created by ${playerName} (${user.id}) with ID: ${gameIdToJoin}. Player assigned role ${assignedRole}.`);

        socket.join(gameIdToJoin);
        socket.gameId = gameIdToJoin;
        if(socket.request.user) socket.request.user.role = assignedRole; else socket.request.user = { role: assignedRole, id: user.id};

        socket.emit(GAME_EVENTS.ASSIGN_ROLE, {
            gameId: gameIdToJoin, role: assignedRole, players: gameState.players,
            isHost: true, playerId: user.id
        });

        await gameRepository.updateGame(gameIdToJoin, gameState);
        io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, gameState);
        logger.info(`Player ${playerName} (${user.id}) created game ${gameIdToJoin} as ${assignedRole}. State broadcasted.`);
        return ack(null, { status: 'ok', message: 'New game created and joined.', gameId: gameIdToJoin, role: assignedRole, players: gameState.players, gameState });

      } else {
        gameState = await gameRepository.getGame(gameIdToJoin);
        if (!gameState) {
          logger.warn(`Player ${playerName} (${user.id}) tried to join non-existent game: ${gameIdToJoin}`);
          return ack({ status: 'error', message: `Game ${gameIdToJoin} not found.` });
        }
        if (gameState.gamePhase !== GAME_PHASES.LOBBY) {
      logger.warn(`Player ${playerName} (${user.id}) tried to join active/ended game: ${gameIdToJoin}, Phase: ${gameState.gamePhase}`); // Corrected log context if needed
          return ack({ status: 'error', message: `Game ${gameIdToJoin} is not in lobby phase.` });
        }

        let existingPlayerRole = null;
        for(const role of PLAYER_ROLES){
            if(gameState.players[role] && gameState.players[role].id === user.id && !gameState.players[role].isConnected) {
                existingPlayerRole = role;
                break;
            }
             if(gameState.players[role] && gameState.players[role].id === user.id && gameState.players[role].isConnected) {
                logger.warn(`Player ${playerName} (${user.id}) attempted to join game ${gameIdToJoin} but is already connected as ${role}.`);
                return ack({ status: 'error', message: 'You are already in this game.' });
            }
        }

        if(existingPlayerRole) {
            assignedRole = existingPlayerRole;
            gameState.players[assignedRole].socketId = socket.id;
            gameState.players[assignedRole].isConnected = true;
            gameState.players[assignedRole].name = playerName;
            gameState.players[assignedRole].isActive = true;
        } else {
            if (isLobbyFull(gameState)) {
              logger.warn(`Player ${playerName} (${user.id}) tried to join full game (lobby full check): ${gameIdToJoin}`);
              return ack({ status: 'error', message: 'Game is full.' });
            }
            assignedRole = getNextAvailableRole(gameState);
            if (!assignedRole) {
                 logger.error(`Lobby join error: No role available in game ${gameIdToJoin} despite not being full.`);
                return ack({ status: 'error', message: 'Failed to assign role, lobby might be in an inconsistent state.' });
            }
            gameState = assignRoleToPlayer(gameState, assignedRole, user.id, playerName, socket.id);
        }

        socket.join(gameIdToJoin);
        socket.gameId = gameIdToJoin;
        if(socket.request.user) socket.request.user.role = assignedRole; else socket.request.user = { role: assignedRole, id: user.id};

        socket.emit(GAME_EVENTS.ASSIGN_ROLE, {
            gameId: gameIdToJoin, role: assignedRole, players: gameState.players,
            isHost: gameState.hostId === user.id, playerId: user.id
        });

        let finalAckMessage = 'Joined existing game.';
        let finalGameStateToSaveAndBroadcast = gameState;

        if (isLobbyFull(finalGameStateToSaveAndBroadcast) && finalGameStateToSaveAndBroadcast.gamePhase === GAME_PHASES.LOBBY) {
            logger.info(`Lobby for game ${gameIdToJoin} is now full. Starting game automatically.`);
            try {
                finalGameStateToSaveAndBroadcast = startNewHand(finalGameStateToSaveAndBroadcast); // Pure function returns new state
                logger.info(`Game ${gameIdToJoin} auto-started by lobby full. Phase: ${finalGameStateToSaveAndBroadcast.gamePhase}`);
                finalAckMessage = 'Joined game, and game is now starting.';
            } catch (snhError) {
                logger.error(`Failed to auto-start new hand for game ${gameIdToJoin} after lobby full: ${snhError.message}`, snhError);
                io.to(gameIdToJoin).emit(GAME_EVENTS.ACTION_ERROR, { message: `Failed to auto-start game: ${snhError.message}` });
                // Player still joined, but game didn't start. Save current lobby state.
                // gameState here is before startNewHand was called or failed.
                await gameRepository.updateGame(gameIdToJoin, gameState);
                io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, gameState);
                return ack(null, { status: 'ok', message: 'Joined lobby, but failed to auto-start game.', gameId: gameIdToJoin, role: assignedRole, players: gameState.players, gameState: gameState });
            }
        }

        await gameRepository.updateGame(gameIdToJoin, finalGameStateToSaveAndBroadcast);
        io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, finalGameStateToSaveAndBroadcast);
        logger.info(`Player ${playerName} (${user.id}) processed for game ${gameIdToJoin} as ${assignedRole}. State broadcasted with phase: ${finalGameStateToSaveAndBroadcast.gamePhase}`);
        return ack(null, { status: 'ok', message: finalAckMessage, gameId: gameIdToJoin, role: assignedRole, players: finalGameStateToSaveAndBroadcast.players, gameState: finalGameStateToSaveAndBroadcast });
      }
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameIdToJoin, playerName }, `Error processing JOIN_GAME catch block:`); // Updated log message
      return ack({ status: 'error', message: error.message || 'An error occurred while joining the lobby.' });
    }
  });
}
