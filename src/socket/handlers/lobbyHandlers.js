/**
 * Socket event handlers for the LOBBY game phase.
 * @module socket/handlers/lobbyHandlers
 */
import logger from '../../utils/logger.js';
import { attemptToStartGame } from '../../game/phases/lobbyPhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { gameRepository } from '../../db/gameRepository.js';
import { GAME_EVENTS, PLAYER_ROLES, GAME_PHASES, TEAMS as APP_TEAMS } from '../../config/constants.js';
import { createInitialGameState, getGameState, updateGameState } from '../../game/state.js'; // Import state management functions
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
      // Get current game state from in-memory store (Layer 2)
      let currentGameState = getGameState();
      // If the in-memory state doesn't match the requested gameId, load it from persistence (Layer 5)
      if (!currentGameState || currentGameState.gameId !== gameId) {
        currentGameState = await gameRepository.getGame(gameId);
        if (currentGameState) {
          // If loaded from DB, update the in-memory state (Layer 2)
          updateGameState(() => currentGameState);
        } else {
          logger.warn({ socketId: socket.id, gameId }, 'request_start_game: Game not found in memory or DB.');
          socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found. Cannot start.', event: 'request_start_game' });
          return ack({ status: 'error', message: 'Game not found. Cannot start.'});
        }
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
      const attemptResult = attemptToStartGame(currentGameState, requestingPlayerRole);

      // Assuming attemptToStartGame now returns the new state directly if successful,
      // or throws/returns an error indicator.
      // The original attemptToStartGame was not fully defined in provided context,
      // so this adapts to a common pattern.
      // attemptToStartGame from lobbyPhase.js transitions the state to GAME_PHASES.DEALING
      // but does not deal cards itself.
      if (attemptResult.success === false) { // attemptToStartGame signals failure
        logger.warn({ socketId: socket.id, role: requestingPlayerRole, gameId, reason: attemptResult.message }, 'Request to start game failed.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: attemptResult.message, event: 'request_start_game'});
        return ack({ status: 'error', message: attemptResult.message});
      }

      // If attemptToStartGame was successful, the phase should be DEALING
      if (attemptResult.updatedGameState.gamePhase === GAME_PHASES.DEALING) {
        logger.info({ gameId, currentPhase: attemptResult.updatedGameState.gamePhase }, 'Game phase is DEALING, proceeding to deal hands.');
        try {
          const stateAfterDealing = startNewHand(attemptResult.updatedGameState); // startNewHand is pure
          updateGameState(() => stateAfterDealing); // Update in-memory state (Layer 2)
          await gameRepository.updateGame(gameId, stateAfterDealing); // Persist to DB (Layer 5)
          logger.info({ gameId, newPhase: stateAfterDealing.gamePhase }, `Game started and hands dealt. Broadcasting updated state.`);
          io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, stateAfterDealing); // Broadcast the state with hands
          return ack(null, { status: 'ok', message: 'Game started and hands dealt.', gameState: stateAfterDealing });
        } catch (snhError) {
          logger.error({ err: snhError, gameId }, `Error during startNewHand after request_start_game.`);
          // If startNewHand fails, save the state *before* dealing (which is DEALING phase)
          // The in-memory state is already at the pre-dealing state (attemptResult.updatedGameState)
          await gameRepository.updateGame(gameId, attemptResult.updatedGameState); // Persist to DB (Layer 5)
          socket.emit(GAME_EVENTS.ACTION_ERROR, { message: `Failed to deal cards: ${snhError.message}`, event: 'request_start_game'});
          io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, attemptResult.updatedGameState); // Inform others of the state before dealing
          return ack({ status: 'error', message: `Failed to deal cards: ${snhError.message}`});
        }
      } else {
        logger.warn({ socketId: socket.id, gameId, resultingPhase: attemptResult.updatedGameState.gamePhase }, 'Game start requested, but phase not set to DEALING. Conditions possibly not fully met or phase logic changed.');
        updateGameState(() => attemptResult.updatedGameState); // Update in-memory state (Layer 2)
        await gameRepository.updateGame(gameId, attemptResult.updatedGameState); // Persist to DB (Layer 5)
        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, attemptResult.updatedGameState);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: attemptResult.message || 'Could not start the game (conditions not met).', event: 'request_start_game'});
        return ack({ status: 'error', message: attemptResult.message || 'Could not start the game (conditions not met).'});
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
logger.debug({ socketId: socket.id, dataReceived: data }, 'JOIN_GAME: Invalid data - playerName string required.');
return ack({ status: 'error', message: 'Invalid request: playerName is required.' });
}

    const { playerName } = data;
    let { gameIdToJoin } = data;
    const user = socket.request.user || { id: socket.id };
    logger.debug({ socketId: socket.id, dataReceived: data, userId: user.id }, 'JOIN_GAME event received.');

    try {
      let gameState;
      let assignedRole;
      let isNewGame = false;

      logger.debug({ gameIdToJoin, isNewGame }, 'Determining game join path.');
      if (!gameIdToJoin) {
        isNewGame = true;
        gameIdToJoin = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        gameState = createInitialGameState(gameIdToJoin);
        gameState.hostId = user.id;
        assignedRole = PLAYER_ROLES[0];
        gameState = assignRoleToPlayer(gameState, assignedRole, user.id, playerName, socket.id);

        updateGameState(() => gameState); // Set the initial game state in memory (Layer 2)
        await gameRepository.createGame(gameIdToJoin, gameState); // Persist to DB (Layer 5)
        logger.info(`New game created by ${playerName} (${user.id}) with ID: ${gameIdToJoin}. Player assigned role ${assignedRole}.`);

        socket.join(gameIdToJoin);
        socket.gameId = gameIdToJoin;
        if(socket.request.user) socket.request.user.role = assignedRole; else socket.request.user = { role: assignedRole, id: user.id};

        socket.emit(GAME_EVENTS.ASSIGN_ROLE, {
            gameId: gameIdToJoin, role: assignedRole, players: gameState.players,
            isHost: true, playerId: user.id
        });

        await gameRepository.updateGame(gameIdToJoin, gameState); // Persist to DB (Layer 5)
        io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, gameState);
        logger.info(`Player ${playerName} (${user.id}) created game ${gameIdToJoin} as ${assignedRole}. State broadcasted.`);
        return ack(null, { status: 'ok', message: 'New game created and joined.', gameId: gameIdToJoin, role: assignedRole, players: gameState.players, gameState: getGameState() });

      } else {
        logger.debug({ gameIdToJoin }, 'Attempting to join existing game.');
        let currentGameStateFromRepo = await gameRepository.getGame(gameIdToJoin);
        if (!currentGameStateFromRepo) {
          logger.warn({ gameIdToJoin }, 'JOIN_GAME: Game not found in repository for joining.');
          logger.debug({ gameIdToJoin }, 'JOIN_GAME: Sending ack with error - Game not found.');
          return ack({ status: 'error', message: 'Game not found.' });
        }
        gameState = currentGameStateFromRepo; // Assign to gameState

        if (gameState.gamePhase !== GAME_PHASES.LOBBY) {
          logger.warn(`Player ${playerName} (${user.id}) tried to join active/ended game: ${gameIdToJoin}, Phase: ${gameState.gamePhase}`);
          logger.debug({ gameIdToJoin, gamePhase: gameState.gamePhase }, 'JOIN_GAME: Sending ack with error - Game not in lobby phase.');
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
                logger.debug({ gameIdToJoin, userId: user.id, role }, 'JOIN_GAME: Sending ack with error - Already in game.');
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
              logger.debug({ gameIdToJoin, userId: user.id }, 'JOIN_GAME: Sending ack with error - Game is full.');
              return ack({ status: 'error', message: 'Game is full.' });
            }
            assignedRole = getNextAvailableRole(gameState);
            if (!assignedRole) {
                 logger.error(`Lobby join error: No role available in game ${gameIdToJoin} despite not being full.`);
                 logger.debug({ gameIdToJoin, userId: user.id }, 'JOIN_GAME: Sending ack with error - No role available.');
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
        let finalGameStateToSaveAndBroadcast = getGameState(); // Get the latest in-memory state

        if (isLobbyFull(finalGameStateToSaveAndBroadcast) && finalGameStateToSaveAndBroadcast.gamePhase === GAME_PHASES.LOBBY) {
            logger.info(`Lobby for game ${gameIdToJoin} is now full. Starting game automatically.`);
            try {
                const stateAfterAutoStart = startNewHand(finalGameStateToSaveAndBroadcast); // Pure function returns new state
                updateGameState(() => stateAfterAutoStart); // Update in-memory state (Layer 2)
                finalGameStateToSaveAndBroadcast = getGameState(); // Get the updated in-memory state
                logger.info(`Game ${gameIdToJoin} auto-started by lobby full. Phase: ${finalGameStateToSaveAndBroadcast.gamePhase}`);
                finalAckMessage = 'Joined game, and game is now starting.';
            } catch (snhError) {
                logger.error({ err: snhError, gameId: gameIdToJoin }, `Failed to auto-start new hand for game ${gameIdToJoin} after lobby full.`);
                io.to(gameIdToJoin).emit(GAME_EVENTS.ACTION_ERROR, { message: `Failed to auto-start game: ${snhError.message}` });
                // Player still joined, but game didn't start. The in-memory state is still the lobby state.
                await gameRepository.updateGame(gameIdToJoin, getGameState()); // Save current lobby state to DB
                io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, getGameState());
                return ack(null, { status: 'ok', message: 'Joined lobby, but failed to auto-start game.', gameId: gameIdToJoin, role: assignedRole, players: getGameState().players, gameState: getGameState() });
            }
        }

        await gameRepository.updateGame(gameIdToJoin, finalGameStateToSaveAndBroadcast); // Persist to DB (Layer 5)
        io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, finalGameStateToSaveAndBroadcast);
        logger.info(`Player ${playerName} (${user.id}) processed for game ${gameIdToJoin} as ${assignedRole}. State broadcasted with phase: ${finalGameStateToSaveAndBroadcast.gamePhase}`);
        return ack(null, { status: 'ok', message: finalAckMessage, gameId: gameIdToJoin, role: assignedRole, players: finalGameStateToSaveAndBroadcast.players, gameState: finalGameStateToSaveAndBroadcast });
      }
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameIdToJoin, playerName }, `Error processing JOIN_GAME catch block:`);
      logger.debug({ err: error, socketId: socket.id, gameIdToJoin, playerName }, 'JOIN_GAME: Sending ack with error from catch block.');
      return ack({ status: 'error', message: error.message || 'An error occurred while joining the lobby.' });
    }
  });
}
