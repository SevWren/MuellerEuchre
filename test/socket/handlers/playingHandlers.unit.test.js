import { expect } from 'chai'; // Changed import style
import sinon from 'sinon';
import { registerPlayingHandlers } from '../../../src/socket/handlers/playingHandlers.js';
import * as gameRepository from '../../../src/db/gameRepository.js';
import * as playingPhase from '../../../src/game/phases/playingPhase.js';
import { GAME_EVENTS, GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS } from '../../../src/config/constants.js'; // Added TEAMS
import logger from '../../../src/utils/logger.js';

describe('Playing Phase Socket Handlers', () => {
  let sandbox;
  let mockSocket;
  let mockIo;
  let mockGameState;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'warn');
    sandbox.stub(logger, 'error');

    mockGameState = {
      gameId: 'testGame123',
      gamePhase: GAME_PHASES.PLAYING,
      currentPlayer: PLAYER_ROLES[0],
      players: { [PLAYER_ROLES[0]]: { role: PLAYER_ROLES[0], id: 'socket1', socketId: 'socket1', teamId: TEAMS.TEAM_NS } }, // Ensure player has socketId and teamId
      // ... other necessary game state properties like trumpSuit, currentTrick etc.
      trumpSuit: SUITS.SPADES,
      currentTrick: [],
      teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, // Use TEAMS constants
      tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, // Use TEAMS constants
    };

    // Stub repository and phase logic
    sandbox.stub(gameRepository, 'getGame').resolves(mockGameState);
    sandbox.stub(gameRepository, 'updateGame').resolves();
    // Default stub for handlePlayCard, can be overridden in specific tests
    sandbox.stub(playingPhase, 'handlePlayCard').returns({ ...mockGameState, currentPlayer: PLAYER_ROLES[1] });

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

    registerPlayingHandlers(mockSocket, mockIo);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe(`handle ${GAME_EVENTS.ACTION_PLAY_CARD}`, () => {
    const eventPayload = {
      gameId: 'testGame123',
      playerRole: PLAYER_ROLES[0],
      card: { suit: SUITS.SPADES, rank: 'A', id: 'AS' }, // Added id to card
    };

    const getPlayCardHandler = () => {
      const call = mockSocket.on.getCalls().find(c => c.args[0] === GAME_EVENTS.ACTION_PLAY_CARD);
      if (!call) {
        // Fallback for cases where `on` might be called differently or wrapped
        // This assumes the first registered handler is the one if only one `on` call was made.
        if (mockSocket.on.calledOnce) return mockSocket.on.firstCall.args[1];
        throw new Error('ACTION_PLAY_CARD handler not registered or found');
      }
      return call.args[1];
    };

    it('should call getGame with gameId', async () => {
      const handler = getPlayCardHandler();
      await handler(eventPayload);
      expect(gameRepository.getGame.calledOnceWith(eventPayload.gameId)).to.be.true;
    });

    it('should emit ERROR if game not found', async () => {
      gameRepository.getGame.resolves(null);
      const handler = getPlayCardHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: 'Game not found.' })).to.be.true;
    });

    it('should emit ERROR if card data is invalid (null card)', async () => {
      const handler = getPlayCardHandler();
      await handler({ ...eventPayload, card: null });
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: 'Invalid card data.' })).to.be.true;
    });

    it('should emit ERROR if card data is invalid (missing suit)', async () => {
      const handler = getPlayCardHandler();
      await handler({ ...eventPayload, card: { rank: 'A' } });
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: 'Invalid card data.' })).to.be.true;
    });

    it('should emit ERROR if card data is invalid (missing rank)', async () => {
      const handler = getPlayCardHandler();
      await handler({ ...eventPayload, card: { suit: SUITS.SPADES } });
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: 'Invalid card data.' })).to.be.true;
    });


    it('should call handlePlayCard with gameState, playerRole, and card', async () => {
      const handler = getPlayCardHandler();
      await handler(eventPayload);
      expect(playingPhase.handlePlayCard.calledOnceWith(mockGameState, eventPayload.playerRole, eventPayload.card)).to.be.true;
    });

    it('should call updateGame with gameId and new game state from handlePlayCard', async () => {
      const newMockState = { ...mockGameState, _turn: 2 }; // Use a distinct property for new state
      playingPhase.handlePlayCard.returns(newMockState);
      const handler = getPlayCardHandler();
      await handler(eventPayload);
      expect(gameRepository.updateGame.calledOnceWith(eventPayload.gameId, newMockState)).to.be.true;
    });

    it('should broadcast GAME_STATE_UPDATE to the game room', async () => {
      const newMockState = { ...mockGameState, _turn: 3 };
      playingPhase.handlePlayCard.returns(newMockState);
      const handler = getPlayCardHandler();
      await handler(eventPayload);
      expect(mockIo.to.calledOnceWith(eventPayload.gameId)).to.be.true;
      // Ensure the emit spy on the object returned by to() is checked
      expect(mockIo.to(eventPayload.gameId).emit.calledOnceWith(GAME_EVENTS.GAME_STATE_UPDATE, newMockState)).to.be.true;
    });

    it('should log info when hand transitions to SCORING', async () => {
        const scoringState = { ...mockGameState, gamePhase: GAME_PHASES.SCORING };
        playingPhase.handlePlayCard.returns(scoringState); // Override default stub for this test
        const handler = getPlayCardHandler();
        await handler(eventPayload);
        expect(logger.info.calledWith(sinon.match.string, sinon.match(`[Game ID: ${eventPayload.gameId}] Hand complete. Game phase changed to SCORING`))).to.be.true;
    });

    it('should emit ERROR to calling socket if handlePlayCard throws an error', async () => {
      const errorMessage = 'Invalid play by test';
      playingPhase.handlePlayCard.throws(new Error(errorMessage)); // Override default stub
      const handler = getPlayCardHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: errorMessage })).to.be.true;
    });

    it('should emit ERROR to calling socket if getGame throws an error', async () => {
      const errorMessage = 'DB error getting game';
      gameRepository.getGame.rejects(new Error(errorMessage));
      const handler = getPlayCardHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: errorMessage })).to.be.true;
    });

    it('should emit ERROR to calling socket if updateGame throws an error', async () => {
      const errorMessage = 'DB error updating game';
      gameRepository.updateGame.rejects(new Error(errorMessage));
      const handler = getPlayCardHandler();
      await handler(eventPayload);
      expect(mockSocket.emit.calledOnceWith(GAME_EVENTS.ERROR, { message: errorMessage })).to.be.true;
    });
  });
});
