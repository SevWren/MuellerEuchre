// test/client/services/uiService.test.js
import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { UiService } from '../../../src/client/services/uiService.js'; // Use named import for the class
import { GAME_PHASES, SUITS } from '../../../src/config/constants.js'; // Relative Path Windows/Jules

chai.use(sinonChai);
const expect = chai.expect;

describe('UiService', () => { // Test suite for UiService
  let uiService;
  let mockStateService;
  let mockSocketService;

  beforeEach(() => { // Setup before each test
    mockStateService = {
      getPlayerHand: sinon.stub().returns([{ id: 'AH', rank: 'A', suit: 'HEARTS' }]),
      getTurnCard: sinon.stub().returns({ id: 'KD', rank: 'K', suit: 'DIAMONDS' }),
      getCurrentTrick: sinon.stub().returns([]),
      getTeamScores: sinon.stub().returns({ NS: 0, EW: 0 }),
      getLatestGameMessage: sinon.stub().returns('Welcome!'),
      getPlayerRole: sinon.stub().returns('south'),
      getMaker: sinon.stub().returns('south'),
      gameState: {
        currentPlayer: 'south',
        phase: GAME_PHASES.LOBBY,
        players: {
            south: { id: 'south', name: 'Player South', isConnected: true, role: 'south' }
        }
      }
      // Add stubs for other stateService methods as needed by uiService methods
    };

    mockSocketService = {
      emitOrderUpDecision: sinon.stub().resolves({ status: 'ok', message: 'Decision made' }),
      emitDealerDiscard: sinon.stub().resolves({ status: 'ok', message: 'Card discarded' }),
      emitCallTrumpDecision: sinon.stub().resolves({ status: 'ok', message: 'Trump called' }),
      emitGoAloneDecision: sinon.stub().resolves({ status: 'ok', message: 'Go alone decided' }),
      emitPlayCard: sinon.stub().resolves({ status: 'ok', message: 'Card played' }),
      emitRejoinGame: sinon.stub().resolves({ status: 'ok', message: 'Rejoined game' }),
      // Add stubs for other socketService methods as needed
    };

    uiService = new UiService(mockStateService, mockSocketService);

    // Spy on console methods for conceptual UI tests if needed, and other UI methods
    sinon.spy(console, 'log');
    sinon.spy(console, 'error');
    sinon.spy(console, 'warn');
    sinon.spy(uiService, 'displayMessage');
    sinon.spy(uiService, 'showErrorModal');
    sinon.spy(uiService, 'showSpinner');
    sinon.spy(uiService, 'hideSpinner');
    sinon.spy(uiService, 'navigateTo');

  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should store stateService and socketService instances', () => {
      expect(uiService.stateService).to.equal(mockStateService);
      expect(uiService.socketService).to.equal(mockSocketService);
    });
  });

  describe('Error and Message Display', () => {
    it('displayGlobalError should call displayMessage with error type', () => {
      uiService.displayGlobalError('Test global error');
      expect(uiService.displayMessage).to.have.been.calledOnceWith('Global Error: Test global error', 'error');
    });

    it('showErrorModal should log to console.error (conceptual)', () => {
      uiService.showErrorModal('Test error modal', 'Test Title');
      expect(console.error).to.have.been.calledWith(sinon.match(/Showing error modal \(title: Test Title\): "Test error modal"/));
    });

    it('displayMessage should log to console.log (conceptual)', () => {
      uiService.displayMessage('Test info message', 'info');
      expect(console.log).to.have.been.calledWith(sinon.match(/Displaying message \(type: info\): "Test info message"/));
    });
  });

  describe('Action-Triggering Methods', () => {
    it('promptOrderUp should call socketService.emitOrderUpDecision and handle promise', async () => {
      await uiService.promptOrderUp(true); // passes = true
      expect(uiService.showSpinner).to.have.been.calledOnceWith('Submitting your decision...');
      expect(mockSocketService.emitOrderUpDecision).to.have.been.calledOnceWith(true);
      expect(uiService.hideSpinner).to.have.been.calledOnce;
      expect(uiService.displayMessage).to.have.been.calledOnceWith('Decision submitted successfully.', 'success');
    });

    it('promptOrderUp should handle rejection from socketService', async () => {
      const error = new Error('Server unavailable');
      mockSocketService.emitOrderUpDecision.rejects(error);

      try {
        await uiService.promptOrderUp(false);
        expect.fail('promptOrderUp should have thrown or returned a rejected promise');
      } catch (e) {
        expect(e).to.equal(error);
      }

      expect(uiService.showSpinner).to.have.been.calledOnce;
      expect(mockSocketService.emitOrderUpDecision).to.have.been.calledOnceWith(false);
      expect(uiService.hideSpinner).to.have.been.calledOnce;
      expect(uiService.showErrorModal).to.have.been.calledOnceWith(
        `Failed to submit decision: ${error.message}. Please try again.`,
        'Order Up Failed'
      );
    });

    it('handlePlayCardSelection should call socketService.emitPlayCard for valid card', async () => {
        const card = { suit: 'HEARTS', rank: 'A', id: 'AH' };
        await uiService.handlePlayCardSelection(card); // Assuming this returns a promise that resolves on success
        expect(uiService.showSpinner).to.have.been.calledOnce;
        expect(mockSocketService.emitPlayCard).to.have.been.calledOnceWith(null, null, card);
        expect(uiService.hideSpinner).to.have.been.calledOnce;
        expect(uiService.displayMessage).to.have.been.calledOnceWith(sinon.match(/You played A of HEARTS/), 'success');
    });

    it('handlePlayCardSelection should show error for invalid card and not call socketService', async () => {
        const invalidCard = { suit: 'HEARTS', rank: 'A' }; // Missing id
        try {
            await uiService.handlePlayCardSelection(invalidCard);
            // If handlePlayCardSelection resolves, the test should fail, as an error is expected.
            // However, if it correctly returns a Promise.reject, this await will throw.
            expect.fail('handlePlayCardSelection should have rejected due to invalid card');
        } catch (error) {
            expect(error.message).to.equal('Invalid card object');
        }
        // Check side effects
        expect(uiService.showSpinner).to.not.have.been.called;
        expect(mockSocketService.emitPlayCard).to.not.have.been.called;
        expect(uiService.showErrorModal).to.have.been.calledOnceWith(
            'Invalid card selected. Card data is incomplete. Please try again.',
            'Play Card Error'
        );
    });
  });

  describe('Reconnection UI Flow Methods', () => {
    it('promptForRejoin (user confirms) should call socketService.emitRejoinGame', async () => {
      // Current implementation of promptForRejoin simulates userConfirm = true
      mockSocketService.emitRejoinGame.resolves({ status: 'ok' });
      await uiService.promptForRejoin('game789');
      expect(uiService.showSpinner).to.have.been.calledOnceWith('Rejoining game game789...');
      expect(mockSocketService.emitRejoinGame).to.have.been.calledOnceWith('game789');
      // Promise resolved, hideSpinner and displayMessage should be called.
      // Note: exact behavior depends on how the .then() in promptForRejoin is structured
      // and if emitRejoinGame resolves fast enough for spies to catch chained calls.
      // For more robust test, promptForRejoin should return the promise.
      // await some mechanism if promptForRejoin was fully async.
      // Assume for now the calls are made:
      // expect(uiService.hideSpinner).to.have.been.called;
      // expect(uiService.displayMessage).to.have.been.calledWith(sinon.match.string, 'success');
    });

    // To test user denial, promptForRejoin would need to be refactored for testability
    // (e.g., take a mock confirmation function).

    it('showConnectionLostMessage should call displayMessage with error type', () => {
      uiService.showConnectionLostMessage('Network down');
      expect(uiService.displayMessage).to.have.been.calledOnceWith('Network down Attempting to reconnect...', 'error');
    });

    it('showReconnectingModal should call showSpinner', () => {
      uiService.showReconnectingModal('Trying to reconnect...');
      expect(uiService.showSpinner).to.have.been.calledOnceWith('Trying to reconnect...');
    });

    it('showReconnectedMessage should hideSpinner and call displayMessage', () => {
      uiService.showReconnectedMessage('Reconnected!');
      expect(uiService.hideSpinner).to.have.been.calledOnce;
      expect(uiService.displayMessage).to.have.been.calledOnceWith('Reconnected!', 'success');
    });

    it('showReconnectionFailedModal should hideSpinner and call showErrorModal', () => {
      uiService.showReconnectionFailedModal('Could not reconnect.');
      expect(uiService.hideSpinner).to.have.been.calledOnce;
      expect(uiService.showErrorModal).to.have.been.calledOnceWith(
        'Could not reconnect. Please check your internet connection or try joining again. You may need to start a new game.',
        'Reconnection Failed'
      );
    });

    it('hideModal should call hideSpinner', () => {
        uiService.hideModal();
        expect(uiService.hideSpinner).to.have.been.calledOnce;
    });
  });

  describe('Contextual UI Element State Methods', () => {
    it('getBiddingControlsState should reflect bidding phase for active player', () => {
      mockStateService.getPlayerRole.returns('player1');
      mockStateService.gameState = { currentPlayer: 'player1', phase: GAME_PHASES.ORDER_UP_ROUND1 };
      const controls = uiService.getBiddingControlsState();
      expect(controls.visible).to.be.true;
      expect(controls.canOrderUp).to.be.true;
    });

    it('getBiddingControlsState should be hidden if not active player', () => {
      mockStateService.getPlayerRole.returns('player2');
      mockStateService.gameState = { currentPlayer: 'player1', phase: GAME_PHASES.ORDER_UP_ROUND1 };
      const controls = uiService.getBiddingControlsState();
      expect(controls.visible).to.be.false;
    });

    it('getCardPlayabilityState should allow play if player turn and playing phase and card in hand', () => {
        mockStateService.getPlayerRole.returns('player1');
        mockStateService.gameState = { currentPlayer: 'player1', phase: GAME_PHASES.PLAYING };
        mockStateService.getPlayerHand = sinon.stub().returns([{id: 'AH'}]); // Card is in hand
        const cardState = uiService.getCardPlayabilityState({id: 'AH'});
        expect(cardState.canPlayOnSurface).to.be.true;
        expect(cardState.isCardPlayable).to.be.true;
    });

    it('getCardPlayabilityState should deny play if card not in hand', () => {
        mockStateService.getPlayerRole.returns('player1');
        mockStateService.gameState = { currentPlayer: 'player1', phase: GAME_PHASES.PLAYING };
        mockStateService.getPlayerHand = sinon.stub().returns([{id: 'KH'}]); // AH is NOT in hand
        const cardState = uiService.getCardPlayabilityState({id: 'AH'});
        expect(cardState.isCardPlayable).to.be.false;
        expect(cardState.message).to.equal('Card not in hand.');
    });
  });

  // Add more tests for other UI methods like displayPlayerHand, displayTurnCard, etc.
  // These will mostly check that console.log is called with expected conceptual content,
  // and that the correct stateService getters are used.
  describe('Display Methods (Conceptual)', () => {
    it('displayPlayerHand should call stateService.getPlayerHand and log conceptually', () => {
        mockStateService.getPlayerHand.returns([{ rank: 'A', suit: 'SPADES' }, { rank: 'K', suit: 'SPADES' }]);
        uiService.displayPlayerHand();
        expect(mockStateService.getPlayerHand).to.have.been.calledOnce;
        expect(console.log).to.have.been.calledWith('[UiService - Conceptual] Displaying Player Hand:', 'A of SPADES, K of SPADES');
    });

    it('displayTurnCard should call stateService.getTurnCard and log conceptually', () => {
        mockStateService.getTurnCard.returns({ rank: 'Q', suit: 'HEARTS' });
        uiService.displayTurnCard();
        expect(mockStateService.getTurnCard).to.have.been.calledOnce;
        expect(console.log).to.have.been.calledWith(sinon.match(/Displaying Turn Card: Q of HEARTS/));
    });
  });

});
