// CONCEPTUAL CLIENT-SIDE CODE
// This file outlines the structure and logic for a client-side service.
// It is not intended to be fully functional UI code, but rather a blueprint
// for how the client might handle game events and state.
// Actual UI rendering and direct DOM manipulation are beyond the scope here.

import { SUITS, GAME_PHASES } from "../../config/constants.js"; // For SUITS.HEARTS etc. & GAME_PHASES
import stateServiceInstance from "./stateService.js"; // Import the actual stateService instance
import socketServiceInstance from "./socketService.js"; // Import the actual socketService instance

// The global/mock stateService and socketService objects defined previously are illustrative
// but the UiService class will now use the imported singleton instances by default.

export class UiService {
  // Export the class
  constructor(
    stateServiceParam = stateServiceInstance,
    socketServiceParam = socketServiceInstance,
  ) {
    this.stateService = stateServiceParam;
    this.socketService = socketServiceParam; // socketServiceInstance will be the updated one
    console.log(
      "[Conceptual UiService] Initialized with injected/imported service instances.",
    );

    // Conceptual: In a real UI framework (React, Vue, Angular, Svelte, etc.),
    // components or a UI coordinator would subscribe to stateService to trigger re-renders.
    // This subscription ensures that the UI automatically reflects changes in the game state.
    // Example of how a top-level UI component or service might subscribe:
    //
    // this.unsubscribeStateChanges = this.stateService.subscribe((newState) => {
    //   console.log('[Conceptual UiService] Received state update via subscription:', newState);
    //   // This callback would trigger a re-render of the application's UI.
    //   // For example, if using a component-based framework:
    //   // this.renderAllUIComponents(newState);
    //
    //   // The individual display methods below (displayPlayerHand, displayTurnCard, etc.)
    //   // would then be called as part of this re-render process, or their respective
    //   // components would update, automatically using the fresh data from stateService.
    //   this.displayPlayerHand(); // Example of a direct call, though typically part of component logic
    //   this.displayTurnCard();   // Example
    // });
    // console.log('[Conceptual UiService] Conceptually subscribed to stateService for UI updates.');
    // To prevent memory leaks, this subscription should be cleaned up when uiService is destroyed:
    // e.g., in a cleanup method: if (this.unsubscribeStateChanges) this.unsubscribeStateChanges();
  }

  displayAssignedRole(role) {
    console.log(`[Conceptual UiService] Displaying assigned role: ${role}`);
  }

  updateLobbyView(players) {
    console.log("[Conceptual UiService] Updating lobby view with players:");
    (players || []).forEach((player) => {
      console.log(
        `  - Player: ${player.name || player.role}, Role: ${player.role}, Connected: ${player.isConnected ? "Yes" : "No"}`,
      );
    });
  }

  displayMessage(message, type = "info") {
    // Added type for styling (info, error, success)
    // In a real UI, this might change the color or icon of the message.
    console.log(
      `[Conceptual UiService] Displaying message (type: ${type}): "${message}"`,
    );
  }

  // Refined showErrorModal to be more specific for action errors.
  showErrorModal(message, title = "Error") {
    // This could be a dedicated modal for critical errors.
    console.error(
      `[Conceptual UiService] Showing error modal (title: ${title}): "${message}"`,
    );
    // For example, a pop-up: alert(`[${title}] ${message}`);
  }

  // New method for global, non-action-specific errors (e.g., from server GAME_EVENTS.ERROR)
  displayGlobalError(message) {
    console.error(
      `[Conceptual UiService] Displaying GLOBAL error: "${message}"`,
    );
    // This might be a banner at the top of the page or a toast notification.
    // For instance, it could call displayMessage with type 'error'.
    this.displayMessage(`Global Error: ${message}`, "error");
  }

  promptForRejoin(gameId) {
    console.log(
      `[Conceptual UiService] Displaying prompt for rejoining game ID: ${gameId}.`,
    );
    // Conceptual: In a real UI, this would be a modal with "Yes" / "No" buttons.
    // Simulate user confirming "Yes" to rejoin.
    const userConfirmsRejoin = true; // Simulate user clicking "Yes"

    if (userConfirmsRejoin) {
      console.log(
        `[Conceptual UiService] User confirmed rejoin for game ${gameId}. Calling socketService.emitRejoinGame.`,
      );
      this.showSpinner(`Rejoining game ${gameId}...`);
      this.socketService
        .emitRejoinGame(gameId)
        .then(() => {
          this.hideSpinner();
          // showReconnectedMessage is likely called by socketService itself on successful ack,
          // but we can also reinforce it here or handle UI state specific to rejoining.
          this.displayMessage(
            `Successfully requested to rejoin game ${gameId}. Waiting for server update...`,
            "success",
          );
        })
        .catch((error) => {
          this.hideSpinner();
          // showErrorModal is likely called by socketService itself on error ack,
          // but we can provide additional context or fallback here.
          this.showErrorModal(
            `Failed to rejoin game ${gameId}: ${error.message || "Server error"}. You might need to join as a new player.`,
            "Rejoin Failed",
          );
        });
    } else {
      console.log(
        `[Conceptual UiService] User declined to rejoin game ${gameId}.`,
      );
      this.displayMessage(
        "Okay, not rejoining. You can start or join a new game.",
        "info",
      );
      // Potentially navigate to lobby or main menu.
      this.navigateTo("lobby");
    }
  }

  showConnectionLostMessage(reason = "Connection to server lost.") {
    console.warn(
      `[Conceptual UiService] Displaying connection lost message: "${reason} Attempting to reconnect..."`,
    );
    // This should be a non-modal, persistent message (e.g., a banner).
    // It might also trigger a visual indicator like a "connecting" spinner globally.
    this.displayMessage(`${reason} Attempting to reconnect...`, "error"); // Use displayMessage for a banner-like message
  }

  showReconnectingModal(message = "Reconnecting to server...") {
    console.log(
      `[Conceptual UiService] Displaying reconnecting modal: "${message}"`,
    );
    // This should be a blocking modal to prevent actions while auto-reconnecting.
    this.showSpinner(message); // Use spinner as a full-screen modal concept
  }

  showReconnectedMessage(message = "Successfully reconnected!") {
    console.log(
      `[Conceptual UiService] Displaying reconnected message: "${message}"`,
    );
    this.hideSpinner(); // Hide any reconnecting modal/spinner
    this.displayMessage(message, "success");
    // Potentially hide any persistent "connection lost" banners.
  }

  showReconnectionFailedModal(reason = "Failed to reconnect.") {
    console.error(
      `[Conceptual UiService] Displaying reconnection failed modal: "${reason} Please check your internet connection or try joining again."`,
    );
    this.hideSpinner(); // Hide any reconnecting modal/spinner
    this.showErrorModal(
      `${reason} Please check your internet connection or try joining again. You may need to start a new game.`,
      "Reconnection Failed",
    );
    // Offer options like "Try Again" (manual reconnect) or "Go to Lobby".
  }

  // Helper to hide generic modals if one is shown by showReconnectingModal
  hideModal() {
    console.log("[Conceptual UiService] Hiding generic modal (e.g., spinner).");
    this.hideSpinner();
  }

  // --- UI Update Methods for Core Game Info (from Task 3) ---
  displayPlayerHand() {
    const hand = this.stateService.getPlayerHand(); // Fetches fresh data from the injected stateService
    console.log(
      "[UiService - Conceptual] Displaying Player Hand:",
      hand
        ? hand.map((c) => `${c.rank} of ${c.suit}`).join(", ")
        : "No hand found",
    );
  }

  displayTurnCard() {
    const turnCard = this.stateService.getTurnCard(); // Fetches fresh data
    if (turnCard) {
      console.log(
        `[UiService - Conceptual] Displaying Turn Card: ${turnCard.rank} of ${turnCard.suit}`,
      );
    } else {
      console.log("[UiService - Conceptual] No Turn Card to display.");
    }
  }

  displayCurrentTrick() {
    const currentTrick = this.stateService.getCurrentTrick(); // Fetches fresh data
    console.log("[UiService - Conceptual] Displaying Current Trick:");
    if (currentTrick && currentTrick.length > 0) {
      currentTrick.forEach((play) => {
        console.log(
          `  - ${play.playedBy} played: ${play.rank} of ${play.suit}`,
        );
      });
    } else {
      console.log("  - No cards in current trick.");
    }
  }

  displayTeamScores() {
    const scores = this.stateService.getTeamScores(); // Fetches fresh data
    if (scores) {
      console.log("[UiService - Conceptual] Displaying Team Scores:");
      for (const team in scores) {
        console.log(`  - Team ${team}: ${scores[team]}`);
      }
    } else {
      console.log("[UiService - Conceptual] No team scores to display.");
    }
  }

  displayGameMessages() {
    const message = this.stateService.getLatestGameMessage(); // Fetches fresh data
    console.log(
      `[UiService - Conceptual] Displaying Game Message: "${message || "No new messages."}"`,
    );
  }

  // --- UI Interaction Logic Methods for Bidding (Task 4) ---
  // These methods use the injected socketService to send messages.
  // They also use stateService (injected) to get current game context if needed.
  promptOrderUp(passesDecision) {
    // Parameterized for testing/simulation
    console.log(
      `[UiService - Conceptual] User decided to pass on ordering up: ${passesDecision}.`,
    );
    this.showSpinner("Submitting your decision...");
    return this.socketService
      .emitOrderUpDecision(passesDecision) // Added return
      .then((response) => {
        this.hideSpinner();
        this.displayMessage("Decision submitted successfully.", "success");
        console.log("[UiService] Order up decision ack:", response);
        // UI would update based on new game state from server
        return response; // Propagate response
      })
      .catch((error) => {
        this.hideSpinner();
        console.error("[UiService] Failed to submit order up decision:", error);
        this.showErrorModal(
          `Failed to submit decision: ${error.message || "Server error"}. Please try again.`,
          "Order Up Failed",
        );
        throw error; // Re-throw
      });
  }

  promptDealerDiscard(cardToDiscard) {
    // Parameterized
    const hand = this.stateService.getPlayerHand(); // Still useful for context or pre-validation
    if (!hand || hand.length === 0) {
      console.error(
        "[UiService - Conceptual] promptDealerDiscard: No hand to discard from.",
      );
      this.showErrorModal("Cannot discard, no hand found.", "Discard Error");
      return;
    }
    if (!cardToDiscard) {
      console.error(
        "[UiService - Conceptual] promptDealerDiscard: No card provided to discard.",
      );
      this.showErrorModal("No card selected to discard.", "Discard Error");
      return;
    }
    console.log(
      "[UiService - Conceptual] Dealer selected card for discard:",
      cardToDiscard,
    );
    this.showSpinner("Discarding card...");
    return this.socketService
      .emitDealerDiscard(cardToDiscard) // Added return
      .then((response) => {
        this.hideSpinner();
        this.displayMessage("Card discarded successfully.", "success");
        console.log("[UiService] Dealer discard ack:", response);
        return response;
      })
      .catch((error) => {
        this.hideSpinner();
        console.error("[UiService] Failed to discard card:", error);
        this.showErrorModal(
          `Failed to discard card: ${error.message || "Server error"}.`,
          "Discard Failed",
        );
        throw error;
      });
  }

  promptCallTrump(suit, passesDecision) {
    // Parameterized
    console.log(
      `[UiService - Conceptual] User decided on trump call. Suit: ${suit}, Passes: ${passesDecision}`,
    );
    this.showSpinner("Submitting trump call...");
    return this.socketService
      .emitCallTrumpDecision(suit, passesDecision) // Added return
      .then((response) => {
        this.hideSpinner();
        this.displayMessage("Trump call submitted successfully.", "success");
        console.log("[UiService] Call trump decision ack:", response);
        return response;
      })
      .catch((error) => {
        this.hideSpinner();
        console.error("[UiService] Failed to submit trump call:", error);
        this.showErrorModal(
          `Failed to submit trump call: ${error.message || "Server error"}.`,
          "Call Trump Failed",
        );
        throw error;
      });
  }

  promptGoAlone(goesAloneDecision) {
    // Parameterized
    const playerRole = this.stateService.getPlayerRole();
    const maker = this.stateService.getMaker();

    if (playerRole !== maker) {
      console.log(
        '[UiService - Conceptual] Not the maker, cannot prompt for "Go Alone". Player role:',
        playerRole,
        "Maker:",
        maker,
      );
      this.showErrorModal(
        "Only the maker can decide to go alone.",
        "Action Not Allowed",
      );
      return;
    }
    console.log(
      `[UiService - Conceptual] Maker chose to go alone: ${goesAloneDecision}`,
    );
    this.showSpinner('Submitting "go alone" decision...');
    return this.socketService
      .emitGoAloneDecision(goesAloneDecision) // Added return
      .then((response) => {
        this.hideSpinner();
        this.displayMessage('"Go alone" decision submitted.', "success");
        console.log("[UiService] Go alone decision ack:", response);
        return response;
      })
      .catch((error) => {
        this.hideSpinner();
        console.error(
          '[UiService] Failed to submit "go alone" decision:',
          error,
        );
        this.showErrorModal(
          `Failed to submit "go alone" decision: ${error.message || "Server error"}.`,
          "Go Alone Failed",
        );
        throw error;
      });
  }

  handlePlayCardSelection(card) {
    console.log(
      "[UiService - Conceptual] Handling play card selection for card:",
      card ? card.id : "undefined",
    );
    if (
      !card ||
      typeof card.suit !== "string" ||
      typeof card.rank !== "string" ||
      typeof card.id !== "string"
    ) {
      console.error(
        "[UiService - Conceptual] Invalid card object provided for playing:",
        card,
      );
      this.showErrorModal(
        "Invalid card selected. Card data is incomplete. Please try again.",
        "Play Card Error",
      );
      return Promise.reject(new Error("Invalid card object")); // Return a rejected promise for consistency
    }

    this.showSpinner("Playing card...");
    // socketService.emitPlayCard is designed to get gameId/playerRole from stateService
    return this.socketService
      .emitPlayCard(null, null, card) // Added return
      .then((response) => {
        this.hideSpinner();
        // Immediate feedback, though UI will primarily update via game state.
        this.displayMessage(
          `You played ${card.rank} of ${card.suit}. Waiting for other players...`,
          "success",
        );
        console.log("[UiService] Play card ack:", response);
        return response;
      })
      .catch((error) => {
        this.hideSpinner();
        console.error("[UiService] Failed to play card:", error);
        this.showErrorModal(
          `Failed to play card: ${error.message || "Server error"}. Please try again.`,
          "Play Card Failed",
        );
        throw error;
      });
  }

  // --- Other conceptual UI update methods ---
  showSpinner(message = "Loading...") {
    console.log(`[Conceptual UiService] Show spinner: ${message}`);
  }

  hideSpinner() {
    console.log("[Conceptual UiService] Hide spinner");
  }

  navigateTo(viewName) {
    console.log(`[Conceptual UiService] Navigating to view: ${viewName}`);
  }

  // --- UI Element Contextual State (Task 3 - Client) ---

  /**
   * Determines the state of bidding controls (e.g., Order Up, Pass, Call Trump).
   * @returns {object} Object like { visible: boolean, enabled: boolean, specificActions: {} }
   */
  getBiddingControlsState() {
    const playerRole = this.stateService.getPlayerRole(); // Role of this client's player
    const currentPlayer = this.stateService.gameState?.currentPlayer; // Player whose turn it is
    const gamePhase = this.stateService.gameState?.phase;

    const isActivePlayer =
      playerRole && currentPlayer && playerRole === currentPlayer;
    const isBiddingPhase =
      gamePhase === GAME_PHASES.ORDER_UP_ROUND1 ||
      gamePhase === GAME_PHASES.ORDER_UP_ROUND2; // Assuming ORDER_UP_ROUND2 is for calling trump

    const controlsState = {
      visible: isActivePlayer && isBiddingPhase,
      enabled: isActivePlayer && isBiddingPhase,
      // Further conceptual breakdown for specific buttons:
      canOrderUp: gamePhase === GAME_PHASES.ORDER_UP_ROUND1,
      canCallTrump: gamePhase === GAME_PHASES.ORDER_UP_ROUND2,
      // canPass: isBiddingPhase, // Always possible if bidding controls are active
      // isDealer: playerRole === this.stateService.gameState?.dealer, // For "pick it up" as dealer
    };

    console.log(
      "[UiService - Conceptual] Bidding controls state:",
      controlsState,
    );
    return controlsState;
  }

  /**
   * Determines the state of "Go Alone" controls.
   * @returns {object} Object like { visible: boolean, enabled: boolean }
   */
  getGoAloneControlsState() {
    const playerRole = this.stateService.getPlayerRole();
    const maker = this.stateService.gameState?.maker;
    const gamePhase = this.stateService.gameState?.phase;

    const isActivePlayerAndMaker = playerRole && maker && playerRole === maker;
    const isGoAlonePhase = gamePhase === GAME_PHASES.GOING_ALONE;

    const controlsState = {
      visible: isActivePlayerAndMaker && isGoAlonePhase,
      enabled: isActivePlayerAndMaker && isGoAlonePhase,
    };

    console.log(
      "[UiService - Conceptual] Go Alone controls state:",
      controlsState,
    );
    return controlsState;
  }

  /**
   * Determines if the current player can play cards and if a specific card is playable.
   * @param {object} card - The card object to check playability for (optional).
   * @returns {object} Object like { canPlay: boolean, isCardPlayable: boolean, message: string }
   */
  getCardPlayabilityState(card = null) {
    const playerRole = this.stateService.getPlayerRole();
    const currentPlayer = this.stateService.gameState?.currentPlayer;
    const gamePhase = this.stateService.gameState?.phase;

    const isPlayerTurn =
      playerRole && currentPlayer && playerRole === currentPlayer;
    const isPlayingPhase = gamePhase === GAME_PHASES.PLAYING;

    let cardPlayable = true;
    let message = "";

    if (card) {
      // Conceptual: Add more detailed rule checks here
      // e.g., if (!this.isValidPlay(card, this.stateService.getPlayerHand(), this.stateService.getCurrentTrick(), this.stateService.gameState.trumpSuit)) {
      //   cardPlayable = false;
      //   message = 'Must follow suit if possible.';
      // }
      if (!isPlayerTurn || !isPlayingPhase) {
        cardPlayable = false;
        message = isPlayerTurn
          ? "Not the playing phase."
          : "Not your turn to play.";
      } else {
        // Simple check: card must be in hand (actual hand check would be more robust)
        const playerHand = this.stateService.getPlayerHand() || [];
        if (!playerHand.find((c) => c.id === card.id)) {
          cardPlayable = false;
          message = "Card not in hand.";
        }
        // Add comment about "must follow suit" rule
        // console.log('[UiService - Conceptual] TODO: Implement "must follow suit" logic for card playability.');
      }
    }

    const playSurfaceState = {
      canPlayOnSurface: isPlayerTurn && isPlayingPhase, // General ability to play any card
      isCardPlayable: card ? cardPlayable : isPlayerTurn && isPlayingPhase, // Playability of a specific card or generally
      message: message,
    };

    console.log(
      "[UiService - Conceptual] Card Playability/Play Surface state for card",
      card ? card.id : "(general)",
      ":",
      playSurfaceState,
    );
    return playSurfaceState;
  }

  /**
   * Determines the state of the "Request New Game" button.
   * @returns {object} Object like { visible: boolean, enabled: boolean }
   */
  getRequestNewGameButtonState() {
    const gamePhase = this.stateService.gameState?.phase;
    const isGameOver = gamePhase === GAME_PHASES.GAME_OVER;

    const controlsState = {
      visible: isGameOver,
      enabled: isGameOver,
    };

    console.log(
      "[UiService - Conceptual] Request New Game button state:",
      controlsState,
    );
    return controlsState;
  }
}

const uiServiceInstance = new UiService(
  stateServiceInstance,
  socketServiceInstance,
); // Pass instances if constructor expects them
export { uiServiceInstance }; // Export instance as named export
export default uiServiceInstance; // Keep default export for existing app usage

// --- Conceptual Unit Tests for UI Element Contextual State ---

// Conceptual Unit Test for getBiddingControlsState:
// it('should return active for bidding controls if current player and ORDER_UP_ROUND1 phase', () => {
//   const mockState = {
//     playerRole: 'player1',
//     gameState: { currentPlayer: 'player1', phase: GAME_PHASES.ORDER_UP_ROUND1 }
//   };
//   const mockStateService = {
//     getPlayerRole: () => mockState.playerRole,
//     gameState: mockState.gameState,
//   };
//   const service = new UiService(mockStateService, null); // socketService mock not needed for this one
//   const controlsState = service.getBiddingControlsState();
//   expect(controlsState.visible).to.be.true;
//   expect(controlsState.enabled).to.be.true;
//   expect(controlsState.canOrderUp).to.be.true;
// });

// it('should return inactive for bidding controls if not current player', () => {
//   const mockState = {
//     playerRole: 'player1',
//     gameState: { currentPlayer: 'player2', phase: GAME_PHASES.ORDER_UP_ROUND1 }
//   };
//   const mockStateService = {
//     getPlayerRole: () => mockState.playerRole,
//     gameState: mockState.gameState,
//   };
//   const service = new UiService(mockStateService, null); // socketService mock not needed for this one
//   const service = new UiService(mockStateService, null); // socketService mock not needed for this one
//   const controlsState = service.getBiddingControlsState();
//   expect(controlsState.visible).to.be.false;
// });

// it('should return inactive for bidding controls if not in a bidding phase', () => {
//   const mockState = {
//     playerRole: 'player1',
//     gameState: { currentPlayer: 'player1', phase: GAME_PHASES.PLAYING }
//   };
//   const mockStateService = {
//     getPlayerRole: () => mockState.playerRole,
//     gameState: mockState.gameState,
//   };
//   const service = new UiService(mockStateService, null);
//   const controlsState = service.getBiddingControlsState();
//   expect(controlsState.visible).to.be.false;
// });

// Conceptual Unit Test for getGoAloneControlsState:
// it('should return active for go alone controls if current player is maker and GOING_ALONE phase', () => {
//   const mockState = {
//     playerRole: 'player1',
//     gameState: { maker: 'player1', phase: GAME_PHASES.GOING_ALONE }
//   };
//   const mockStateService = {
//     getPlayerRole: () => mockState.playerRole,
//     gameState: mockState.gameState,
//   };
//   const service = new UiService(mockStateService, null); // socketService mock not needed
//   const controlsState = service.getGoAloneControlsState();
//   expect(controlsState.visible).to.be.true;
// });

// it('should return inactive for go alone controls if current player is not maker', () => {
//    const mockState = {
//     playerRole: 'player2', // This player is not the maker
//     gameState: { maker: 'player1', phase: GAME_PHASES.GOING_ALONE }
//   };
//   const mockStateService = {
//     getPlayerRole: () => mockState.playerRole,
//     gameState: mockState.gameState,
//   };
//   const service = new UiService(mockStateService, null); // socketService mock not needed
//   const controlsState = service.getGoAloneControlsState();
//   expect(controlsState.visible).to.be.false;
// });

// Conceptual Unit Test for getCardPlayabilityState:
// it('should return canPlayOnSurface true if current player and PLAYING phase', () => {
//   const mockState = {
//     playerRole: 'player1',
//     gameState: { currentPlayer: 'player1', phase: GAME_PHASES.PLAYING },
//     playerHand: [{id: 'AH', suit: 'H', rank: 'A'}]
//   };
//   const mockStateService = {
//     getPlayerRole: () => mockState.playerRole,
//     gameState: mockState.gameState,
//     getPlayerHand: () => mockState.playerHand,
//   };
//   const service = new UiService(mockStateService, null); // socketService mock not needed
//   const cardState = service.getCardPlayabilityState({id: 'AH', suit: 'H', rank: 'A'});
//   expect(cardState.canPlayOnSurface).to.be.true;
//   expect(cardState.isCardPlayable).to.be.true;
// });

// it('should return isCardPlayable false if card not in hand', () => {
//   const mockState = {
//     playerRole: 'player1',
//     gameState: { currentPlayer: 'player1', phase: GAME_PHASES.PLAYING },
//     playerHand: [{id: 'KH', suit: 'H', rank: 'K'}] // AH is not in hand
//   };
//   const mockStateService = {
//     getPlayerRole: () => mockState.getPlayerRole(), // Use getter for consistency
//     gameState: mockState.gameState,
//     getPlayerHand: () => mockState.playerHand,
//   };
//   const service = new UiService(mockStateService, null); // socketService mock not needed
//   const cardState = service.getCardPlayabilityState({id: 'AH', suit: 'H', rank: 'A'}); // Checking AH
//   expect(cardState.isCardPlayable).to.be.false;
//   expect(cardState.message).to.equal('Card not in hand.');
// });

// it('should note that "must follow suit" logic is a TODO', () => {
//   // This test is more about ensuring the comment/reminder is there.
//   // In a real test, you'd check the console output or a specific flag if you implement one.
//   // For this conceptual phase, we can rely on the console log within the method.
//   const mockState = {
//     playerRole: 'player1',
//     gameState: { currentPlayer: 'player1', phase: GAME_PHASES.PLAYING },
//     playerHand: [{id: 'AH', suit: 'H', rank: 'A'}]
//   };
//    const mockStateService = {
//     getPlayerRole: () => mockState.playerRole,
//     gameState: mockState.gameState,
//     getPlayerHand: () => mockState.playerHand,
//   };
//   const service = new UiService(mockStateService, null); // socketService mock not needed
//   // service.getCardPlayabilityState({id: 'AS', suit: 'S', rank: 'A'}); // Playing a spade when hearts might be lead
//   // conceptual_assert(console.logs_include_substring, 'TODO: Implement "must follow suit"');
//   // For now, just calling it is enough to trigger the internal console log.
//   service.getCardPlayabilityState({id: 'AH', suit: 'H', rank: 'A'});
//   // No direct expect here, relies on manual check of logs or future implementation.
// });

// Conceptual Unit Test for getRequestNewGameButtonState:
// it('should return active for new game button if GAME_OVER phase', () => {
//   const mockState = { gameState: { phase: GAME_PHASES.GAME_OVER }};
//   const mockStateService = { gameState: mockState.gameState };
//   const service = new UiService(mockStateService, null); // socketService mock not needed
//   const buttonState = service.getRequestNewGameButtonState();
//   expect(buttonState.visible).to.be.true;
// });

// it('should return inactive for new game button if not GAME_OVER phase', () => {
//   const mockState = { gameState: { phase: GAME_PHASES.PLAYING }};
//   const mockStateService = { gameState: mockState.gameState };
//   const service = new UiService(mockStateService, null); // socketService mock not needed
//   const buttonState = service.getRequestNewGameButtonState();
//   expect(buttonState.visible).to.be.false;
// });

// --- Conceptual Unit Tests for Error Handling in UI (Task 1) ---

// describe('UiService Action Error Handling', () => {
//   let uiService;
//   let mockSocketService;
//   let mockStateService; // Keep if methods use it, e.g. for context before emitting

//   beforeEach(() => {
//     // Mock socketService to return Promises
//     mockSocketService = {
//       emitOrderUpDecision: sinon.stub(),
//       emitDealerDiscard: sinon.stub(),
//       emitCallTrumpDecision: sinon.stub(),
//       emitGoAloneDecision: sinon.stub(),
//       emitPlayCard: sinon.stub(),
//       // Add other emitters if uiService calls them
//     };
//     mockStateService = { // Basic mock for stateService
//         getPlayerHand: sinon.stub().returns([{id: 'AH', suit: 'H', rank: 'A'}]),
//         getPlayerRole: sinon.stub().returns('player1'),
//         getMaker: sinon.stub().returns('player1'),
//     };
//     uiService = new UiService(mockStateService, mockSocketService);
//     // Spy on uiService's own error display methods
//     sinon.spy(uiService, 'showErrorModal');
//     sinon.spy(uiService, 'displayMessage');
//     sinon.spy(uiService, 'displayGlobalError'); // Added this
//     sinon.spy(uiService, 'showSpinner');
//     sinon.spy(uiService, 'hideSpinner');
//   });

//   afterEach(() => {
//     sinon.restore(); // Restores all spies and stubs
//   });

//   it('displayGlobalError should log and call displayMessage with type error', () => {
//     uiService.displayGlobalError('Test global error');
//     // Check console.error was called (conceptual, can't directly test console in this setup)
//     // Check displayMessage was called correctly
//     expect(uiService.displayMessage).to.have.been.calledOnceWith('Global Error: Test global error', 'error');
//   });

//   it('action-triggering methods call their respective socketService emitters', () => {
//     mockSocketService.emitOrderUpDecision.resolves({ status: 'ok' }); // Simulate success
//     uiService.promptOrderUp(true);
//     expect(mockSocketService.emitOrderUpDecision).to.have.been.calledOnceWith(true);

//     mockSocketService.emitPlayCard.resolves({ status: 'ok' });
//     const card = { suit: 'H', rank: 'A', id: 'AH' };
//     uiService.handlePlayCardSelection(card);
//     expect(mockSocketService.emitPlayCard).to.have.been.calledOnceWith(null, null, card);
//   });

//   it('action-triggering methods handle Promise rejections by calling showErrorModal', async () => {
//     const errorMessage = 'Server timed out';
//     mockSocketService.emitOrderUpDecision.rejects(new Error(errorMessage)); // Simulate rejection

//     await uiService.promptOrderUp(false); // await is not strictly necessary here as we check spies

//     expect(uiService.showSpinner).to.have.been.calledBefore(mockSocketService.emitOrderUpDecision);
//     expect(uiService.hideSpinner).to.have.been.called;
//     expect(uiService.showErrorModal).to.have.been.calledOnceWith(
//       `Failed to submit decision: ${errorMessage}. Please try again.`,
//       'Order Up Failed'
//     );
//   });

//    it('handlePlayCardSelection handles Promise rejection from emitPlayCard', async () => {
//     const playCardError = 'Invalid card play';
//     mockSocketService.emitPlayCard.rejects(new Error(playCardError));
//     const card = { suit: 'S', rank: 'K', id: 'SK' };

//     await uiService.handlePlayCardSelection(card);

//     expect(uiService.showSpinner).to.have.been.calledBefore(mockSocketService.emitPlayCard);
//     expect(uiService.hideSpinner).to.have.been.called;
//     expect(uiService.showErrorModal).to.have.been.calledOnceWith(
//       `Failed to play card: ${playCardError}. Please try again.`,
//       'Play Card Failed'
//     );
//   });

//   it('action-triggering methods handle success by calling displayMessage and hiding spinner', async () => {
//     mockSocketService.emitDealerDiscard.resolves({ status: 'ok', data: { message: 'Discard successful' } });
//     const card = { suit: 'D', rank: '9', id: '9D' };
//     mockStateService.getPlayerHand.returns([card]); // Ensure card is in hand for any internal checks

//     await uiService.promptDealerDiscard(card);

//     expect(uiService.showSpinner).to.have.been.calledBefore(mockSocketService.emitDealerDiscard);
//     expect(uiService.hideSpinner).to.have.been.called;
//     expect(uiService.displayMessage).to.have.been.calledOnceWith('Card discarded successfully.', 'success');
//     expect(uiService.showErrorModal).to.not.have.been.called;
//   });

//   // Example for a method that has internal validation before calling socketService
//   it('promptGoAlone shows error if not maker and does not call socketService', () => {
//     mockStateService.getPlayerRole.returns('player2'); // Current player
//     mockStateService.getMaker.returns('player1');    // Maker is someone else

//     uiService.promptGoAlone(true);

//     expect(mockSocketService.emitGoAloneDecision).to.not.have.been.called;
//     expect(uiService.showErrorModal).to.have.been.calledOnceWith(
//       'Only the maker can decide to go alone.',
//       'Action Not Allowed'
//     );
//     expect(uiService.showSpinner).to.not.have.been.called; // Should not show spinner if action is disallowed early
//   });

//   it('handlePlayCardSelection shows error for invalid card object and does not call socketService', () => {
//     const invalidCard = { suit: 'H', rank: 'A' }; // Missing id
//     uiService.handlePlayCardSelection(invalidCard);

//     expect(mockSocketService.emitPlayCard).to.not.have.been.called;
//     expect(uiService.showErrorModal).to.have.been.calledOnceWith(
//       'Invalid card selected. Card data is incomplete. Please try again.',
//       'Play Card Error'
//     );
//      expect(uiService.showSpinner).to.not.have.been.called;
//   });
// });

// --- Conceptual Unit Tests for Reconnection UI Flow (Task 2) ---

// describe('UiService Reconnection Flow Methods', () => {
//   let uiService;
//   let mockSocketService;
//   let mockStateService; // Only if methods directly use it, not for these specific show... methods

//   beforeEach(() => {
//     mockSocketService = {
//       emitRejoinGame: sinon.stub(),
//       // other methods as needed by tests
//     };
//     mockStateService = {
//       // methods as needed
//     };
//     uiService = new UiService(mockStateService, mockSocketService);
//     // Spy on other uiService methods that might be called internally
//     sinon.spy(uiService, 'displayMessage');
//     sinon.spy(uiService, 'showErrorModal');
//     sinon.spy(uiService, 'showSpinner');
//     sinon.spy(uiService, 'hideSpinner');
//     sinon.spy(uiService, 'navigateTo'); // if used
//   });

//   afterEach(() => {
//     sinon.restore();
//   });

//   describe('promptForRejoin', () => {
//     it('should call socketService.emitRejoinGame if user confirms (simulated)', () => {
//       // Simulate user confirmation (default behavior in current mock of promptForRejoin)
//       mockSocketService.emitRejoinGame.resolves({ status: 'ok' }); // Simulate successful emission
//       uiService.promptForRejoin('game123');

//       expect(uiService.showSpinner).to.have.been.calledOnceWith('Rejoining game game123...');
//       expect(mockSocketService.emitRejoinGame).to.have.been.calledOnceWith('game123');
//       // Async nature means checking hideSpinner and displayMessage requires handling the promise
//       // For simplicity in conceptual tests, we might not await here unless testing specific timing.
//       // return mockSocketService.emitRejoinGame('game123').then(() => {
//       //    expect(uiService.hideSpinner).to.have.been.called;
//       //    expect(uiService.displayMessage).to.have.been.calledWith(sinon.match.string, 'success');
//       // });
//     });

//     it('should display message and navigate if user denies (simulated by changing the hardcoded var)', () => {
//       // To test this, we'd need to modify the conceptual promptForRejoin or make it parameterizable.
//       // For now, this path is not easily testable without changing the method's testability.
//       // A better `promptForRejoin` would take a confirmation callback or return a promise based on actual UI.
//       // If we imagine `userConfirmsRejoin = false;` was set:
//       // uiService.promptForRejoin('game123'); // (assuming userConfirmsRejoin = false internally)
//       // expect(mockSocketService.emitRejoinGame).to.not.have.been.called;
//       // expect(uiService.displayMessage).to.have.been.calledWith('Okay, not rejoining...', 'info');
//       // expect(uiService.navigateTo).to.have.been.calledWith('lobby');
//       console.log("Conceptual test: promptForRejoin denial path not directly testable without modifying method for testability.");
//     });

//     it('should handle emitRejoinGame rejection by showing error modal', async () => {
//       const rejoinError = new Error('Server rejected rejoin');
//       mockSocketService.emitRejoinGame.rejects(rejoinError);

//       uiService.promptForRejoin('gameABC');

//       // Wait for the promise chain to complete
//       // This requires emitRejoinGame to be a real promise and for the catch block to execute.
//       // This conceptual test relies on the structure of promptForRejoin.
//       // To make it robust, we'd await a promise returned by promptForRejoin if it were designed that way.
//       // For now, let's assume the .catch() is called:
//       // Need to ensure the async catch block in promptForRejoin runs.
//       // A more complex setup or making promptForRejoin return the promise would be needed for a clean async test.
//       // This conceptual test assumes the catch block is eventually hit.
//       // await Promise.resolve(); // Allow microtasks to run
//       // await Promise.resolve(); // twice for safety

//       // This part of the test is tricky due to the async nature and conceptual UI interaction.
//       // A more robust test would mock the confirmation dialog itself.
//       // The key is that if emitRejoinGame (called internally) rejects, showErrorModal should be called.
//       // We are testing the catch block of the promise chain started by emitRejoinGame.
//       // To make this test pass reliably, uiService.promptForRejoin would need to return the promise from socketService.emitRejoinGame
//       // For now, we'll assume the .catch() in promptForRejoin is executed.
//       // This is a limitation of testing conceptual UI interactions directly.
//       // Awaiting a short delay can sometimes help in tests, but isn't ideal.
//       // await new Promise(resolve => setTimeout(resolve, 0));
//       // The following expectations might not pass reliably without proper async handling in the test or method.
//       // expect(uiService.hideSpinner).to.have.been.called;
//       // expect(uiService.showErrorModal).to.have.been.calledWith(sinon.match(rejoinError.message), 'Rejoin Failed');
//       console.log("Conceptual test: promptForRejoin error path's async nature makes direct spy verification complex without method modification for testability (e.g., returning the promise).");
//     });
//   });

//   it('showConnectionLostMessage should log and call displayMessage with error type', () => {
//     uiService.showConnectionLostMessage('Network error');
//     expect(uiService.displayMessage).to.have.been.calledOnceWith('Network error Attempting to reconnect...', 'error');
//   });

//   it('showReconnectingModal should log and call showSpinner', () => {
//     uiService.showReconnectingModal('Reconnecting...');
//     expect(uiService.showSpinner).to.have.been.calledOnceWith('Reconnecting...');
//   });

//   it('showReconnectedMessage should log, hide spinner, and call displayMessage with success type', () => {
//     uiService.showReconnectedMessage('Welcome back!');
//     expect(uiService.hideSpinner).to.have.been.calledOnce;
//     expect(uiService.displayMessage).to.have.been.calledOnceWith('Welcome back!', 'success');
//   });

//   it('showReconnectionFailedModal should log, hide spinner, and call showErrorModal', () => {
//     uiService.showReconnectionFailedModal('Server timeout.');
//     expect(uiService.hideSpinner).to.have.been.calledOnce;
//     expect(uiService.showErrorModal).to.have.been.calledOnceWith('Server timeout. Please check your internet connection or try joining again. You may need to start a new game.', 'Reconnection Failed');
//   });

//   it('hideModal should call hideSpinner', () => {
//     uiService.hideModal();
//     expect(uiService.hideSpinner).to.have.been.calledOnce;
//   });
// });
