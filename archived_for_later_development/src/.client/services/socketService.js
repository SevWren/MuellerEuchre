// CONCEPTUAL CLIENT-SIDE CODE
// This file outlines the structure and logic for a client-side service.
// It is not intended to be fully functional UI code, but rather a blueprint
// for how the client might handle game events and state.
// Actual UI rendering and direct DOM manipulation are beyond the scope here.

import { GAME_EVENTS, SUITS } from "../../config/constants.js"; // Assuming shared constants, added SUITS if needed by payloads
import stateServiceInstance from "./stateService.js"; // Import the actual stateService instance
// uiService will be properly injected or imported in a real scenario.
// For now, we'll use the placeholder uiService defined below for the generic error handler.
// This will be replaced by a proper import when uiService.js is also updated.
let uiServicePlaceholder = {
  displayGlobalError: (message) =>
    console.error(
      `[Conceptual uiService Placeholder] GLOBAL ERROR: ${message}`,
    ),
  // Methods below are placeholders from previous task, not directly used by socketService's new error handling logic,
  // but kept to avoid breaking the constructor if it was using them.
  displayAssignedRole: (role) =>
    console.log(
      "[Conceptual uiService Placeholder] displayAssignedRole called with:",
      role,
    ),
  updateLobbyView: (players) =>
    console.log(
      "[Conceptual uiService Placeholder] updateLobbyView called with players:",
      players,
    ),
  displayMessage: (message) =>
    console.log(
      "[Conceptual uiService Placeholder] displayMessage called with:",
      message,
    ),
  showErrorModal: (message) =>
    console.log(
      "[Conceptual uiService Placeholder] showErrorModal called with:",
      message,
    ),
  promptForRejoin: (gameId) =>
    console.log(
      "[Conceptual uiService Placeholder] promptForRejoin called for gameId:",
      gameId,
    ),
};

const DEFAULT_SOCKET_TIMEOUT = 5000; // 5 seconds for acknowledgements

export class SocketService {
  // Export the class
  constructor(
    stateServiceParam = stateServiceInstance,
    uiServiceParam = uiServicePlaceholder,
  ) {
    // Allow injection for testing
    this.socket = {
      // This is a conceptual socket object.
      on: (event, callback) => {
        console.log(
          `[Conceptual Socket] Registered listener for event: ${event}`,
        );
      },
      // emit will be promisified using .timeout()
      emit: (event, data, ack) => {
        console.log(
          `[Conceptual Socket] Raw emit called for event: ${event} with data:`,
          data,
        );
        if (ack) {
          console.log(
            `[Conceptual Socket] Ack callback provided for ${event}. Simulating success.`,
          );
          setTimeout(
            () =>
              ack(null, { status: "ok", message: "Successfully processed." }),
            50,
          ); // Simulate successful ack
          // To simulate an error ack:
          // setTimeout(() => ack({ status: 'error', message: 'Something went wrong on server.'}, null), 50);
        }
      },
      // Add timeout functionality to the conceptual socket
      timeout: function (duration) {
        // Store the original emit
        const originalEmit = this.emit;
        return {
          emit: (event, data, ack) => {
            console.log(
              `[Conceptual Socket with Timeout (${duration}ms)] Emitting event: ${event} with data:`,
              data,
            );
            let timedOut = false;
            const timer = setTimeout(() => {
              timedOut = true;
              // Call ack with an error if it's provided and timeout occurs
              if (ack) {
                ack(
                  new Error(
                    `Timeout: Server did not acknowledge ${event} within ${duration}ms`,
                  ),
                  null,
                );
              }
            }, duration);

            // Use the original emit, but wrap the ack
            originalEmit(event, data, (err, response) => {
              clearTimeout(timer);
              if (!timedOut && ack) {
                ack(err, response);
              }
            });
          },
        };
      },
      connect: () => console.log("[Conceptual Socket] connect() called."),
      disconnect: () => console.log("[Conceptual Socket] disconnect() called."),
    };
    this._id = `conceptual-socket-${Date.now()}`;
    this.stateService = stateServiceParam;
    this.uiService = uiServiceParam; // This will be used for the generic error handler
    this.initializeEventListeners();
  }

  // --- Event Handlers ---
  handleAssignRole({ role, gameId, players, isHost, playerId }) {
    // Assuming server sends playerId
    console.log("[SocketService] Event received:", GAME_EVENTS.ASSIGN_ROLE, {
      role,
      gameId,
      players,
      isHost,
      playerId,
    });
    // Use this.stateService for actual instance methods
    this.stateService.setGameDetails({ gameId, isHost }); // Sets gameId
    this.stateService.setPlayerId(playerId); // Sets playerId for session/reconnection
    this.stateService.setPlayerRole(role); // Sets playerRole for current game context
    this.stateService.updatePlayerList(players);
    // These uiService calls are conceptual and might be handled differently with a real uiService import
    if (this.uiService && this.uiService.displayAssignedRole)
      this.uiService.displayAssignedRole(role);
    if (this.uiService && this.uiService.updateLobbyView)
      this.uiService.updateLobbyView(players);
  }

  handleGameFull({ message }) {
    console.log("[SocketService] Event received:", GAME_EVENTS.GAME_FULL, {
      message,
    });
    if (this.uiService && this.uiService.showErrorModal)
      this.uiService.showErrorModal(message);
  }

  handlePlayerAlreadyInGame({ message, gameId }) {
    console.log(
      "[SocketService] Event received:",
      GAME_EVENTS.PLAYER_ALREADY_IN_GAME,
      { message, gameId },
    );
    if (this.uiService && this.uiService.displayMessage)
      this.uiService.displayMessage(message);
    if (this.uiService && this.uiService.promptForRejoin)
      this.uiService.promptForRejoin(gameId);
  }

  handleGameStateUpdate(newState) {
    console.log(
      "[SocketService] Event received:",
      GAME_EVENTS.STATE_UPDATE,
      newState,
    );
    this.stateService.updateFullGameState(newState);
  }

  // Generic error handler from server
  handleGenericError({ message }) {
    console.error("[SocketService] Generic error from server:", message);
    // Use the uiService instance passed in the constructor
    this.uiService.displayGlobalError(
      message || "An unspecified error occurred on the server.",
    );
  }

  // --- Setup Event Listeners ---
  initializeEventListeners() {
    console.log("[SocketService] Initializing event listeners...");
    this.socket.on(GAME_EVENTS.ASSIGN_ROLE, (data) =>
      this.handleAssignRole(data),
    );
    this.socket.on(GAME_EVENTS.GAME_FULL, (data) => this.handleGameFull(data));
    this.socket.on(GAME_EVENTS.PLAYER_ALREADY_IN_GAME, (data) =>
      this.handlePlayerAlreadyInGame(data),
    );
    this.socket.on(GAME_EVENTS.STATE_UPDATE, (newState) =>
      this.handleGameStateUpdate(newState),
    );
    this.socket.on(GAME_EVENTS.ERROR, (data) => this.handleGenericError(data));

    // Native socket event listeners for reconnection logic
    this.socket.on("connect", async () => {
      console.log(
        "[SocketService] Conceptual connect event: Connected with ID",
        this.socket.id || this._id,
      );
      if (this.uiService.showReconnectingModal)
        this.uiService.showReconnectingModal();

      if (this.stateService.hasReconnectInfo()) {
        const playerId = this.stateService.getPlayerId();
        const gameId = this.stateService.getGameId();
        console.log(
          `[SocketService] Reconnection detected. Attempting to rejoin game ${gameId} as player ${playerId}`,
        );
        try {
          // GAME_EVENTS.RECONNECT is a general purpose event that the server can handle
          // to re-establish the player in their game.
          const response = await this._emitWithAck(GAME_EVENTS.RECONNECT, {
            gameId,
            playerId,
          });
          console.log(
            "[SocketService] Reconnect attempt successful:",
            response,
          );
          // Server should send a STATE_UPDATE upon successful reconnect.
          // If player details (like role) need to be re-confirmed, server might send ASSIGN_ROLE too.
          if (this.uiService.showReconnectedMessage)
            this.uiService.showReconnectedMessage();
          // Potentially, server sends back full game state or specific rejoin confirmation data.
          // stateService might be updated via a subsequent STATE_UPDATE event.
        } catch (error) {
          console.error("[SocketService] Failed to auto-rejoin game:", error);
          if (this.uiService.showReconnectionFailedModal)
            this.uiService.showReconnectionFailedModal(error.message);
          // Clear potentially stale reconnect info if rejoin fails definitively
          // this.stateService.setPlayerId(null); // Or server should guide this
          // this.stateService.setGameDetails({ gameId: null, isHost: false });
        }
      } else {
        console.log(
          "[SocketService] Fresh connection, no reconnect info found.",
        );
        if (this.uiService.hideModal) this.uiService.hideModal(); // Hide reconnecting modal if shown
        // Or display a message like "Connected to server."
        if (this.uiService.displayMessage)
          this.uiService.displayMessage("Connected to server.", "success");
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log(
        "[SocketService] Conceptual disconnect event: Disconnected, reason:",
        reason,
      );
      if (this.uiService.showConnectionLostMessage)
        this.uiService.showConnectionLostMessage(reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error(
        "[SocketService] Conceptual connect_error event:",
        error.message,
      );
      // Potentially call uiService.showConnectionFailedPermanentlyModal() if error indicates no retry
    });
    console.log("[SocketService] Event listeners conceptually initialized.");
  }

  // --- Emitter Methods ---
  // Note: Emitters should now use this.stateService to get gameId, playerRole etc.

  _emitWithAck(event, payload, timeout = DEFAULT_SOCKET_TIMEOUT) {
    return new Promise((resolve, reject) => {
      console.log(`[SocketService] Emitting ${event} with payload:`, payload);
      this.socket.timeout(timeout).emit(event, payload, (err, response) => {
        if (err) {
          // This 'err' could be from timeout or a general socket error from the conceptual socket.emit
          console.error(`[SocketService] Error or Timeout for ${event}:`, err);
          return reject(
            err.message || `Failed to emit ${event}. Network error or timeout.`,
          );
        }
        if (response && response.status === "ok") {
          console.log(`[SocketService] Ack success for ${event}:`, response);
          resolve(response.data || response); // Resolve with data if present, else the whole response
        } else {
          // Error indicated by server acknowledgement
          const errorMessage = response
            ? response.message
            : `Server error for ${event}.`;
          console.error(
            `[SocketService] Ack error for ${event}:`,
            errorMessage,
            response,
          );
          reject(new Error(errorMessage));
        }
      });
    });
  }

  emitOrderUpDecision(passes) {
    const payload = {
      gameId: this.stateService.getGameId(),
      playerRole: this.stateService.getPlayerRole(),
      passes: passes,
    };
    return this._emitWithAck(GAME_EVENTS.ACTION_ORDER_UP_DECISION, payload);
  }

  emitPlayCard(gameId, playerRole, card) {
    const currentრავgameId = gameId || this.stateService.getGameId();
    const currentPlayerRole = playerRole || this.stateService.getPlayerRole();
    const payload = {
      gameId: currentGameId,
      playerRole: currentPlayerRole,
      card,
    };
    return this._emitWithAck(GAME_EVENTS.PLAY_CARD, payload);
  }

  emitDealerDiscard(discardedCard) {
    const payload = {
      gameId: this.stateService.getGameId(),
      playerRole: this.stateService.getPlayerRole(),
      card: discardedCard,
    };
    return this._emitWithAck(GAME_EVENTS.ACTION_DEALER_DISCARD, payload);
  }

  emitCallTrumpDecision(suit, passes) {
    const payload = {
      gameId: this.stateService.getGameId(),
      playerRole: this.stateService.getPlayerRole(),
      suit: passes ? null : suit,
      passes: passes,
    };
    return this._emitWithAck(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION, payload);
  }

  emitGoAloneDecision(goesAlone) {
    const payload = {
      gameId: this.stateService.getGameId(),
      playerRole: this.stateService.getPlayerRole(),
      goesAlone: goesAlone,
    };
    return this._emitWithAck(GAME_EVENTS.ACTION_GO_ALONE_DECISION, payload);
  }

  joinGame(gameId, playerName) {
    const payload = { gameId, playerName };
    // This one might not need gameId/playerRole from stateService if it's pre-connection.
    // Upon successful join, server should emit ASSIGN_ROLE with playerId and gameId.
    return this._emitWithAck(GAME_EVENTS.JOIN_GAME, payload);
  }

  /**
   * Emitter for user-confirmed rejoin attempt.
   * Called after uiService.promptForRejoin confirms.
   */
  emitRejoinGame(gameIdToRejoin) {
    const playerId = this.stateService.getPlayerId();
    if (!playerId) {
      console.error(
        "[SocketService] emitRejoinGame: No playerId found in stateService.",
      );
      return Promise.reject(new Error("Player ID not found. Cannot rejoin."));
    }
    const payload = { gameId: gameIdToRejoin, playerId };
    console.log("[SocketService] Emitting rejoin game confirmation:", payload);
    // Using ACTION_REJOIN_GAME for user-confirmed rejoin.
    // Server should handle this, validate, and send STATE_UPDATE or ASSIGN_ROLE.
    return this._emitWithAck(GAME_EVENTS.ACTION_REJOIN_GAME, payload)
      .then((response) => {
        console.log(
          "[SocketService] Rejoin game confirmed successfully by server:",
          response,
        );
        // Assuming server sends full game state or necessary updates.
        // A STATE_UPDATE event is expected.
        if (this.uiService.showReconnectedMessage)
          this.uiService.showReconnectedMessage();
        return response;
      })
      .catch((error) => {
        console.error(
          "[SocketService] Server failed to process rejoin game confirmation:",
          error,
        );
        if (this.uiService.showReconnectionFailedModal)
          this.uiService.showReconnectionFailedModal(error.message);
        throw error; // Re-throw for uiService to potentially handle further
      });
  }

  connect() {
    this.socket.connect();
  }
}

// Create a single instance of SocketService, injecting the stateService instance
const socketServiceInstance = new SocketService(
  stateServiceInstance,
  uiServicePlaceholder,
); // Ensure uiServicePlaceholder is passed if constructor expects it
export { socketServiceInstance }; // Export instance as named export
export default socketServiceInstance; // Keep default export for existing app usage

// Conceptual Unit Test for emitPlayCard (already added in previous task, shown for context):
// it('should emit PLAY_CARD with the correct payload', () => { ... });

// Conceptual Unit Test for handleGameStateUpdate:
// it('should call stateService.updateFullGameState with received state', () => {
//   const mockStateService = { updateFullGameState: sinon.spy() };
//   const service = new SocketService(mockStateService, uiServicePlaceholder); // Inject mock
//   const newState = { phase: 'playing', turn: 'player2' };
//   service.handleGameStateUpdate(newState);
//   expect(mockStateService.updateFullGameState).to.have.been.calledOnceWith(newState);
// });

// Conceptual Unit Test for initializeEventListeners wiring:
// it('should register a handler for GAME_EVENTS.STATE_UPDATE', () => {
//   const mockSocket = { on: sinon.spy(), emit: () => {}, timeout: function() { return this; } };
//   const service = new SocketService(stateServiceInstance, uiServicePlaceholder);
//   service.socket = mockSocket; // Override socket with mock
//   service.initializeEventListeners(); // Re-initialize with mock socket
//   expect(mockSocket.on).to.have.been.calledWith(GAME_EVENTS.STATE_UPDATE, sinon.match.func);
// });

// --- Conceptual Unit Tests for Error Handling (Task 1) ---

// describe('SocketService Emitter Error Handling', () => {
//   let service;
//   let mockSocket;
//   let mockStateService;
//   let mockUiService;

//   beforeEach(() => {
//     mockStateService = {
//       getGameId: () => 'testGame123',
//       getPlayerRole: () => 'player1',
//     };
//     mockUiService = { // Mock the actual uiService methods if needed for other tests
//        displayGlobalError: sinon.spy(),
//     };
//     mockSocket = {
//       on: sinon.spy(),
//       emit: sinon.stub(), // This will be the "original" emit for the timeout wrapper
//       timeout: function(duration) {
//         // Return an object that has an emit method, which is what timeout(duration).emit would do
//         return {
//           emit: (event, data, ack) => {
//             // Simulate different scenarios based on the event or data for testing
//             if (event === 'test_event_success') {
//               setTimeout(() => ack(null, { status: 'ok', data: { info: 'Success!' } }), 10);
//             } else if (event === 'test_event_error_ack') {
//               setTimeout(() => ack(null, { status: 'error', message: 'Server error response' }), 10);
//             } else if (event === 'test_event_network_error') {
//               setTimeout(() => ack(new Error('Network issue'), null), 10);
//             } else if (event === 'test_event_timeout') {
//               // Do nothing to simulate timeout; the wrapper should handle it
//             } else { // Default success for other events
//                setTimeout(() => ack(null, { status: 'ok', data: {} }), 10);
//             }
//           }
//         };
//       },
//       connect: sinon.spy(),
//       disconnect: sinon.spy(),
//     };

//     service = new SocketService(mockStateService, mockUiService);
//     service.socket = mockSocket; // Replace conceptual socket with mock
//   });

//   it('emitter methods should return a Promise', () => {
//     const promise = service.emitOrderUpDecision(true);
//     expect(promise).to.be.a('promise');
//     // Clean up to prevent state leakage if tests run in parallel or have side effects
//     return promise.catch(() => {}); // Handle rejection if the default mock causes one
//   });

//   it('Promise should resolve on successful acknowledgement', async () => {
//     // For this test, we need the mockSocket's timeout().emit() to call the ack with success
//     // We'll use a specific event name that our mock is set up to treat as successful.
//     // This requires a bit more direct control over the mock, or making _emitWithAck more flexible for testing.
//     // Let's assume _emitWithAck is called with 'test_event_success' by an emitter.
//     // A simpler way: spy on _emitWithAck and make it return a resolved promise.
//     // However, to test the actual logic of _emitWithAck:
//     const testPayload = { test: 'data' };
//     const promise = service._emitWithAck('test_event_success', testPayload);
//     const result = await promise;
//     expect(result).to.deep.equal({ info: 'Success!' });
//   });

//   it('Promise should reject on error acknowledgement', async () => {
//     try {
//       await service._emitWithAck('test_event_error_ack', {});
//       // Should not reach here
//       expect.fail('Promise should have rejected on error acknowledgement.');
//     } catch (error) {
//       expect(error).to.be.an('error');
//       expect(error.message).to.equal('Server error response');
//     }
//   });

//   it('Promise should reject on network error (simulated by err in ack)', async () => {
//     try {
//       await service._emitWithAck('test_event_network_error', {});
//       expect.fail('Promise should have rejected on network error.');
//     } catch (error) {
//       expect(error).to.be.an('error');
//       expect(error.message).to.equal('Failed to emit test_event_network_error. Network error or timeout.');
//     }
//   });

//   it('Promise should reject on timeout', async () => {
//     // For timeout, the mock for timeout().emit should not call the ack callback for 'test_event_timeout'
//     try {
//       await service._emitWithAck('test_event_timeout', {}, 100); // Use a short timeout for the test
//       expect.fail('Promise should have rejected on timeout.');
//     } catch (error) {
//       expect(error).to.be.an('error');
//       // The exact message depends on how the conceptual timeout is implemented.
//       // Based on the new implementation:
//       expect(error.message).to.include('Timeout: Server did not acknowledge test_event_timeout');
//     }
//   });

//   it('GAME_EVENTS.ERROR listener should call uiService.displayGlobalError', () => {
//     // Manually simulate the event being triggered
//     // First, get the callback registered for GAME_EVENTS.ERROR
//     service.initializeEventListeners(); // Ensure listeners are initialized
//     const errorCallback = mockSocket.on.getCalls().find(call => call.args[0] === GAME_EVENTS.ERROR).args[1];
//     expect(errorCallback).to.be.a('function');

//     const testErrorMessage = { message: 'Server database crashed' };
//     errorCallback(testErrorMessage);
//     expect(mockUiService.displayGlobalError).to.have.been.calledOnceWith(testErrorMessage.message);
//   });
// });

// --- Conceptual Unit Tests for Reconnection Logic (Task 2) ---

// describe('SocketService Reconnection Handling', () => {
//   let service;
//   let mockSocket;
//   let mockStateService;
//   let mockUiService;

//   beforeEach(() => {
//     mockStateService = {
//       hasReconnectInfo: sinon.stub(),
//       getPlayerId: sinon.stub().returns('playerTest123'),
//       getGameId: sinon.stub().returns('gameTest456'),
//       setPlayerId: sinon.spy(), // To check if it's cleared on failed rejoin
//       setGameDetails: sinon.spy(), // To check if it's cleared on failed rejoin
//       // Assume other stateService methods are not directly relevant here or work as expected
//     };
//     mockUiService = {
//       promptForRejoin: sinon.spy(),
//       showConnectionLostMessage: sinon.spy(),
//       showReconnectingModal: sinon.spy(),
//       showReconnectedMessage: sinon.spy(),
//       showReconnectionFailedModal: sinon.spy(),
//       hideModal: sinon.spy(),
//       displayMessage: sinon.spy(),
//       // displayGlobalError is part of error handling tests
//     };
//     // Mock the socket object itself, including on, emit, timeout
//     mockSocket = {
//       on: sinon.spy(),
//       emit: sinon.stub(), // This is the "original" emit for the timeout wrapper
//       timeout: function(duration) { return { emit: this.emit }; }, // Simplified timeout chain
//       connect: sinon.spy(),
//       disconnect: sinon.spy(),
//     };

//     // Instantiate service with mocks
//     service = new SocketService(mockStateService, mockUiService);
//     service.socket = mockSocket; // Override the conceptual socket
//     // We need to manually get the 'connect' and 'disconnect' handlers
//     // because initializeEventListeners is called in constructor with the *conceptual* socket.
//     // For a real test, you'd spy on the conceptual socket's 'on' method or initialize after mocking.
//     // For this conceptual test, we'll assume the handlers are correctly registered.
//   });

//   afterEach(() => {
//     sinon.restore();
//   });

//   it('handleAssignRole should call stateService.setPlayerId with playerId from payload', () => {
//     const payload = { role: 'south', gameId: 'g1', players: [], isHost: true, playerId: 'p123' };
//     service.handleAssignRole(payload);
//     expect(mockStateService.setPlayerId).to.have.been.calledOnceWith('p123');
//     expect(mockStateService.setGameDetails).to.have.been.calledOnceWith({ gameId: 'g1', isHost: true });
//     expect(mockStateService.setPlayerRole).to.have.been.calledOnceWith('south');
//   });

//   it('GAME_EVENTS.PLAYER_ALREADY_IN_GAME listener should call uiService.promptForRejoin', () => {
//     // Simulate event callback registration then invocation
//     const playerAlreadyInGameCallback = mockSocket.on.getCalls().find(call => call.args[0] === GAME_EVENTS.PLAYER_ALREADY_IN_GAME).args[1];
//     const data = { message: "You are in this game.", gameId: "gameTest789" };
//     playerAlreadyInGameCallback(data);
//     expect(mockUiService.promptForRejoin).to.have.been.calledOnceWith("gameTest789");
//   });

//   it('socket "disconnect" event should call uiService.showConnectionLostMessage', () => {
//     const disconnectCallback = mockSocket.on.getCalls().find(call => call.args[0] === 'disconnect').args[1];
//     disconnectCallback('server unavailable');
//     expect(mockUiService.showConnectionLostMessage).to.have.been.calledOnceWith('server unavailable');
//   });

//   describe('socket "connect" event', () => {
//     let connectCallback;
//     beforeEach(() => {
//         // Get the registered 'connect' callback
//         const call = mockSocket.on.getCalls().find(c => c.args[0] === 'connect');
//         if (!call) throw new Error('Connect handler not registered by spy');
//         connectCallback = call.args[1];
//     });

//     it('should call uiService.showReconnectingModal', async () => {
//       mockStateService.hasReconnectInfo.returns(false); // No reconnect attempt
//       await connectCallback();
//       expect(mockUiService.showReconnectingModal).to.have.been.calledOnce;
//     });

//     it('if hasReconnectInfo is true, should emit RECONNECT and handle success', async () => {
//       mockStateService.hasReconnectInfo.returns(true);
//       mockSocket.emit.callsFake((event, payload, ack) => { // Make this specific emit call succeed
//         if (event === GAME_EVENTS.RECONNECT) {
//           ack(null, { status: 'ok', data: { message: 'Reconnected!' } });
//         }
//       });
//       await connectCallback();
//       expect(mockSocket.emit).to.have.been.calledWith(GAME_EVENTS.RECONNECT, {
//         gameId: 'gameTest456',
//         playerId: 'playerTest123'
//       }, sinon.match.func);
//       expect(mockUiService.showReconnectedMessage).to.have.been.calledOnce;
//       expect(mockUiService.showReconnectionFailedModal).to.not.have.been.called;
//     });

//     it('if hasReconnectInfo is true, should emit RECONNECT and handle failure', async () => {
//       mockStateService.hasReconnectInfo.returns(true);
//       const failureMsg = 'Could not rejoin';
//       mockSocket.emit.callsFake((event, payload, ack) => { // Make this specific emit call fail
//         if (event === GAME_EVENTS.RECONNECT) {
//           ack(new Error(failureMsg)); // Simulate network error or timeout error object
//         }
//       });
//       await connectCallback();
//       expect(mockSocket.emit).to.have.been.calledWith(GAME_EVENTS.RECONNECT, sinon.match.object, sinon.match.func);
//       expect(mockUiService.showReconnectionFailedModal).to.have.been.calledOnceWith(sinon.match(failureMsg));
//       expect(mockUiService.showReconnectedMessage).to.not.have.been.called;
//     });

//     it('if hasReconnectInfo is false, should call uiService.hideModal and display connected message', async () => {
//       mockStateService.hasReconnectInfo.returns(false);
//       await connectCallback();
//       expect(mockSocket.emit).to.not.have.been.calledWith(GAME_EVENTS.RECONNECT, sinon.match.any, sinon.match.any);
//       expect(mockUiService.hideModal).to.have.been.calledOnce;
//       expect(mockUiService.displayMessage).to.have.been.calledOnceWith("Connected to server.", "success");
//     });
//   });

//   describe('emitRejoinGame', () => {
//     it('should emit ACTION_REJOIN_GAME with correct payload and handle success', async () => {
//       mockStateService.getPlayerId.returns('playerRejoinTest');
//       mockSocket.emit.callsFake((event, payload, ack) => {
//         if (event === GAME_EVENTS.ACTION_REJOIN_GAME) {
//           ack(null, { status: 'ok', data: { message: 'Rejoined successfully' } });
//         }
//       });

//       await service.emitRejoinGame('gameToRejoin123');

//       expect(mockSocket.emit).to.have.been.calledOnceWith(GAME_EVENTS.ACTION_REJOIN_GAME, {
//         gameId: 'gameToRejoin123',
//         playerId: 'playerRejoinTest'
//       }, sinon.match.func);
//       expect(mockUiService.showReconnectedMessage).to.have.been.calledOnce;
//       expect(mockUiService.showReconnectionFailedModal).to.not.have.been.called;
//     });

//     it('should handle error if playerId is not found in stateService', async () => {
//       mockStateService.getPlayerId.returns(null);
//       try {
//         await service.emitRejoinGame('gameToRejoin456');
//         expect.fail('Should have rejected because playerId is null');
//       } catch (error) {
//         expect(error.message).to.equal('Player ID not found. Cannot rejoin.');
//         expect(mockSocket.emit).to.not.have.been.called;
//       }
//     });

//     it('should handle server error acknowledgement for ACTION_REJOIN_GAME', async () => {
//       mockStateService.getPlayerId.returns('playerRejoinTest');
//       const serverErrorMsg = 'Game is full or ended.';
//       mockSocket.emit.callsFake((event, payload, ack) => {
//         if (event === GAME_EVENTS.ACTION_REJOIN_GAME) {
//           ack(null, { status: 'error', message: serverErrorMsg }); // Error ack
//         }
//       });
//       try {
//         await service.emitRejoinGame('gameToRejoin789');
//         expect.fail('Should have rejected due to server error ack');
//       } catch (error) {
//         expect(error.message).to.equal(serverErrorMsg);
//         expect(mockUiService.showReconnectionFailedModal).to.have.been.calledOnceWith(serverErrorMsg);
//         expect(mockUiService.showReconnectedMessage).to.not.have.been.called;
//       }
//     });
//   });
// });
