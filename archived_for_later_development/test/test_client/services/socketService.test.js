// File located at test/client/services/socketService.test.js
import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { SocketService } from '../../../src/client/services/socketService.js'; // Use named import for the class
import { GAME_EVENTS } from '../../../src/config/constants.js'; // Import the constants directly

chai.use(sinonChai); // Use sinon-chai for better assertions on spies and stubs
const expect = chai.expect; // Use expect from chai for assertions

// Default placeholder for uiService if the actual one isn't mocked in a specific test context
const uiServicePlaceholder = {
    displayGlobalError: sinon.spy(), // Spy for displayGlobalError
    displayAssignedRole: sinon.spy(), // Spy for displayAssignedRole
    updateLobbyView: sinon.spy(), // Spy for updateLobbyView
    displayMessage: sinon.spy(), // Spy for displayMessage
    showErrorModal: sinon.spy(), // Spy for showErrorModal
    promptForRejoin: sinon.spy(), // Spy for promptForRejoin
    showConnectionLostMessage: sinon.spy(), // Spy for showConnectionLostMessage
    showReconnectingModal: sinon.spy(), // Spy for showReconnectingModal
    showReconnectedMessage: sinon.spy(), // Spy for showReconnectedMessage
    showReconnectionFailedModal: sinon.spy(), // Spy for showReconnectionFailedModal
    hideModal: sinon.spy(), //
};

describe('SocketService', () => {
  let socketService; // Instance of SocketService
  let mockSocket; // Mock socket object
  let mockStateService; // Mock state service
  let mockUiService; // Use this for most tests

  beforeEach(() => {
    // Mock StateService
    // Create fresh spies for each test run to ensure isolation.
    mockStateService = { 
      getGameId: sinon.stub().returns('testGame123'),
      getPlayerRole: sinon.stub().returns('player1'),
      getPlayerId: sinon.stub().returns('playerTestId123'),
      hasReconnectInfo: sinon.stub().returns(false),
      setGameDetails: sinon.spy(),
      setPlayerId: sinon.spy(),
      setPlayerRole: sinon.spy(),
      updatePlayerList: sinon.spy(),
      updateFullGameState: sinon.spy(),
    };

    // Mock UiService (specific spies for methods called by SocketService)
    // Create fresh spies for each test run to ensure isolation.
    mockUiService = {
        displayGlobalError: sinon.spy(),
        displayAssignedRole: sinon.spy(),
        updateLobbyView: sinon.spy(),
        displayMessage: sinon.spy(),
        showErrorModal: sinon.spy(),
        promptForRejoin: sinon.spy(),
        showConnectionLostMessage: sinon.spy(),
        showReconnectingModal: sinon.spy(),
        showReconnectedMessage: sinon.spy(),
        showReconnectionFailedModal: sinon.spy(),
        hideModal: sinon.spy(),
    };

    // Mock Socket object (socket.io-client)
    mockSocket = {
      on: sinon.spy(),
      emit: sinon.stub(), // This will be the raw emit
      connect: sinon.spy(), // Simulate connect method
      disconnect: sinon.spy(), // Simulate connect and disconnect methods
      //timeout: sinon.stub().returnsThis(), // Chainable timeout
      // For _emitWithAck, the mock 'emit' needs to handle the ack callback
      // We'll make the default mockSocket.emit simulate an immediate successful ack
      // Individual tests can override this behavior for specific events.
      timeout: function (duration) {
        return {
          emit: (event, data, ack) => {
            // Default behavior: successful ack
            // console.log(`[Test MockSocket] timeout().emit called for ${event}`, data);
            if (ack) {
              setTimeout(() => ack(null, { status: 'ok', data: { success: true, event } }), 0);
            }
          }
        };
      }
    };
    sinon.spy(mockSocket, 'timeout');


    // Create SocketService instance with mocks
    // constructor(stateServiceParam = stateServiceInstance, uiServiceParam = uiServicePlaceholder)
    socketService = new SocketService(mockStateService, mockUiService);
    // Override the actual socket instance created in SocketService constructor with our mock
    socketService.socket = mockSocket;
    // Re-initialize event listeners with the mock socket if they were set up with a real one.
    // The constructor calls initializeEventListeners, so we need to ensure it uses the mock.
    // This is a bit tricky. A better way might be to pass the socket factory to SocketService.
    // For now, we assume the constructor's `initializeEventListeners` will pick up `this.socket = mockSocket`.
    // Or, call it again:
    mockSocket.on.resetHistory(); // Reset spy from constructor call
    socketService.initializeEventListeners();

  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor and Initialization', () => {
    it('should store stateService and uiService instances', () => {
      expect(socketService.stateService).to.equal(mockStateService);
      expect(socketService.uiService).to.equal(mockUiService);
    });

    it('should initialize event listeners on the socket', () => {
      // Check that 'on' was called for standard socket events and GAME_EVENTS
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.ASSIGN_ROLE, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.GAME_FULL, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.PLAYER_ALREADY_IN_GAME, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.STATE_UPDATE, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.ERROR, sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith('connect', sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith('disconnect', sinon.match.func);
      expect(mockSocket.on).to.have.been.calledWith('connect_error', sinon.match.func);
    });
  });

  describe('_emitWithAck', () => {
    it('should resolve on successful server acknowledgement', async () => {
      const event = 'test_event_success';
      const payload = { data: 'test' };
      // Mock 'emit' for this specific test to return a success
      socketService.socket.timeout = () => ({ // Ensure this specific test uses a controlled emit
          emit: (evt, pld, ack) => {
              if (evt === event) ack(null, { status: 'ok', data: { info: 'Success!' }});
          }
      });
      const result = await socketService._emitWithAck(event, payload);
      expect(result).to.deep.equal({ info: 'Success!' });
    });

    it('should reject on server error acknowledgement', async () => {
      const event = 'test_event_error_ack';
      const payload = { data: 'test' };
       socketService.socket.timeout = () => ({
          emit: (evt, pld, ack) => {
              if (evt === event) ack(null, { status: 'error', message: 'Server error response' });
          }
      });
      try {
        await socketService._emitWithAck(event, payload);
        expect.fail('Promise should have rejected');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('Server error response');
      }
    });

    it('should reject on timeout', async () => {
        const event = 'test_event_timeout';
        const payload = { data: 'test_timeout_payload' };
        const timeoutDuration = 100; // ms

        // Mock emit for this specific test to *not* call ack, simulating a timeout
        socketService.socket.timeout = (duration) => {
            expect(duration).to.equal(timeoutDuration); // Check if correct timeout is passed
            return {
                emit: (evt, pld, ack) => {
                    // Simulate timeout by *not* calling ack immediately
                    // The _emitWithAck's internal timer should trigger the rejection
                    // Forcing the timeout error:
                     setTimeout(() => {
                        // This simulates the timeout error being passed to the ack by the conceptual socket's timeout wrapper
                        ack(new Error(`Timeout: Server did not acknowledge ${evt} within ${duration}ms`), null);
                    }, duration + 10); // Ensure this is after the timeout in _emitWithAck
                }
            };
        };
        try {
            await socketService._emitWithAck(event, payload, timeoutDuration);
            expect.fail('Promise should have rejected on timeout');
        } catch (error) {
            expect(error).to.be.an('string'); // The current implementation rejects with error.message string
            expect(error).to.include(`Timeout: Server did not acknowledge ${event}`);
        }
    });


    it('should reject on underlying socket error (err in ack)', async () => {
      const event = 'test_event_socket_error';
      const payload = { data: 'test' };
      socketService.socket.timeout = () => ({
          emit: (evt, pld, ack) => {
              if (evt === event) ack(new Error('Network connection failed'), null);
          }
      });
      try {
        await socketService._emitWithAck(event, payload);
        expect.fail('Promise should have rejected');
      } catch (error) {
        expect(error).to.be.an('string'); // Rejects with error.message
        expect(error).to.equal('Network connection failed');
      }
    });
  });

  describe('Emitters', () => {
    // Example for one emitter, others would follow a similar pattern
    it('emitOrderUpDecision should call _emitWithAck with correct event and payload', async () => {
      sinon.spy(socketService, '_emitWithAck'); // Spy on the helper
      mockStateService.getGameId.returns('game1');
      mockStateService.getPlayerRole.returns('playerA');

      await socketService.emitOrderUpDecision(true).catch(() => {}); // Call and ignore potential mock errors for this specific test focus

      expect(socketService._emitWithAck).to.have.been.calledOnceWith(
        GAME_EVENTS.ACTION_ORDER_UP_DECISION,
        { gameId: 'game1', playerRole: 'playerA', passes: true }
      );
      socketService._emitWithAck.restore();
    });

     it('joinGame should call _emitWithAck with correct event and payload', async () => {
      sinon.spy(socketService, '_emitWithAck');
      await socketService.joinGame('g7', 'PlayerName').catch(() => {});
      expect(socketService._emitWithAck).to.have.been.calledOnceWith(
        GAME_EVENTS.JOIN_GAME,
        { gameId: 'g7', playerName: 'PlayerName' }
      );
      socketService._emitWithAck.restore();
    });

    it('emitRejoinGame should call _emitWithAck with correct payload', async () => {
        sinon.spy(socketService, '_emitWithAck');
        mockStateService.getPlayerId.returns('playerRejoinId');
        await socketService.emitRejoinGame('gameToRejoin').catch(() => {});

        expect(socketService._emitWithAck).to.have.been.calledOnceWith(
            GAME_EVENTS.ACTION_REJOIN_GAME,
            { gameId: 'gameToRejoin', playerId: 'playerRejoinId' }
        );
        socketService._emitWithAck.restore();
    });

    it('emitRejoinGame should reject if no playerId is found', async () => {
        mockStateService.getPlayerId.returns(null);
        try {
            await socketService.emitRejoinGame('gameToRejoin');
            expect.fail('emitRejoinGame should have rejected');
        } catch (error) {
            expect(error).to.be.an('error');
            expect(error.message).to.equal('Player ID not found. Cannot rejoin.');
        }
    });
  });


  describe('Event Handlers', () => {
    it('handleAssignRole should call stateService methods', () => {
      const data = { role: 'north', gameId: 'g1', players: [], isHost: true, playerId: 'pNorth' };
      // Directly call the handler function (it's bound to the class instance)
      socketService.handleAssignRole(data);
      expect(mockStateService.setGameDetails).to.have.been.calledOnceWith({ gameId: 'g1', isHost: true });
      expect(mockStateService.setPlayerId).to.have.been.calledOnceWith('pNorth');
      expect(mockStateService.setPlayerRole).to.have.been.calledOnceWith('north');
      expect(mockStateService.updatePlayerList).to.have.been.calledOnceWith([]);
      expect(mockUiService.displayAssignedRole).to.have.been.calledOnceWith('north');
    });

    it('handleGameStateUpdate should call stateService.updateFullGameState', () => {
      const newState = { phase: 'PLAYING' };
      socketService.handleGameStateUpdate(newState);
      expect(mockStateService.updateFullGameState).to.have.been.calledOnceWith(newState);
    });

    it('handleGenericError should call uiService.displayGlobalError', () => {
      const errorData = { message: 'A generic error occurred' };
      socketService.handleGenericError(errorData);
      expect(mockUiService.displayGlobalError).to.have.been.calledOnceWith(errorData.message);
    });

    it('handlePlayerAlreadyInGame should call uiService.promptForRejoin', () => {
        const data = { message: "Already in game", gameId: "g123" };
        socketService.handlePlayerAlreadyInGame(data);
        expect(mockUiService.displayMessage).to.have.been.calledOnceWith(data.message);
        expect(mockUiService.promptForRejoin).to.have.been.calledOnceWith(data.gameId);
    });

    // Test 'connect' and 'disconnect' handlers
    describe('Socket Connection Event Handlers', () => {
        let connectHandler;
        let disconnectHandler;

        beforeEach(() => {
            // Reset UI service spies specifically for these connection tests
            Object.values(mockUiService).forEach(stub => {
                if (stub && typeof stub.resetHistory === 'function') {
                    stub.resetHistory();
                }
            });

            // Find the registered handlers from the mockSocket.on calls
            const connectCall = mockSocket.on.getCalls().find(call => call.args[0] === 'connect');
            if (connectCall) connectHandler = connectCall.args[1]; else throw new Error("connect handler not found");

            const disconnectCall = mockSocket.on.getCalls().find(call => call.args[0] === 'disconnect');
            if (disconnectCall) disconnectHandler = disconnectCall.args[1]; else throw new Error("disconnect handler not found");
        });

        it('on "connect" should attempt rejoin if reconnect info exists', async () => {
            mockStateService.hasReconnectInfo.returns(true);
            mockStateService.getPlayerId.returns('player1');
            mockStateService.getGameId.returns('game1');
            sinon.stub(socketService, '_emitWithAck').resolves({ status: 'ok' }); // Stub the helper

            await connectHandler();

            expect(mockUiService.showReconnectingModal).to.have.been.calledOnce;
            expect(socketService._emitWithAck).to.have.been.calledOnceWith(GAME_EVENTS.RECONNECT, {
                gameId: 'game1', playerId: 'player1'
            });
            expect(mockUiService.showReconnectedMessage).to.have.been.calledOnce;
            socketService._emitWithAck.restore();
        });

        it('on "connect" should handle failed rejoin attempt', async () => { // Simulate a failed rejoin attempt
            mockStateService.hasReconnectInfo.returns(true); // Simulate reconnect info exists
            sinon.stub(socketService, '_emitWithAck').rejects(new Error('Rejoin failed'));

            await connectHandler(); // Simulate connect with rejoin attempt

            expect(mockUiService.showReconnectingModal).to.have.been.calledOnce; // Show reconnecting modal
            expect(mockUiService.showReconnectionFailedModal).to.have.been.calledOnceWith('Rejoin failed'); // Show reconnection failed modal
            socketService._emitWithAck.restore();
        });

        it('on "connect" should handle no reconnect info', async () => { // Simulate a fresh connect without reconnect info
            mockStateService.hasReconnectInfo.returns(false); // Simulate no reconnect info
            await connectHandler(); // Simulate connect without reconnect info
            expect(mockUiService.showReconnectingModal).to.have.been.calledOnce; // Show reconnecting modal
            expect(mockUiService.hideModal).to.have.been.calledOnce; // Hide reconnecting modal
            expect(mockUiService.displayMessage).to.have.been.calledOnceWith("Connected to server.", "success");
        });

        it('on "disconnect" should call uiService.showConnectionLostMessage', () => {
            disconnectHandler('Server unavailable'); // Simulate disconnect with a message
            expect(mockUiService.showConnectionLostMessage).to.have.been.calledOnceWith('Server unavailable');
        });
    });
  });
});
