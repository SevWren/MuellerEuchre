import { describe, it, afterEach, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// Project imports
import {
  GAME_PHASES,
  PLAYER_ROLES,
  SUITS,
  TEAMS,
} from "../../../src/config/constants.js";
import {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision,
} from "../../../src/game/phases/biddingPhase.js";
import {
  PhaseLogicError,
  NotPlayersTurnError,
  CardNotInHandError,
  InvalidBidError,
  InvalidDiscardError,
  InvalidPhaseError,
} from "../../../src/game/logic/validation-errors.js";
import logger from "../../../src/utils/logger.js";

// Test helpers
import { setupTestState } from "../../helpers/test-helpers.js";

const setupBiddingState = (options = {}) => {
  const {
    dealer = PLAYER_ROLES[0],
    round = 1,
    turnCardSuit = SUITS.DIAMONDS,
    ...rest
  } = options;

  const phase =
    round === 1
      ? GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND1
      : GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND2;
  const firstBidder = PLAYER_ROLES[(PLAYER_ROLES.indexOf(dealer) + 1) % 4];

  const { gameState } = setupTestState({
    phase,
    dealer,
    stateOverrides: {
      roundNumber: round,
      turnCard: {
        id: `A${turnCardSuit.slice(-1)}`,
        suit: turnCardSuit,
        value: "ACE",
      },
      currentPlayer: firstBidder,
      ...rest,
    },
  });

  return gameState;
};

describe("BiddingPhase Logic", () => {
  beforeEach(() => {
    mock.method(logger, "info", () => {});
    mock.method(logger, "error", () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("handleOrderUpDecision", () => {
    it("should not modify the input gameState", () => {
      const gameState = setupBiddingState();
      const originalStateJSON = JSON.stringify(gameState);
      const playerRole = gameState.currentPlayer;

      const mockServices = { validateBid: mock.fn(() => true) };
      handleOrderUpDecision.call(mockServices, gameState, playerRole, true);

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(gameState)),
        JSON.parse(originalStateJSON)
      );
    });

    it("should not be vulnerable to deep mutation", () => {
      const gameState = setupBiddingState();
      const originalStateJSON = JSON.stringify(gameState);
      const playerRole = gameState.currentPlayer;

      const mockServices = { validateBid: mock.fn(() => true) };
      const newState = handleOrderUpDecision.call(
        mockServices,
        gameState,
        playerRole,
        true
      );

      newState.players[playerRole].name = "MUTATED";

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(gameState)),
        JSON.parse(originalStateJSON)
      );
    });

    it("should call validateBid with correct parameters", () => {
      const gameState = setupBiddingState();
      const playerRole = gameState.currentPlayer;
      const mockServices = {
        validateBid: mock.fn((state, role, decision, suit) => {
          assert.deepStrictEqual(state, gameState);
          assert.strictEqual(role, playerRole);
          assert.strictEqual(decision, "orderUp");
          assert.strictEqual(
            suit,
            null,
            "Suit should be explicitly null for orderUp decision"
          );
          return true;
        }),
      };

      handleOrderUpDecision.call(mockServices, gameState, playerRole, true);
      assert.strictEqual(mockServices.validateBid.mock.callCount(), 1);
    });

    it("should correctly set state when dealer's partner orders up", () => {
      const dealer = PLAYER_ROLES[0];
      const partner = PLAYER_ROLES[2];
      const gameState = setupBiddingState({ dealer, currentPlayer: partner });
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleOrderUpDecision.call(
        mockServices,
        gameState,
        partner,
        true
      );

      assert.strictEqual(newState.makerTeam, TEAMS.TEAM_NS);
      assert.strictEqual(newState.playerWhoOrderedUp, partner);
      assert.strictEqual(
        newState.gamePhase,
        GAME_PHASES.GAME_PHASE_DEALER_DISCARD
      );
      assert.strictEqual(newState.currentPlayer, dealer);
    });

    it("should transition to round 2 when the dealer is the final player to pass", () => {
      const dealer = PLAYER_ROLES[0];
      const gameState = setupBiddingState({ dealer, currentPlayer: dealer });
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleOrderUpDecision.call(
        mockServices,
        gameState,
        dealer,
        false
      );

      assert.strictEqual(
        newState.gamePhase,
        GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND2
      );
      assert.strictEqual(newState.currentPlayer, PLAYER_ROLES[1]);
    });

    it("should handle an initially null bids array without errors", () => {
      const gameState = setupBiddingState();
      delete gameState.bids;
      const playerRole = gameState.currentPlayer;
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleOrderUpDecision.call(
        mockServices,
        gameState,
        playerRole,
        false
      );

      assert.ok(Array.isArray(newState.bids));
      assert.strictEqual(newState.bids.length, 1);
    });

    it("should create a game message using player role if name is missing", () => {
      const gameState = setupBiddingState();
      const playerRole = gameState.currentPlayer;
      delete gameState.players[playerRole].name;
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleOrderUpDecision.call(
        mockServices,
        gameState,
        playerRole,
        false
      );

      const lastMessage = newState.gameMessages.slice(-1)[0];
      assert.ok(lastMessage.text.startsWith(playerRole));
    });

    it("should throw PhaseLogicError if ordering player has no teamId", () => {
      const gameState = setupBiddingState();
      const playerRole = gameState.currentPlayer;
      delete gameState.players[playerRole].teamId;
      const mockServices = { validateBid: mock.fn(() => true) };

      assert.throws(
        () =>
          handleOrderUpDecision.call(mockServices, gameState, playerRole, true),
        (err) =>
          err instanceof PhaseLogicError &&
          err.message.includes("Player team could not be determined")
      );
      assert.strictEqual(logger.error.mock.calls.length, 1);
    });

    it("should throw PhaseLogicError if turnCard is missing when ordering up", () => {
      const gameState = setupBiddingState();
      gameState.turnCard = null;
      const playerRole = gameState.currentPlayer;
      const mockServices = { validateBid: mock.fn(() => true) };

      assert.throws(
        () =>
          handleOrderUpDecision.call(mockServices, gameState, playerRole, true),
        (err) =>
          err instanceof PhaseLogicError &&
          err.message.includes("turn card is missing")
      );
    });

    it("should handle an initially null gameMessages array without errors", () => {
      const gameState = setupBiddingState();
      delete gameState.gameMessages;
      const playerRole = gameState.currentPlayer;
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleOrderUpDecision.call(
        mockServices,
        gameState,
        playerRole,
        false
      );

      assert.ok(Array.isArray(newState.gameMessages));
      assert.strictEqual(newState.gameMessages.length, 1);
    });
  });

  describe("handleDealerDiscard", () => {
    const setupDealerDiscardState = (options = {}) => {
      const dealerRole = options.dealer || PLAYER_ROLES[0];
      const orderingPlayer = options.orderingPlayer || PLAYER_ROLES[1];
      const turnCard = { id: "AC", suit: SUITS.CLUBS, value: "ACE" };

      const { gameState } = setupTestState({
        phase: GAME_PHASES.GAME_PHASE_DEALER_DISCARD,
        dealer: dealerRole,
        stateOverrides: {
          currentPlayer: dealerRole,
          playerWhoOrderedUp: options.round === 1 ? orderingPlayer : null,
          playerWhoCalledTrump: options.round === 2 ? orderingPlayer : null,
          turnCard: turnCard,
        },
      });

      gameState.players[dealerRole].hand.push(turnCard);
      return gameState;
    };

    it("should not modify the input gameState", () => {
      const gameState = setupDealerDiscardState();
      const originalStateJSON = JSON.stringify(gameState);
      const dealerRole = gameState.dealer;
      const cardToDiscard = gameState.players[dealerRole].hand[1];

      const mockServices = { validateDealerDiscard: mock.fn(() => true) };
      handleDealerDiscard.call(
        mockServices,
        gameState,
        dealerRole,
        cardToDiscard.id
      );

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(gameState)),
        JSON.parse(originalStateJSON)
      );
    });

    it("should not be vulnerable to deep mutation", () => {
      const gameState = setupDealerDiscardState();
      const originalStateJSON = JSON.stringify(gameState);
      const dealerRole = gameState.dealer;
      const cardToDiscard = gameState.players[dealerRole].hand[1];

      const mockServices = { validateDealerDiscard: mock.fn(() => true) };
      const newState = handleDealerDiscard.call(
        mockServices,
        gameState,
        dealerRole,
        cardToDiscard.id
      );

      newState.players[dealerRole].name = "MUTATED";

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(gameState)),
        JSON.parse(originalStateJSON)
      );
    });

    it("should propagate errors from validateDealerDiscard", () => {
      const gameState = setupDealerDiscardState();
      const dealerRole = gameState.dealer;
      const cardToDiscard = gameState.players[dealerRole].hand[0];
      const expectedError = new InvalidDiscardError(
        "Cannot discard the turn card."
      );

      const mockServices = {
        validateDealerDiscard: mock.fn(() => {
          throw expectedError;
        }),
      };

      assert.throws(
        () =>
          handleDealerDiscard.call(
            mockServices,
            gameState,
            dealerRole,
            cardToDiscard.id
          ),
        expectedError
      );
    });

    it("should set the current player to the one who ordered up (Round 1 bid)", () => {
      const gameState = setupDealerDiscardState({ round: 1 });
      const dealerRole = gameState.dealer;
      const cardToDiscard = gameState.players[dealerRole].hand[1];
      const orderingPlayer = gameState.playerWhoOrderedUp;
      const mockServices = { validateDealerDiscard: mock.fn(() => true) };

      const newState = handleDealerDiscard.call(
        mockServices,
        gameState,
        dealerRole,
        cardToDiscard.id
      );

      assert.strictEqual(newState.currentPlayer, orderingPlayer);
    });

    it("should set the current player to the one who called trump (Round 2 bid)", () => {
      const gameState = setupDealerDiscardState({ round: 2 });
      const dealerRole = gameState.dealer;
      const cardToDiscard = gameState.players[dealerRole].hand[1];
      const callingPlayer = gameState.playerWhoCalledTrump;
      const mockServices = { validateDealerDiscard: mock.fn(() => true) };

      const newState = handleDealerDiscard.call(
        mockServices,
        gameState,
        dealerRole,
        cardToDiscard.id
      );

      assert.strictEqual(newState.currentPlayer, callingPlayer);
    });

    it("should preserve other player properties during discard", () => {
      const gameState = setupDealerDiscardState();
      const dealerRole = gameState.dealer;
      gameState.players[dealerRole].customProp = "should-be-preserved";
      const cardToDiscard = gameState.players[dealerRole].hand[1];
      const mockServices = { validateDealerDiscard: mock.fn(() => true) };

      const newState = handleDealerDiscard.call(
        mockServices,
        gameState,
        dealerRole,
        cardToDiscard.id
      );

      assert.strictEqual(
        newState.players[dealerRole].customProp,
        "should-be-preserved"
      );
    });

    it("should throw CardNotInHandError and log error if card to discard is not in hand", () => {
      const gameState = setupDealerDiscardState();
      const dealerRole = gameState.dealer;
      const invalidCardId = "XX";
      const mockServices = { validateDealerDiscard: mock.fn(() => true) };

      assert.throws(
        () =>
          handleDealerDiscard.call(
            mockServices,
            gameState,
            dealerRole,
            invalidCardId
          ),
        (err) =>
          err instanceof CardNotInHandError &&
          err.message.includes(`Card ${invalidCardId} not found`)
      );
      assert.strictEqual(logger.error.mock.calls.length, 1);
    });

    it("should throw PhaseLogicError if turnCard is missing from game state", () => {
      const gameState = setupDealerDiscardState();
      gameState.turnCard = null;
      const dealerRole = gameState.dealer;
      const cardToDiscard = gameState.players[dealerRole].hand[1];
      const mockServices = { validateDealerDiscard: mock.fn(() => true) };

      assert.throws(
        () =>
          handleDealerDiscard.call(
            mockServices,
            gameState,
            dealerRole,
            cardToDiscard.id
          ),
        (err) =>
          err instanceof PhaseLogicError &&
          err.message.includes("turn card is missing")
      );
    });

    it("should handle an initially null gameMessages array without errors", () => {
      const gameState = setupDealerDiscardState();
      delete gameState.gameMessages;
      const dealerRole = gameState.dealer;
      const cardToDiscard = gameState.players[dealerRole].hand[1];
      const mockServices = { validateDealerDiscard: mock.fn(() => true) };

      const newState = handleDealerDiscard.call(
        mockServices,
        gameState,
        dealerRole,
        cardToDiscard.id
      );

      assert.ok(Array.isArray(newState.gameMessages));
      assert.strictEqual(newState.gameMessages.length, 1);
    });

    it("should create a game message using dealer role if name is missing", () => {
      const gameState = setupDealerDiscardState();
      const dealerRole = gameState.dealer;
      delete gameState.players[dealerRole].name;
      const cardToDiscard = gameState.players[dealerRole].hand[1];
      const mockServices = { validateDealerDiscard: mock.fn(() => true) };

      const newState = handleDealerDiscard.call(
        mockServices,
        gameState,
        dealerRole,
        cardToDiscard.id
      );

      const lastMessage = newState.gameMessages.slice(-1)[0];
      assert.ok(lastMessage.text.startsWith(dealerRole));
    });

    it("should throw CardNotInHandError if dealer's hand is missing or null", () => {
      const gameState = setupDealerDiscardState();
      const dealerRole = gameState.dealer;
      const cardToDiscardId = "AC";
      const mockServices = { validateDealerDiscard: mock.fn(() => true) };

      gameState.players[dealerRole].hand = null;
      assert.throws(
        () =>
          handleDealerDiscard.call(
            mockServices,
            gameState,
            dealerRole,
            cardToDiscardId
          ),
        (err) => err instanceof CardNotInHandError,
        "Should throw when dealer's hand is null"
      );

      delete gameState.players[dealerRole].hand;
      assert.throws(
        () =>
          handleDealerDiscard.call(
            mockServices,
            gameState,
            dealerRole,
            cardToDiscardId
          ),
        (err) => err instanceof CardNotInHandError,
        "Should throw when dealer's hand property is missing"
      );
    });
  });

  describe("handleCallTrumpDecision", () => {
    it("should not modify the input gameState", () => {
      const gameState = setupBiddingState({ round: 2 });
      const originalStateJSON = JSON.stringify(gameState);
      const playerRole = gameState.currentPlayer;

      const mockServices = { validateBid: mock.fn(() => true) };
      handleCallTrumpDecision.call(
        mockServices,
        gameState,
        playerRole,
        true,
        SUITS.HEARTS
      );

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(gameState)),
        JSON.parse(originalStateJSON)
      );
    });

    it("should not be vulnerable to deep mutation", () => {
      const gameState = setupBiddingState({ round: 2 });
      const originalStateJSON = JSON.stringify(gameState);
      const playerRole = gameState.currentPlayer;

      const mockServices = { validateBid: mock.fn(() => true) };
      const newState = handleCallTrumpDecision.call(
        mockServices,
        gameState,
        playerRole,
        true,
        SUITS.HEARTS
      );

      newState.players[playerRole].name = "MUTATED";

      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(gameState)),
        JSON.parse(originalStateJSON)
      );
    });

    it("should handle all players passing as a misdeal and reset hand state", () => {
      let gameState = setupBiddingState({ dealer: PLAYER_ROLES[0], round: 2 });
      const mockServices = { validateBid: mock.fn(() => true) };

      const playerOrder = [
        PLAYER_ROLES[1],
        PLAYER_ROLES[2],
        PLAYER_ROLES[3],
        PLAYER_ROLES[0],
      ];

      for (const playerRole of playerOrder) {
        gameState.currentPlayer = playerRole;
        gameState = handleCallTrumpDecision.call(
          mockServices,
          gameState,
          playerRole,
          false
        );
      }

      assert.strictEqual(
        gameState.gamePhase,
        GAME_PHASES.GAME_PHASE_DEALING,
        "Phase should be DEALING after misdeal"
      );
      assert.strictEqual(
        gameState.currentPlayer,
        PLAYER_ROLES[1],
        "Dealer should rotate to West for the new hand"
      );
      assert.strictEqual(gameState.turnCard, null, "turnCard should be reset");
      assert.strictEqual(
        gameState.trumpSuit,
        null,
        "trumpSuit should be reset"
      );
      assert.strictEqual(
        gameState.makerTeam,
        null,
        "makerTeam should be reset"
      );
    });

    it("should throw InvalidBidError if calling player has no teamId", () => {
      const gameState = setupBiddingState({ round: 2 });
      const playerRole = gameState.currentPlayer;
      delete gameState.players[playerRole].teamId;
      const mockServices = { validateBid: mock.fn(() => true) };

      assert.throws(
        () =>
          handleCallTrumpDecision.call(
            mockServices,
            gameState,
            playerRole,
            true,
            SUITS.HEARTS
          ),
        (err) =>
          err instanceof InvalidBidError &&
          err.message.includes("Could not determine team")
      );
    });

    it("should correctly identify makerTeam from legacy 'team' property", () => {
      const gameState = setupBiddingState({ round: 2 });
      const playerRole = gameState.currentPlayer;
      gameState.players[playerRole].team = gameState.players[playerRole].teamId;
      delete gameState.players[playerRole].teamId;
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleCallTrumpDecision.call(
        mockServices,
        gameState,
        playerRole,
        true,
        SUITS.HEARTS
      );

      assert.strictEqual(
        newState.makerTeam,
        gameState.players[playerRole].team
      );
    });

    it("should handle an initially null gameMessages array without errors", () => {
      const gameState = setupBiddingState({ round: 2 });
      delete gameState.gameMessages;
      const playerRole = gameState.currentPlayer;
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleCallTrumpDecision.call(
        mockServices,
        gameState,
        playerRole,
        true,
        SUITS.HEARTS
      );

      assert.ok(Array.isArray(newState.gameMessages));
      assert.strictEqual(newState.gameMessages.length, 1);
    });

    it("should throw InvalidPhaseError if called in the wrong phase", () => {
      const gameState = setupBiddingState({ round: 1 });
      const playerRole = gameState.currentPlayer;
      const mockServices = { validateBid: mock.fn(() => true) };

      assert.throws(
        () =>
          handleCallTrumpDecision.call(
            mockServices,
            gameState,
            playerRole,
            true,
            SUITS.HEARTS
          ),
        (err) =>
          err instanceof InvalidPhaseError &&
          err.message.includes("GAME_PHASE_ORDER_UP_ROUND2")
      );
    });

    it("should handle an initially null bids array without errors", () => {
      const gameState = setupBiddingState({ round: 2 });
      delete gameState.bids;
      const playerRole = gameState.currentPlayer;
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleCallTrumpDecision.call(
        mockServices,
        gameState,
        playerRole,
        false
      );

      assert.ok(Array.isArray(newState.bids));
      assert.strictEqual(newState.bids.length, 1);
    });

    it("should throw InvalidBidError if the bidding player does not exist in state", () => {
      const gameState = setupBiddingState({ round: 2 });
      const playerRole = gameState.currentPlayer;
      delete gameState.players[playerRole];
      const mockServices = { validateBid: mock.fn(() => true) };

      assert.throws(
        () =>
          handleCallTrumpDecision.call(
            mockServices,
            gameState,
            playerRole,
            true,
            SUITS.HEARTS
          ),
        (err) =>
          err instanceof InvalidBidError &&
          err.message.includes("Could not determine team")
      );
    });

    it("should create a game message using player role if name is missing", () => {
      const gameState = setupBiddingState({ round: 2 });
      const playerRole = gameState.currentPlayer;
      delete gameState.players[playerRole].name;
      const mockServices = { validateBid: mock.fn(() => true) };

      const newState = handleCallTrumpDecision.call(
        mockServices,
        gameState,
        playerRole,
        false
      );

      const lastMessage = newState.gameMessages.slice(-1)[0];
      assert.ok(lastMessage.text.startsWith(playerRole));
    });
  });
});
