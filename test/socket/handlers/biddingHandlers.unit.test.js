import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import esmock from 'esmock';
import { GAME_EVENTS, PLAYER_ROLES, SUITS, GAME_PHASES } from '../../../src/config/constants.js';

chai.use(sinonChai);
const expect = chai.expect;

const biddingHandlersModulePath = new URL('../../../src/socket/handlers/biddingHandlers.js', import.meta.url).pathname;
const loggerModulePath = new URL('../../../src/utils/logger.js', import.meta.url).pathname;
const gameRepositoryModulePath = new URL('../../../src/db/gameRepository.js', import.meta.url).pathname;
const biddingPhaseModulePath = new URL('../../../src/game/phases/biddingPhase.js', import.meta.url).pathname;
const validationModulePath = new URL('../../../src/game/logic/validation.js', import.meta.url).pathname;
const playersModulePath = new URL('../../../src/utils/players.js', import.meta.url).pathname;

describe('Bidding Socket Handlers', () => {
  let mockIo;
  let mockSocket;
  let mockGameRepository;
  let stubbedLogger;

  let handleOrderUpDecisionStub;
  let handleDealerDiscardStub;
  let handleCallTrumpDecisionStub;
  let isValidBidStub;
  let getRoleBySocketIdStub;

  const gameId = 'testGame123';
  const playerSocketId = 'playerSocketId1';
  const playerRole = PLAYER_ROLES[0]; // South

  async function getHandlerForEventTesting(eventName) {
    const { registerBiddingHandlers: rbh } = await esmock(
      biddingHandlersModulePath,
      {},
      {
        [loggerModulePath]: { default: stubbedLogger },
        [gameRepositoryModulePath]: { gameRepository: mockGameRepository },
        [biddingPhaseModulePath]: {
          handleOrderUpDecision: handleOrderUpDecisionStub,
          handleDealerDiscard: handleDealerDiscardStub,
          handleCallTrumpDecision: handleCallTrumpDecisionStub,
        },
        [validationModulePath]: {
            isValidBid: isValidBidStub,
            isValidDealerDiscard: sinon.stub().returns({isValid: true})
        },
        [playersModulePath]: {
            getRoleBySocketId: getRoleBySocketIdStub,
        }
      }
    );
    mockSocket.on.resetHistory();
    rbh(mockSocket, mockIo);
    const call = mockSocket.on.getCalls().find(c => c.args[0] === eventName);
    if (!call || typeof call.args[1] !== 'function') {
        throw new Error(`Handler for ${eventName} not registered. Calls on mockSocket.on: ${mockSocket.on.getCalls().map(c => c.args[0]).join(', ')}`);
    }
    return call.args[1];
  }

  beforeEach(() => {
    mockIo = {
      to: sinon.stub().returnsThis(),
      emit: sinon.spy(),
    };
    mockIo.to.returns({ emit: mockIo.emit });

    mockSocket = {
      join: sinon.spy(),
      leave: sinon.spy(),
      emit: sinon.spy(),
      on: sinon.spy(),
      id: playerSocketId,
      gameId: gameId,
      request: { user: { id: 'user123', role: playerRole } }
    };

    mockGameRepository = {
      getGame: sinon.stub(),
      updateGame: sinon.stub().resolves(),
    };

    stubbedLogger = {
        info: sinon.stub(), warn: sinon.stub(), error: sinon.stub(),
        debug: sinon.stub(), fatal: sinon.stub(), child: sinon.stub().returnsThis(),
    };

    handleOrderUpDecisionStub = sinon.stub();
    handleDealerDiscardStub = sinon.stub();
    handleCallTrumpDecisionStub = sinon.stub();
    isValidBidStub = sinon.stub().returns({ isValid: true });
    getRoleBySocketIdStub = sinon.stub().returns(playerRole);
  });

  afterEach(() => {
    sinon.restore();
    esmock.purge(biddingHandlersModulePath);
    esmock.purge(loggerModulePath);
    esmock.purge(gameRepositoryModulePath);
    esmock.purge(biddingPhaseModulePath);
    esmock.purge(validationModulePath);
    esmock.purge(playersModulePath);
  });

  describe('registerBiddingHandlers', () => {
    it('should register handlers for bidding related GAME_EVENTS', async () => {
      const { registerBiddingHandlers } = await esmock(biddingHandlersModulePath, {
         [loggerModulePath]: { default: stubbedLogger },
         [gameRepositoryModulePath]: { gameRepository: mockGameRepository },
         [biddingPhaseModulePath]: {
          handleOrderUpDecision: handleOrderUpDecisionStub,
          handleDealerDiscard: handleDealerDiscardStub,
          handleCallTrumpDecision: handleCallTrumpDecisionStub,
        },
        [validationModulePath]: { isValidBid: isValidBidStub, isValidDealerDiscard: sinon.stub().returns({isValid: true})},
        [playersModulePath]: { getRoleBySocketId: getRoleBySocketIdStub }
      });
      registerBiddingHandlers(mockSocket, mockIo);

      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.ACTION_ORDER_UP_DECISION, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.ACTION_DEALER_DISCARD, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION, sinon.match.func);
    });
  });

  describe('Socket Handler for ACTION_ORDER_UP_DECISION', () => {
    let handler;
    let mockInitialGameState;

    beforeEach(async () => {
        mockInitialGameState = {
            gameId,
            players: {
                [playerRole]: { name: 'South Player', teamId: 'NS', socketId: playerSocketId, id: 'user123' }
            },
            currentPlayer: playerRole,
            gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
            roundNumber: 1,
            turnCard: { suit: 'HEARTS', value: 'A', id: 'AH', name: 'Ace of Hearts'}
        };
        handler = await getHandlerForEventTesting(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
    });

    it('should successfully process valid order up decision (ordering up)', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState);
      const mockNextGameState = { ...mockInitialGameState, trumpSuit: SUITS.HEARTS, makerTeam: 'NS', gamePhase: GAME_PHASES.DEALER_DISCARD };
      handleOrderUpDecisionStub.returns(mockNextGameState);
      const ackSpy = sinon.spy();
      const data = { gameId: gameId, decision: 'orderUp' };

      await handler(data, ackSpy);

      expect(mockGameRepository.getGame).to.have.been.calledOnce;
      expect(mockGameRepository.getGame.getCall(0).args[0]).to.equal(gameId);

      expect(handleOrderUpDecisionStub).to.have.been.calledOnce;
      const phaseArgs = handleOrderUpDecisionStub.getCall(0).args;
      expect(phaseArgs[0].gameId).to.equal(mockInitialGameState.gameId);
      expect(phaseArgs[1]).to.equal(playerRole);
      expect(phaseArgs[2]).to.equal(true);

      expect(mockGameRepository.updateGame).to.have.been.calledOnce;
      const updateArgs = mockGameRepository.updateGame.getCall(0).args;
      expect(updateArgs[0]).to.equal(gameId);
      expect(updateArgs[1].gameId).to.equal(mockNextGameState.gameId);
      expect(updateArgs[1].trumpSuit).to.equal(mockNextGameState.trumpSuit);

      expect(mockIo.to).to.have.been.calledOnceWith(gameId);
      expect(mockIo.emit).to.have.been.calledOnce;
      const emitArgs = mockIo.emit.getCall(0).args;
      expect(emitArgs[0]).to.equal(GAME_EVENTS.STATE_UPDATE);
      expect(emitArgs[1].gameId).to.equal(mockNextGameState.gameId);
      expect(emitArgs[1].trumpSuit).to.equal(mockNextGameState.trumpSuit);

      expect(ackSpy).to.have.been.calledOnce;
      const ackFirstArg = ackSpy.getCall(0).args[0];
      const ackSecondArg = ackSpy.getCall(0).args[1];
      expect(ackFirstArg).to.be.null;
      expect(ackSecondArg).to.deep.include({ status: 'ok', message: 'Order up decision processed.' });
      expect(stubbedLogger.error).to.not.have.been.called;
    });

    it('should successfully process valid order up decision (passing)', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState);
      const passNextState = {...mockInitialGameState, currentPlayer: PLAYER_ROLES[1] };
      handleOrderUpDecisionStub.returns(passNextState);
      const ackSpy = sinon.spy();
      const data = { gameId: gameId, decision: 'pass' };

      await handler(data, ackSpy);
      expect(handleOrderUpDecisionStub).to.have.been.calledOnce;
      expect(handleOrderUpDecisionStub.getCall(0).args[2]).to.equal(false);

      expect(ackSpy).to.have.been.calledOnce;
      expect(ackSpy.getCall(0).args[0]).to.be.null;
      expect(ackSpy.getCall(0).args[1]).to.deep.include({ status: 'ok', message: 'Order up decision processed.'});
    });

    it('should handle game not found', async () => {
      mockGameRepository.getGame.resolves(null);
      const ackSpy = sinon.spy();
      await handler({ gameId: gameId, decision: 'pass' }, ackSpy);

      expect(ackSpy).to.have.been.calledOnce;
      expect(ackSpy.getCall(0).args[0]).to.deep.include({ status: 'error', message: 'Game not found.' });
      expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle error from biddingPhase.handleOrderUpDecision', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState);
      const phaseError = new Error('Phase logic error');
      handleOrderUpDecisionStub.throws(phaseError);
      const ackSpy = sinon.spy();
      await handler({ gameId: gameId, decision: 'pass' }, ackSpy);

      expect(handleOrderUpDecisionStub).to.have.been.calledOnce;
      expect(handleOrderUpDecisionStub.getCall(0).args[2]).to.equal(false);

      expect(ackSpy).to.have.been.calledOnce;
      expect(ackSpy.getCall(0).args[0]).to.deep.include({ status: 'error', message: phaseError.message });
    });

    it('should handle error if playerRole is not the current player in gameState (via isValidBid mock)', async () => {
        isValidBidStub.returns({ isValid: false, message: 'Not your turn.' });
        mockGameRepository.getGame.resolves(mockInitialGameState);
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, decision: 'pass' }, ackSpy);

        expect(ackSpy).to.have.been.calledOnce;
        expect(ackSpy.getCall(0).args[0]).to.deep.include({ status: 'error', message: 'Not your turn.' });
        expect(handleOrderUpDecisionStub).to.not.have.been.called;
    });

    it('should handle invalid data payload (missing decision)', async () => {
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId }, ackSpy);
        expect(ackSpy).to.have.been.calledOnce;
        expect(ackSpy.getCall(0).args[0]).to.deep.include({ status: 'error', message: 'Invalid decision data: gameId and decision string required.' });
    });
  });

  describe('Socket Handler for ACTION_DEALER_DISCARD', () => {
    let handler;
    let mockInitialGameState_DealerDiscard;

    beforeEach(async () => {
        mockInitialGameState_DealerDiscard = {
            gameId,
            dealer: playerRole,
            players: {
                [playerRole]: { name: 'South Player', teamId: 'NS', socketId: playerSocketId, id: 'user123', hand: [{id: 'AH', value:'A'}, {id: 'KH', value:'K'}] }
            },
            gamePhase: GAME_PHASES.DEALER_DISCARD,
            currentPlayer: playerRole,
            turnCard: { suit: 'SPADES', value: 'J', id: 'JS', name: 'Jack of Spades'},
            playerWhoOrderedUp: PLAYER_ROLES[1]
        };
        handler = await getHandlerForEventTesting(GAME_EVENTS.ACTION_DEALER_DISCARD);
    });

    it('should successfully process valid dealer discard', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState_DealerDiscard);
      const mockNextGameState_Discard = { ...mockInitialGameState_DealerDiscard, turnCard: null, players: { [playerRole]: { ...mockInitialGameState_DealerDiscard.players[playerRole], hand: [{id: 'JS', value:'J'}]} } };
      handleDealerDiscardStub.returns(mockNextGameState_Discard);
      const ackSpy = sinon.spy();
      const data = { gameId: gameId, cardId: 'AH' };

      await handler(data, ackSpy);

      expect(mockGameRepository.getGame).to.have.been.calledOnce;
      expect(handleDealerDiscardStub).to.have.been.calledOnce;
      const phaseArgs = handleDealerDiscardStub.getCall(0).args;
      expect(phaseArgs[0].gameId).to.equal(gameId);
      expect(phaseArgs[1]).to.equal(playerRole);
      expect(phaseArgs[2]).to.equal(data.cardId);

      expect(mockGameRepository.updateGame).to.have.been.calledOnce;
      expect(mockGameRepository.updateGame.getCall(0).args[1].turnCard).to.be.null;

      expect(mockIo.to).to.have.been.calledOnceWith(gameId);
      expect(mockIo.emit).to.have.been.calledOnce;
      expect(mockIo.emit.getCall(0).args[1].turnCard).to.be.null;

      expect(ackSpy).to.have.been.calledOnce;
      expect(ackSpy.getCall(0).args[0]).to.be.null;
      expect(ackSpy.getCall(0).args[1]).to.deep.include({ status: 'ok', message: 'Dealer discard processed.' });
    });

    it('should handle error if player is not the dealer', async () => {
        mockGameRepository.getGame.resolves({...mockInitialGameState_DealerDiscard, dealer: PLAYER_ROLES[1]});
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, cardId: 'AH' }, ackSpy);

        expect(ackSpy).to.have.been.calledOnce;
        expect(ackSpy.getCall(0).args[0]).to.deep.include({ status: 'error', message: 'Only the dealer can discard.' });
        expect(handleDealerDiscardStub).to.not.have.been.called;
    });
  });

  describe('Socket Handler for ACTION_CALL_TRUMP_DECISION', () => {
    let handler;
    let mockInitialGameState_CallTrump;

    beforeEach(async () => {
        mockInitialGameState_CallTrump = {
            gameId,
            players: { [playerRole]: { name: 'South Player', teamId: 'NS', socketId: playerSocketId, id: 'user123' } },
            currentPlayer: playerRole,
            gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
            roundNumber: 2,
            turnCard: { suit: 'DIAMONDS', value: 'Q', id: 'QD', name: 'Queen of Diamonds'}
        };
        handler = await getHandlerForEventTesting(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION);
    });


    it('should successfully process valid call trump decision', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
      const mockNextGameState_Call = { ...mockInitialGameState_CallTrump, trumpSuit: SUITS.HEARTS, makerTeam: 'NS', gamePhase: GAME_PHASES.GOING_ALONE_DECISION };
      handleCallTrumpDecisionStub.returns(mockNextGameState_Call);
      const ackSpy = sinon.spy();
      const data = { gameId: gameId, decision: 'callTrump', suit: SUITS.HEARTS };

      await handler(data, ackSpy);

      expect(mockGameRepository.getGame).to.have.been.calledOnce;
      expect(handleCallTrumpDecisionStub).to.have.been.calledOnce;
      const phaseArgs = handleCallTrumpDecisionStub.getCall(0).args;
      expect(phaseArgs[0].gameId).to.equal(gameId);
      expect(phaseArgs[1]).to.equal(playerRole);
      expect(phaseArgs[2]).to.equal(true);
      expect(phaseArgs[3]).to.equal(data.suit);

      expect(mockGameRepository.updateGame).to.have.been.calledOnce;
      expect(mockGameRepository.updateGame.getCall(0).args[1].trumpSuit).to.equal(SUITS.HEARTS);

      expect(mockIo.to).to.have.been.calledOnceWith(gameId);
      expect(mockIo.emit).to.have.been.calledOnce;
      expect(mockIo.emit.getCall(0).args[1].trumpSuit).to.equal(SUITS.HEARTS);

      expect(ackSpy).to.have.been.calledOnce;
      expect(ackSpy.getCall(0).args[0]).to.be.null;
      expect(ackSpy.getCall(0).args[1]).to.deep.include({ status: 'ok', message: 'Call trump decision processed.' });
    });

    it('should successfully process a pass decision for call trump', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
      const passNextState_Call = {...mockInitialGameState_CallTrump, currentPlayer: PLAYER_ROLES[1]};
      handleCallTrumpDecisionStub.returns(passNextState_Call);
      const ackSpy = sinon.spy();
      const data = { gameId: gameId, decision: 'pass' };

      await handler(data, ackSpy);
      expect(handleCallTrumpDecisionStub).to.have.been.calledOnce;
      expect(handleCallTrumpDecisionStub.getCall(0).args[2]).to.equal(false);
      expect(handleCallTrumpDecisionStub.getCall(0).args[3]).to.be.undefined;

      expect(ackSpy).to.have.been.calledOnce;
      expect(ackSpy.getCall(0).args[0]).to.be.null;
      expect(ackSpy.getCall(0).args[1]).to.deep.include({ status: 'ok', message: 'Call trump decision processed.' });
    });

    it('should handle invalid data payload (missing suit when calling trump)', async () => {
        mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump); // Ensure game state is available for validation
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, decision: 'callTrump' }, ackSpy);
        expect(ackSpy).to.have.been.calledOnce;
        expect(ackSpy.getCall(0).args[0]).to.deep.include({ status: 'error', message: 'Invalid call trump decision data.' });
    });
  });
});
