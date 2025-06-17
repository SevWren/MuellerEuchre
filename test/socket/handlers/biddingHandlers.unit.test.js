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
      const ackArg = ackSpy.getCall(0).args[0];
      expect(ackArg.status).to.equal('error');
      expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
      expect(ackArg.error.errorType).to.equal('GAME_NOT_FOUND');
      expect(ackArg.error.message).to.equal('Game not found.');
      expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle error from biddingPhase.handleOrderUpDecision (throws structured error)', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState);
      const phaseError = { message: 'Phase logic error', errorType: 'GAME_LOGIC_ERROR' };
      handleOrderUpDecisionStub.throws(phaseError); // Game phase logic itself throws a structured error
      const ackSpy = sinon.spy();
      await handler({ gameId: gameId, decision: 'pass' }, ackSpy);

      expect(ackSpy).to.have.been.calledOnce;
      const ackArg = ackSpy.getCall(0).args[0];
      expect(ackArg.status).to.equal('error');
      expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
      // If the phase logic itself throws a structured error, it might be wrapped or passed through.
      // Based on biddingHandlers.js, the catch block will create a new error object.
      expect(ackArg.error.errorType).to.equal('INTERNAL_SERVER_ERROR'); // As it's caught by the generic catch
      expect(ackArg.error.message).to.equal(phaseError.message);
      expect(stubbedLogger.error).to.have.been.called;
    });

    it('should handle error if isValidBid returns false (e.g. not current player)', async () => {
        isValidBidStub.returns({ isValid: false, message: 'Not your turn.' });
        mockGameRepository.getGame.resolves(mockInitialGameState);
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, decision: 'pass' }, ackSpy);

        expect(ackSpy).to.have.been.calledOnce;
        const ackArg = ackSpy.getCall(0).args[0];
        expect(ackArg.status).to.equal('error');
        expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
        expect(ackArg.error.errorType).to.equal('INVALID_BID');
        expect(ackArg.error.message).to.equal('Not your turn.');
        expect(handleOrderUpDecisionStub).to.not.have.been.called;
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle invalid data payload (missing gameId)', async () => {
        const ackSpy = sinon.spy();
        await handler({ decision: 'orderUp' }, ackSpy); // gameId is missing
        expect(ackSpy).to.have.been.calledOnce;
        const ackArg = ackSpy.getCall(0).args[0];
        expect(ackArg.status).to.equal('error');
        expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
        expect(ackArg.error.errorType).to.equal('INVALID_INPUT');
        expect(ackArg.error.message).to.equal('Invalid decision data: gameId and decision string required.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle invalid data payload (gameId is not a string)', async () => {
        const ackSpy = sinon.spy();
        await handler({ gameId: 123, decision: 'orderUp' }, ackSpy); // gameId is not a string
        expect(ackSpy).to.have.been.calledOnce;
        const ackArg = ackSpy.getCall(0).args[0];
        expect(ackArg.status).to.equal('error');
        expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
        expect(ackArg.error.errorType).to.equal('INVALID_INPUT');
        expect(ackArg.error.message).to.equal('Invalid decision data: gameId and decision string required.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle invalid data payload (missing decision)', async () => {
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId }, ackSpy); // decision is missing
        expect(ackSpy).to.have.been.calledOnce;
        const ackArg = ackSpy.getCall(0).args[0];
        expect(ackArg.status).to.equal('error');
        expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
        expect(ackArg.error.errorType).to.equal('INVALID_INPUT');
        expect(ackArg.error.message).to.equal('Invalid decision data: gameId and decision string required.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle invalid data payload (decision is not "orderUp" or "pass")', async () => {
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, decision: 'invalidDecision' }, ackSpy);
        expect(ackSpy).to.have.been.calledOnce;
        const ackArg = ackSpy.getCall(0).args[0];
        expect(ackArg.status).to.equal('error');
        expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
        expect(ackArg.error.errorType).to.equal('INVALID_DECISION'); // This is the new specific errorType
        expect(ackArg.error.message).to.equal("Decision must be 'orderUp' or 'pass'.");
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle error if getRoleBySocketId returns null (player not in game)', async () => {
        getRoleBySocketIdStub.returns(null);
        mockGameRepository.getGame.resolves(mockInitialGameState);
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, decision: 'orderUp' }, ackSpy);

        expect(ackSpy).to.have.been.calledOnce;
        const ackArg = ackSpy.getCall(0).args[0];
        expect(ackArg.status).to.equal('error');
        expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_ORDER_UP_DECISION);
        expect(ackArg.error.errorType).to.equal('PLAYER_NOT_IN_GAME'); // Updated errorType
        expect(ackArg.error.message).to.equal('Player role not recognized for this game.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

  });

  describe('Socket Handler for ACTION_DEALER_DISCARD', () => {
    let handler;
    let mockInitialGameState_DealerDiscard;
    let isValidDealerDiscardStub_local; // Local stub for this describe block

    beforeEach(async () => {
        // Re-stub isValidDealerDiscard for this block to control its behavior specifically
        isValidDealerDiscardStub_local = sinon.stub().returns({ isValid: true });
        const { registerBiddingHandlers: rbh } = await esmock(
          biddingHandlersModulePath, {}, {
            [loggerModulePath]: { default: stubbedLogger },
            [gameRepositoryModulePath]: { gameRepository: mockGameRepository },
            [biddingPhaseModulePath]: { handleOrderUpDecision: sinon.stub(), handleDealerDiscard: handleDealerDiscardStub, handleCallTrumpDecision: sinon.stub() },
            [validationModulePath]: { isValidBid: sinon.stub(), isValidDealerDiscard: isValidDealerDiscardStub_local }, // Use local stub
            [playersModulePath]: { getRoleBySocketId: getRoleBySocketIdStub }
          }
        );
        mockSocket.on.resetHistory();
        rbh(mockSocket, mockIo);
        const call = mockSocket.on.getCalls().find(c => c.args[0] === GAME_EVENTS.ACTION_DEALER_DISCARD);
        if (!call || typeof call.args[1] !== 'function') throw new Error(`Handler for ${GAME_EVENTS.ACTION_DEALER_DISCARD} not registered.`);
        handler = call.args[1];


        mockInitialGameState_DealerDiscard = {
            gameId,
            dealer: playerRole, // Current player is the dealer
            players: {
                [playerRole]: { name: 'South Player', teamId: 'NS', socketId: playerSocketId, id: 'user123', hand: [{id: 'AH', suit: 'HEARTS', rank:'A'}, {id: 'KH', suit: 'HEARTS', rank:'K'}] }
            },
            gamePhase: GAME_PHASES.DEALER_DISCARD,
            currentPlayer: playerRole, // Dealer's turn
            turnCard: { suit: 'SPADES', rank: 'J', id: 'JS', name: 'Jack of Spades'}, // Card to pick up
            playerWhoOrderedUp: PLAYER_ROLES[1] // Example: West ordered up
        };
    });

    it('should successfully process valid dealer discard', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState_DealerDiscard);
      const discardedCard = mockInitialGameState_DealerDiscard.players[playerRole].hand[0]; // AH
      const pickedUpCard = mockInitialGameState_DealerDiscard.turnCard; // JS
      const mockNextGameState_Discard = {
        ...mockInitialGameState_DealerDiscard,
        turnCard: null, // Turn card is picked up
        players: {
            [playerRole]: {
                ...mockInitialGameState_DealerDiscard.players[playerRole],
                hand: [mockInitialGameState_DealerDiscard.players[playerRole].hand[1], pickedUpCard] // KH, JS
            }
        },
        gamePhase: GAME_PHASES.GOING_ALONE_DECISION, // Next phase
        currentPlayer: mockInitialGameState_DealerDiscard.playerWhoOrderedUp // Player who ordered up decides to go alone
      };
      handleDealerDiscardStub.returns(mockNextGameState_Discard);
      const ackSpy = sinon.spy();
      const data = { gameId: gameId, cardId: discardedCard.id };

      await handler(data, ackSpy);

      expect(ackSpy).to.have.been.calledOnceWith(null, sinon.match({ status: 'ok', message: 'Dealer discard processed.' }));
      expect(handleDealerDiscardStub).to.have.been.calledOnce;
      expect(mockGameRepository.updateGame).to.have.been.calledOnceWith(gameId, mockNextGameState_Discard);
      expect(mockIo.to(gameId).emit).to.have.been.calledOnceWith(GAME_EVENTS.GAME_STATE_UPDATE, mockNextGameState_Discard);
    });

    it('should handle error if player is not the dealer', async () => {
        mockGameRepository.getGame.resolves({...mockInitialGameState_DealerDiscard, dealer: PLAYER_ROLES[1]}); // West is dealer, but South (playerRole) is trying
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, cardId: 'AH' }, ackSpy);

        expect(ackSpy).to.have.been.calledOnce;
        const ackArg = ackSpy.getCall(0).args[0];
        expect(ackArg.status).to.equal('error');
        expect(ackArg.error.action).to.equal(GAME_EVENTS.ACTION_DEALER_DISCARD);
        expect(ackArg.error.errorType).to.equal('NOT_DEALER'); // Specific errorType
        expect(ackArg.error.message).to.equal('Only the dealer can discard.');
        expect(handleDealerDiscardStub).to.not.have.been.called;
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle missing gameId', async () => {
        const ackSpy = sinon.spy();
        await handler({ cardId: 'AH' }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_INPUT');
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle missing cardId', async () => {
        mockGameRepository.getGame.resolves(mockInitialGameState_DealerDiscard);
        const ackSpy = sinon.spy();
        await handler({ gameId }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_INPUT');
        expect(stubbedLogger.warn).to.have.been.called;
    });


    it('should handle game not in DEALER_DISCARD phase', async () => {
        mockGameRepository.getGame.resolves({...mockInitialGameState_DealerDiscard, gamePhase: GAME_PHASES.PLAYING});
        const ackSpy = sinon.spy();
        await handler({ gameId, cardId: 'AH' }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_PHASE');
        expect(ackSpy.getCall(0).args[0].error.message).to.equal('Not the correct game phase for dealer to discard.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle isValidDealerDiscard returning false', async () => {
        isValidDealerDiscardStub_local.returns({isValid: false, message: 'Cannot discard this card.'});
        mockGameRepository.getGame.resolves(mockInitialGameState_DealerDiscard);
        const ackSpy = sinon.spy();
        await handler({ gameId, cardId: 'AH' }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_DISCARD');
        expect(ackSpy.getCall(0).args[0].error.message).to.equal('Cannot discard this card.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

     it('should handle error if getRoleBySocketId returns null', async () => {
        getRoleBySocketIdStub.returns(null); // Simulate player not part of the game
        mockGameRepository.getGame.resolves(mockInitialGameState_DealerDiscard);
        const ackSpy = sinon.spy();
        await handler({ gameId, cardId: 'AH' }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('PLAYER_NOT_IN_GAME');
        expect(stubbedLogger.warn).to.have.been.called;
    });


  });

  describe('Socket Handler for ACTION_CALL_TRUMP_DECISION', () => {
    let handler;
    let mockInitialGameState_CallTrump;
    let isValidBidStub_local_callTrump; // Local stub

    beforeEach(async () => {
        isValidBidStub_local_callTrump = sinon.stub().returns({ isValid: true });
         const { registerBiddingHandlers: rbh } = await esmock(
          biddingHandlersModulePath, {}, {
            [loggerModulePath]: { default: stubbedLogger },
            [gameRepositoryModulePath]: { gameRepository: mockGameRepository },
            [biddingPhaseModulePath]: { handleOrderUpDecision: sinon.stub(), handleDealerDiscard: sinon.stub(), handleCallTrumpDecision: handleCallTrumpDecisionStub },
            [validationModulePath]: { isValidBid: isValidBidStub_local_callTrump, isValidDealerDiscard: sinon.stub().returns({isValid: true}) },
            [playersModulePath]: { getRoleBySocketId: getRoleBySocketIdStub }
          }
        );
        mockSocket.on.resetHistory();
        rbh(mockSocket, mockIo);
        const call = mockSocket.on.getCalls().find(c => c.args[0] === GAME_EVENTS.ACTION_CALL_TRUMP_DECISION);
        if (!call || typeof call.args[1] !== 'function') throw new Error(`Handler for ${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION} not registered.`);
        handler = call.args[1];

        mockInitialGameState_CallTrump = {
            gameId,
            players: { [playerRole]: { name: 'South Player', teamId: 'NS', socketId: playerSocketId, id: 'user123' } },
            currentPlayer: playerRole,
            gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
            roundNumber: 2,
            turnCard: { suit: 'DIAMONDS', rank: 'Q', id: 'QD', name: 'Queen of Diamonds'} // Card that was turned down
        };
    });


    it('should successfully process valid call trump decision', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
      const mockNextGameState_Call = { ...mockInitialGameState_CallTrump, trumpSuit: SUITS.HEARTS, makerTeam: 'NS', gamePhase: GAME_PHASES.GOING_ALONE_DECISION, currentPlayer: playerRole };
      handleCallTrumpDecisionStub.returns(mockNextGameState_Call);
      const ackSpy = sinon.spy();
      const data = { gameId: gameId, decision: 'callTrump', suit: SUITS.HEARTS };

      await handler(data, ackSpy);
      expect(ackSpy).to.have.been.calledOnceWith(null, sinon.match({ status: 'ok', message: 'Call trump decision processed.' }));
      expect(handleCallTrumpDecisionStub).to.have.been.calledOnce;
    });

    it('should successfully process a pass decision for call trump', async () => {
      mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
      const passNextState_Call = {...mockInitialGameState_CallTrump, currentPlayer: PLAYER_ROLES[1]}; // Next player's turn
      handleCallTrumpDecisionStub.returns(passNextState_Call);
      const ackSpy = sinon.spy();
      const data = { gameId: gameId, decision: 'pass' };

      await handler(data, ackSpy);
      expect(ackSpy).to.have.been.calledOnceWith(null, sinon.match({ status: 'ok', message: 'Call trump decision processed.' }));
      expect(handleCallTrumpDecisionStub).to.have.been.calledOnceWith(sinon.match.any, playerRole, false, undefined);
    });

    it('should handle invalid data payload (missing gameId)', async () => {
        const ackSpy = sinon.spy();
        await handler({ decision: 'callTrump', suit: SUITS.HEARTS }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_INPUT');
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle invalid data payload (decision not "callTrump" or "pass")', async () => {
        mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, decision: 'invalidDecision', suit: SUITS.HEARTS }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_DECISION');
        expect(ackSpy.getCall(0).args[0].error.message).to.equal("Decision must be 'callTrump' or 'pass'.");
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle invalid data payload (missing suit when calling trump)', async () => {
        mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, decision: 'callTrump' }, ackSpy); // Missing suit
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_SUIT');
        expect(ackSpy.getCall(0).args[0].error.message).to.equal('Invalid suit provided for calling trump.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle invalid data payload (invalid suit string when calling trump)', async () => {
        mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
        const ackSpy = sinon.spy();
        await handler({ gameId: gameId, decision: 'callTrump', suit: 'INVALID_SUIT_VALUE' }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_SUIT');
        expect(stubbedLogger.warn).to.have.been.called;
    });


    it('should handle game not in ORDER_UP_ROUND2 phase', async () => {
        mockGameRepository.getGame.resolves({...mockInitialGameState_CallTrump, gamePhase: GAME_PHASES.PLAYING});
        const ackSpy = sinon.spy();
        await handler({ gameId, decision: 'callTrump', suit: SUITS.HEARTS }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_PHASE');
        expect(ackSpy.getCall(0).args[0].error.message).to.equal('Not the correct phase to call trump.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

    it('should handle isValidBid returning false for call trump', async () => {
        isValidBidStub_local_callTrump.returns({isValid: false, message: 'Cannot call this suit now.'});
        mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
        const ackSpy = sinon.spy();
        await handler({ gameId, decision: 'callTrump', suit: SUITS.HEARTS }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('INVALID_BID');
        expect(ackSpy.getCall(0).args[0].error.message).to.equal('Cannot call this suit now.');
        expect(stubbedLogger.warn).to.have.been.called;
    });

     it('should handle error if getRoleBySocketId returns null for call trump', async () => {
        getRoleBySocketIdStub.returns(null);
        mockGameRepository.getGame.resolves(mockInitialGameState_CallTrump);
        const ackSpy = sinon.spy();
        await handler({ gameId, decision: 'callTrump', suit: SUITS.HEARTS }, ackSpy);
        expect(ackSpy.getCall(0).args[0].error.errorType).to.equal('PLAYER_NOT_IN_GAME');
        expect(stubbedLogger.warn).to.have.been.called;
    });
  });
});
