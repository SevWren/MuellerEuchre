import { expect } from 'chai'; // Changed import style
import sinon from 'sinon';
import { registerGameOverHandlers } from '../../../src/socket/handlers/gameOverHandlers.js';
import * as gameRepository from '../../../src/db/gameRepository.js';
import * as scoringPhase from '../../../src/game/phases/scoringPhase.js'; // Contains handleNewGameRequest
import { GAME_EVENTS, GAME_PHASES, PLAYER_ROLES, TEAMS } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';
// resetFullGame is not directly used in this test file as handleNewGameRequest is stubbed,
// but keeping for context if mockLobbyState generation details were to be directly tested.
import { resetFullGame } from '../../../src/game/state.js';

describe('Game Over Socket Handlers', () => {
  let sandbox;
  let mockSocket;
  let mockIo;
  let mockGameOverState;
  let mockLobbyState;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'warn');
    sandbox.stub(logger, 'error');

    mockGameOverState = {
      gameId: 'testGameOver123',
      gamePhase: GAME_PHASES.GAME_OVER,
      winningTeam: TEAMS.TEAM_NS,
      players: { // Assuming players is an object keyed by role, as per initializePlayers
        [PLAYER_ROLES[0]]: { role: PLAYER_ROLES[0], id: 'p1', name: 'Player 1', isHost: true, socketId: 'socket1' },
        [PLAYER_ROLES[1]]: { role: PLAYER_ROLES[1], id: 'p2', name: 'Player 2', socketId: 'socket2' },
      }
    };

    mockLobbyState = {
        gameId: 'newGameAbc789',
        gamePhase: GAME_PHASES.LOBBY,
        players: {
            [PLAYER_ROLES[0]]: { role: PLAYER_ROLES[0], name: PLAYER_ROLES[0].charAt(0).toUpperCase() + PLAYER_ROLES[0].slice(1), socketId: null, hand: [], team: TEAMS.TEAM_NS, score:0, isConnected: false, tricksWonThisHand: 0 }
            // ... simplified, actual resetFullGame will create all 4 players
        },
        teamScores: {}, // resetFullGame initializes to {}
        dealer: PLAYER_ROLES[0], // default dealer
        // ... other properties of a fresh lobby state
    };

    sandbox.stub(gameRepository, 'getGame').resolves(mockGameOverState);
    sandbox.stub(gameRepository, 'updateGame').resolves();
    sandbox.stub(scoringPhase, 'handleNewGameRequest').returns(mockLobbyState);

    mockSocket = {
      id: 'socket1',
      emit: sandbox.spy(),
      join: sandbox.spy(),
      leave: sandbox.spy(),
      on: sandbox.spy(),
    };

    mockIo = {
      to: sandbox.stub().returns({ emit: sandbox.spy() }),
      emit: sandbox.spy(),
    };

    registerGameOverHandlers(mockSocket, mockIo);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe(`handle ${GAME_EVENTS.ACTION_REQUEST_NEW_GAME}`, () => {
    const eventPayload = {
      gameId: 'testGameOver123',
      playerRole: PLAYER_ROLES[0], // Assuming playerRole is sent by client
    };

    const getNewGameHandler = () => {
      const call = mockSocket.on.getCalls().find(c => c.args[0] === GAME_EVENTS.ACTION_REQUEST_NEW_GAME);
      if (!call) {
         if (mockSocket.on.calledOnce) return mockSocket.on.firstCall.args[1]; // Fallback
         throw new Error(`${GAME_EVENTS.ACTION_REQUEST_NEW_GAME} handler not registered or found`);
      }
      return call.args[1];
    };

    it('should call getGame with gameId', async () => {
      const handler = getNewGameHandler();
      await handler(eventPayload);
      expect(gameRepository.getGame.calledOnceWith(eventPayload.gameId)).to.be.true;
    });

    it('should emit ERROR to calling socket if game not found', async () => {
      gameRepository.getGame.resolves(null);
      const handler = getNewGameHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: 'Game not found.' })).to.be.true;
    });

    it('should emit ERROR to calling socket if game is not in GAME_OVER phase', async () => {
      // Override global stub for this test case
      gameRepository.getGame.resolves({ ...mockGameOverState, gamePhase: GAME_PHASES.PLAYING });
      const handler = getNewGameHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: 'Game is not over yet.' })).to.be.true;
    });

    it('should call handleNewGameRequest with the retrieved game state', async () => {
      const handler = getNewGameHandler();
      await handler(eventPayload);
      expect(scoringPhase.handleNewGameRequest.calledOnceWith(mockGameOverState)).to.be.true;
    });

    it('should call updateGame with original gameId and the new lobby state from handleNewGameRequest', async () => {
      const handler = getNewGameHandler();
      await handler(eventPayload);
      // This tests current SUT behavior: original gameId's record is updated with newLobbyState (which has a new internal gameId)
      expect(gameRepository.updateGame.calledOnceWith(eventPayload.gameId, mockLobbyState)).to.be.true;
    });

    it('should broadcast GAME_STATE_UPDATE to the original game room with new lobby state', async () => {
      const handler = getNewGameHandler();
      await handler(eventPayload);
      expect(mockIo.to.calledOnceWith(eventPayload.gameId)).to.be.true;
      expect(mockIo.to(eventPayload.gameId).emit.calledOnceWith(GAME_EVENTS.GAME_STATE_UPDATE, mockLobbyState)).to.be.true;
    });

    it('should log warning if new gameId differs from requested gameId', async () => {
        // mockLobbyState.gameId is 'newGameAbc789', eventPayload.gameId is 'testGameOver123'
        const handler = getNewGameHandler();
        await handler(eventPayload);
        expect(logger.warn.calledWith(sinon.match(/Game was reset, and a new gameId newGameAbc789 was generated/))).to.be.true;
    });


    it('should emit ERROR to calling socket if handleNewGameRequest throws an error', async () => {
      const errorMessage = 'Error resetting game';
      scoringPhase.handleNewGameRequest.throws(new Error(errorMessage)); // Override stub
      const handler = getNewGameHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: errorMessage })).to.be.true;
    });

    it('should emit ERROR to calling socket if getGame rejects', async () => {
      const errorMessage = 'DB error getting game for new game';
      gameRepository.getGame.rejects(new Error(errorMessage)); // Test promise rejection
      const handler = getNewGameHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: errorMessage })).to.be.true;
    });

    it('should emit ERROR to calling socket if updateGame rejects', async () => {
      const errorMessage = 'DB error updating to new game';
      gameRepository.updateGame.rejects(new Error(errorMessage)); // Test promise rejection
      const handler = getNewGameHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: errorMessage })).to.be.true;
    });
  });
});
