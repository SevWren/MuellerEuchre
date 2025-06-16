import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { GAME_EVENTS, PLAYER_ROLES, SUITS, GAME_PHASES } from '../../../src/config/constants.js';
// Logger will be mocked via esmock
// import logger from '../../../src/utils/logger.js';

describe('Bidding Socket Handlers', () => {
  let mockIo;
  let mockSocket;
  let mockGameRepository;
  // let mockLoggerError; // Will use stubbedLogger properties

  // Stubs for biddingPhase functions, defined in outer scope
  let handleOrderUpDecisionStub;
  let handleDealerDiscardStub;
  let handleCallTrumpDecisionStub;

  const gameId = 'testGame123';
  const playerRole = PLAYER_ROLES[0]; // South

  // This helper will now be responsible for loading module with mocks and getting the handler
  async function getHandlerWithMocksAndRegister(eventName, currentMockSocket, currentMockIo) {
    const stubbedLogger = { // Fully stubbed logger for mocking the default export
        info: sinon.stub(), warn: sinon.stub(), error: sinon.stub(),
        debug: sinon.stub(), fatal: sinon.stub(), child: sinon.stub().returnsThis(),
    };

    // mockGameRepository is from the outer scope (defined in main beforeEach)
    // biddingPhase stubs (handleOrderUpDecisionStub etc.) are from the outer scope (defined in main beforeEach)

    const { registerBiddingHandlers: rbh } = await esmock(
      '../../../src/socket/handlers/biddingHandlers.js',
      {}, // Global mocks/imports for the module being loaded (biddingHandlers.js itself)
      { // Module-specific mocks (for imports *within* biddingHandlers.js)
        '../../../src/utils/logger.js': { default: stubbedLogger },
        '../../../src/db/gameRepository.js': { gameRepository: mockGameRepository },
        '../../../src/game/phases/biddingPhase.js': {
          handleOrderUpDecision: handleOrderUpDecisionStub,
          handleDealerDiscard: handleDealerDiscardStub,
          handleCallTrumpDecision: handleCallTrumpDecisionStub,
        }
      }
    );
    currentMockSocket.on.resetHistory();
    // The actual registerBiddingHandlers takes (socket, io)
    rbh(currentMockSocket, currentMockIo);
    const call = currentMockSocket.on.getCalls().find(c => c.args[0] === eventName);
    if (!call || typeof call.args[1] !== 'function') {
        throw new Error(`Handler for ${eventName} not registered as a function by spy. Found: ${call ? call.args[0] : 'nothing'} - ${call ? String(call.args[1]) : ''}. Calls: ${JSON.stringify(currentMockSocket.on.getCalls().map(c => c.args[0]))}`);
    }
    return call.args[1];
  }


  beforeEach(() => {
    mockIo = {
      to: sinon.stub().returnsThis(),
      emit: sinon.spy(),
    };
    mockSocket = {
      join: sinon.spy(),
      leave: sinon.spy(),
      emit: sinon.spy(),
      on: sinon.spy(),
      gameId: gameId,
      request: { user: { role: playerRole, id: 'playerSocketId1' } }
    };

    mockGameRepository = {
      getGame: sinon.stub(),
      updateGame: sinon.stub().resolves(),
      // createGame: sinon.stub(), // Not used by these handlers directly
    };

    // No longer stubbing global logger here; esmock handles logger for the tested module
    // mockLoggerError = sinon.stub(logger, 'error');

    handleOrderUpDecisionStub = sinon.stub();
    handleDealerDiscardStub = sinon.stub();
    handleCallTrumpDecisionStub = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
    // esmock.purgeAll(); // Removed as it might not be a function and esmock might handle cleanup
  });

  describe('registerBiddingHandlers', async () => {
    it('should register handlers for bidding related GAME_EVENTS', async () => {
      // For this test, we just need to ensure the esmocked module calls socket.on
      // The actual stubs for dependencies don't need to do anything.
      const { registerBiddingHandlers } = await esmock('../../../src/socket/handlers/biddingHandlers.js', {
         '../../../src/utils/logger.js': { default: { info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() } },
         '../../../src/db/gameRepository.js': { gameRepository: mockGameRepository },
         '../../../src/game/phases/biddingPhase.js': {
          handleOrderUpDecision: handleOrderUpDecisionStub,
          handleDealerDiscard: handleDealerDiscardStub,
          handleCallTrumpDecision: handleCallTrumpDecisionStub,
        }
      });
      registerBiddingHandlers(mockSocket, mockIo); // Pass non-stubbed logger here if it's not from module

      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.ACTION_ORDER_UP_DECISION, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.ACTION_DEALER_DISCARD, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION, sinon.match.func);
    });
  });

  describe('Socket Handler for ACTION_ORDER_UP_DECISION', () => {
    let handler;
    const mockInitialGameState = { gameId, players: { [playerRole]: { name: 'South Player' } }, currentPlayer: playerRole, gamePhase: GAME_PHASES.ORDER_UP_ROUND1, roundNumber: 1, turnCard: { suit: 'HEARTS', rank: 'A'} };
    const mockNextGameState = { ...mockInitialGameState, roundNumber: 1 };

    it('should successfully process valid order up decision', async () => {
      handler = await getHandlerWithMocksAndRegister(GAME_EVENTS.ACTION_ORDER_UP_DECISION, mockSocket, mockIo);
      mockGameRepository.getGame.resolves(mockInitialGameState);
      handleOrderUpDecisionStub.returns(mockNextGameState);
      const ackSpy = sinon.spy();
      const data = { passes: false }; // Client: passes=false means order up

      await handler(data, ackSpy);

      expect(mockGameRepository.getGame).to.have.been.calledOnceWith(gameId);
      expect(handleOrderUpDecisionStub).to.have.been.calledOnceWith(mockInitialGameState, playerRole, true); // true = wantsToOrderUp
      expect(mockGameRepository.updateGame).to.have.been.calledOnceWith(gameId, mockNextGameState);
      expect(mockIo.to).to.have.been.calledOnceWith(gameId);
      expect(mockIo.emit).to.have.been.calledOnceWith(GAME_EVENTS.STATE_UPDATE, mockNextGameState);
      expect(ackSpy).to.have.been.calledOnceWith(null, { status: 'ok', message: 'Order up decision processed.' });
      // expect(stubbedLogger.error).to.not.have.been.called; // Check via specific stubbedLogger if needed
    });

    it('should handle game not found', async () => {
      handler = await getHandlerWithMocksAndRegister(GAME_EVENTS.ACTION_ORDER_UP_DECISION, mockSocket, mockIo);
      mockGameRepository.getGame.resolves(null);
      const ackSpy = sinon.spy();
      await handler({ passes: true }, ackSpy);

      expect(ackSpy).to.have.been.calledOnceWith({ status: 'error', message: 'Game not found.' });
      // expect(stubbedLogger.error).to.have.been.calledOnce; // Check specific stubbed logger
    });

    it('should handle error from biddingPhase.handleOrderUpDecision', async () => {
      handler = await getHandlerWithMocksAndRegister(GAME_EVENTS.ACTION_ORDER_UP_DECISION, mockSocket, mockIo);
      mockGameRepository.getGame.resolves(mockInitialGameState);
      const phaseError = new Error('Phase logic error');
      handleOrderUpDecisionStub.throws(phaseError);
      const ackSpy = sinon.spy();

      await handler({ passes: true }, ackSpy);

      expect(handleOrderUpDecisionStub).to.have.been.calledOnceWith(mockInitialGameState, playerRole, false); // false = wantsToOrderUp (pass)
      expect(ackSpy).to.have.been.calledOnceWith({ status: 'error', message: phaseError.message });
    });

    it('should handle error if playerRole is not the current player in gameState', async () => {
        handler = await getHandlerWithMocksAndRegister(GAME_EVENTS.ACTION_ORDER_UP_DECISION, mockSocket, mockIo);
        const gameStateWithDifferentCurrentPlayer = { ...mockInitialGameState, currentPlayer: PLAYER_ROLES[1] };
        mockGameRepository.getGame.resolves(gameStateWithDifferentCurrentPlayer);
        const ackSpy = sinon.spy();
        await handler({ passes: true }, ackSpy);

        expect(ackSpy).to.have.been.calledOnceWith({ status: 'error', message: 'Not your turn to make a bidding decision.' });
        expect(handleOrderUpDecisionStub).to.not.have.been.called;
    });
  });

  describe('Socket Handler for ACTION_DEALER_DISCARD', () => {
    let handler;
    const mockInitialGameState = { gameId, dealer: playerRole, players: { [playerRole]: { name: 'South Player', hand: [{id: 'AH'}, {id: 'KH'}] } }, gamePhase: GAME_PHASES.DEALER_DISCARD, currentPlayer: playerRole, turnCard: { suit: 'SPADES', rank: 'J', id: 'JS'}, playerWhoOrderedUp: playerRole };
    const mockNextGameState = { ...mockInitialGameState, turnCard: null };

    it('should successfully process valid dealer discard', async () => {
      handler = await getHandlerWithMocksAndRegister(GAME_EVENTS.ACTION_DEALER_DISCARD, mockSocket, mockIo);
      mockGameRepository.getGame.resolves(mockInitialGameState);
      handleDealerDiscardStub.returns(mockNextGameState);
      const ackSpy = sinon.spy();
      const data = { cardId: 'AH' };

      await handler(data, ackSpy);

      expect(mockGameRepository.getGame).to.have.been.calledOnceWith(gameId);
      expect(handleDealerDiscardStub).to.have.been.calledOnceWith(mockInitialGameState, playerRole, data.cardId);
      expect(mockGameRepository.updateGame).to.have.been.calledOnceWith(gameId, mockNextGameState);
      expect(mockIo.to).to.have.been.calledOnceWith(gameId);
      expect(mockIo.emit).to.have.been.calledOnceWith(GAME_EVENTS.STATE_UPDATE, mockNextGameState);
      expect(ackSpy).to.have.been.calledOnceWith(null, { status: 'ok', message: 'Dealer discard processed.' });
    });

    it('should handle error if player is not the dealer', async () => {
        handler = await getHandlerWithMocksAndRegister(GAME_EVENTS.ACTION_DEALER_DISCARD, mockSocket, mockIo);
        const gameStateWithDifferentDealer = { ...mockInitialGameState, dealer: PLAYER_ROLES[1] };
        mockGameRepository.getGame.resolves(gameStateWithDifferentDealer);
        const ackSpy = sinon.spy();
        await handler({ cardId: 'AH' }, ackSpy);

        expect(ackSpy).to.have.been.calledOnceWith({ status: 'error', message: 'Only the dealer can discard.' });
        expect(handleDealerDiscardStub).to.not.have.been.called;
    });
  });

  describe('Socket Handler for ACTION_CALL_TRUMP_DECISION', () => {
    let handler;
    const mockInitialGameState = { gameId, players: { [playerRole]: { name: 'South Player' } }, currentPlayer: playerRole, gamePhase: GAME_PHASES.ORDER_UP_ROUND2, roundNumber: 2, turnCard: { suit: 'DIAMONDS', rank: 'Q'} };
    const mockNextGameState = { ...mockInitialGameState, trumpSuit: 'HEARTS' };

    it('should successfully process valid call trump decision', async () => {
      handler = await getHandlerWithMocksAndRegister(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION, mockSocket, mockIo);
      mockGameRepository.getGame.resolves(mockInitialGameState);
      handleCallTrumpDecisionStub.returns(mockNextGameState);
      const ackSpy = sinon.spy();
      const data = { passes: false, suit: SUITS.HEARTS };

      await handler(data, ackSpy);

      expect(mockGameRepository.getGame).to.have.been.calledOnceWith(gameId);
      expect(handleCallTrumpDecisionStub).to.have.been.calledOnceWith(mockInitialGameState, playerRole, true, data.suit); // true = wantsToCall
      expect(mockGameRepository.updateGame).to.have.been.calledOnceWith(gameId, mockNextGameState);
      expect(mockIo.to).to.have.been.calledOnceWith(gameId);
      expect(mockIo.emit).to.have.been.calledOnceWith(GAME_EVENTS.STATE_UPDATE, mockNextGameState);
      expect(ackSpy).to.have.been.calledOnceWith(null, { status: 'ok', message: 'Call trump decision processed.' });
    });
  });
});
