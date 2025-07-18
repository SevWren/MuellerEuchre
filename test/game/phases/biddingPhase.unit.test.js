/**
 * @file test/phases/biddingPhase.unit.test.js
 * @module test/phases/biddingPhase.unit
 * @description
 * TODO: Cleanup file for any legacy code.  
 *   Unit tests for the bidding phase logic of the Euchre Multiplayer game.
 */

import { describe, it, afterEach, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// We'll use dynamic imports to avoid issues with ESM mocking
let biddingPhaseModule;
let validationModule;

// Mock implementations
let mockValidateBid;
let mockValidateDealerDiscard;

import {
  GAME_PHASES,
  PLAYER_ROLES,
  SUITS,
  TEAMS,
  VALUES,
} from "../../../src/config/constants.js";
import { createDeck, shuffleDeck } from "../../../src/utils/deck.js";
import {
  initializePlayers,
  getNextPlayer as testGetNextPlayer,
} from "../../../src/utils/players.js";
import {
  PhaseLogicError,
  NotPlayersTurnError,
  InvalidBidError,
  CardNotInHandError,
  InvalidDiscardError,
} from "../../../src/game/logic/errors.js";

const createInitialGameState = (dealer = PLAYER_ROLES[0]) => {
  let initialPlayerObjects = initializePlayers();
  let deck = shuffleDeck(createDeck());
  const playerHands = {};
  PLAYER_ROLES.forEach((role) => (playerHands[role] = []));
  const dealOrder = [
    testGetNextPlayer(dealer),
    testGetNextPlayer(testGetNextPlayer(dealer)),
    testGetNextPlayer(testGetNextPlayer(testGetNextPlayer(dealer))),
    dealer,
  ];
  dealOrder.forEach((role) => {
    for (let i = 0; i < 5; i++) {
      if (deck.length > 0) playerHands[role].push(deck.pop());
    }
  });
  const turnCard =
    deck.length > 0
      ? deck.pop()
      : {
          id: "AH",
          suit: SUITS.HEARTS,
          value: VALUES.ACE,
          name: "Ace of Hearts",
        };
  const kitty = deck;
  const playersWithHands = PLAYER_ROLES.reduce((acc, role) => {
    acc[role] = {
      ...initialPlayerObjects[role],
      hand: playerHands[role] || [],
    };
    return acc;
  }, {});
  return {
    gameId: "testGame123",
    gamePhase: GAME_PHASES.DEALING,
    players: playersWithHands,
    kitty: kitty,
    turnCard: turnCard,
    dealer: dealer,
    currentPlayer: null,
    makerTeam: null,
    trumpSuit: null,
    bids: [],
    gameMessages: [],
    roundNumber: 1,
    playerWhoOrderedUp: null,
    playerWhoCalledTrump: null,
    currentTrick: [],
    tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    settings: { winningScore: 10 },
  };
};

const setupBiddingState = (
  dealer = PLAYER_ROLES[0],
  round = 1,
  turnCardSuit = SUITS.HEARTS,
) => {
  let gameState = JSON.parse(JSON.stringify(createInitialGameState(dealer)));

  gameState.roundNumber = round;
  gameState.gamePhase =
    round === 1
      ? GAME_PHASES.ORDER_UP_ROUND1
      : GAME_PHASES.ORDER_UP_ROUND2;

  const cardValue = VALUES[VALUES.length - 1]; // Use ACE
  const suit = turnCardSuit || SUITS.HEARTS;
  const valueChar =
    cardValue && typeof cardValue === "string"
      ? cardValue.charAt(0).toUpperCase()
      : "A";
  const suitChar =
    suit && typeof suit === "string" ? suit.charAt(0).toUpperCase() : "H";

  gameState.turnCard = {
    id: `${valueChar}${suitChar}`,
    suit: suit,
    value: cardValue,
    name: `${cardValue} of ${suit}`,
    rank: VALUES.indexOf(cardValue) + 1,
  };

  gameState.currentPlayer = testGetNextPlayer(dealer);

  return gameState;
};

describe("BiddingPhase Logic", () => {
  beforeEach(async () => {
    // Reset all mocks
    mock.restoreAll();
    
    // Create fresh mocks for each test
    mockValidateBid = mock.fn(() => true);
    mockValidateDealerDiscard = mock.fn(() => true);
    
    // Import the validation module and override its exports
    validationModule = await import('../../../src/game/logic/validation.js');
    
    // Override the module's exports with our mocks
    Object.defineProperty(validationModule, 'validateBid', {
      value: mockValidateBid,
      configurable: true
    });
    
    Object.defineProperty(validationModule, 'validateDealerDiscard', {
      value: mockValidateDealerDiscard,
      configurable: true
    });
    
    // Import the module under test after setting up mocks
    biddingPhaseModule = await import('../../../src/game/phases/biddingPhase.js');
  });
  
  afterEach(() => {
    // Clear all mocks and restore originals
    mock.restoreAll();
    
    // Clear the module cache to ensure fresh imports in each test
    const cacheBustingModulePath = new URL(
      '../../../src/game/phases/biddingPhase.js',
      import.meta.url
    ).href;
    
    // Clear the module from the import cache
    if (import.meta.url in require.cache) {
      delete require.cache[import.meta.url];
    }
    
    // Clear the module under test from the import cache
    if (cacheBustingModulePath in require.cache) {
      delete require.cache[cacheBustingModulePath];
    }
  });

  describe("handleOrderUpDecision", () => {
    const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

    it("should not modify the input gameState", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const originalState = deepCopy(gameStateInOrderUpRound1);
      const playerRole = gameStateInOrderUpRound1.currentPlayer;

      // Reset mocks
      mockValidateBid.mock.resetCalls();
      mockValidateDealerDiscard.mock.resetCalls();
      
      // Import after setting up mocks
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);

      assert.deepStrictEqual(gameStateInOrderUpRound1, originalState);
    });

    it("should call validateBid with correct parameters", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const wantsToOrderUp = true;

      const validateBidMock = mock.fn();
      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: validateBidMock,
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      handleOrderUpDecision(
        gameStateInOrderUpRound1,
        playerRole,
        wantsToOrderUp,
      );

      assert.strictEqual(validateBidMock.mock.calls.length, 1);
      const [state, role, bidType, suit] =
        validateBidMock.mock.calls[0].arguments;
      assert.deepStrictEqual(state, gameStateInOrderUpRound1);
      assert.strictEqual(role, playerRole);
      assert.strictEqual(bidType, "orderUp");
      assert.strictEqual(suit, null);
    });

    it("should propagate validation errors", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const error = new Error("Validation failed");

      const validateBidMock = mock.fn(() => {
        throw error;
      });
      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: validateBidMock,
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      assert.throws(
        () => handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true),
        error,
      );
    });

    it("should return correct state when player orders up", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const expectedTrumpSuit = gameStateInOrderUpRound1.turnCard.suit;
      const expectedMakerTeam =
        gameStateInOrderUpRound1.players[playerRole].teamId;

      // Reset mocks
      mockValidateBid.mock.resetCalls();
      mockValidateDealerDiscard.mock.resetCalls();
      
      // Import after setting up mocks
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      const result = handleOrderUpDecision(
        gameStateInOrderUpRound1,
        playerRole,
        true,
      );

      assert.strictEqual(result.trumpSuit, expectedTrumpSuit);
      assert.strictEqual(result.makerTeam, expectedMakerTeam);
      assert.strictEqual(result.gamePhase, GAME_PHASES.DEALER_DISCARD);
      assert.strictEqual(
        result.currentPlayer,
        gameStateInOrderUpRound1.dealer,
      );
    });

    it("should advance to next player when player passes", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const currentPlayer = gameStateInOrderUpRound1.currentPlayer;
      const nextPlayer = testGetNextPlayer(currentPlayer);

      // Reset mocks
      mockValidateBid.mock.resetCalls();
      mockValidateDealerDiscard.mock.resetCalls();
      
      // Import after setting up mocks
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      const result = handleOrderUpDecision(
        gameStateInOrderUpRound1,
        currentPlayer,
        false,
      );

      assert.strictEqual(result.currentPlayer, nextPlayer);
      assert.strictEqual(result.trumpSuit, null);
    });

    it("should advance to round 2 when all players pass in round 1", async () => {
      let currentState = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
      const firstBidder = currentState.currentPlayer;

      // Reset mocks
      mockValidateBid.mock.resetCalls();
      mockValidateDealerDiscard.mock.resetCalls();
      
      // Import after setting up mocks
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      PLAYER_ROLES.forEach((_, index) => {
        const player =
          PLAYER_ROLES[(PLAYER_ROLES.indexOf(firstBidder) + index) % 4];
        currentState = handleOrderUpDecision(currentState, player, false);
      });

      assert.strictEqual(currentState.gamePhase, GAME_PHASES.ORDER_UP_ROUND2);
      assert.strictEqual(currentState.currentPlayer, firstBidder);
    });

    it("should call validateBid with correct arguments", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameStateInOrderUpRound1.currentPlayer;

      const validateBidMock = mock.fn();
      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: validateBidMock,
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);
      assert.strictEqual(validateBidMock.mock.calls.length, 1);
      assert.deepStrictEqual(validateBidMock.mock.calls[0].arguments, [
        gameStateInOrderUpRound1,
        playerRole,
        "orderUp",
        null,
      ]);

      validateBidMock.mock.resetCalls();

      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, false);
      assert.strictEqual(validateBidMock.mock.calls.length, 1);
      assert.deepStrictEqual(validateBidMock.mock.calls[0].arguments, [
        gameStateInOrderUpRound1,
        playerRole,
        "pass",
        null,
      ]);
    });

    it("should propagate errors from validateBid", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const expectedError = new NotPlayersTurnError(playerRole, "otherPlayer");

      const validateBidMock = mock.fn(() => {
        throw expectedError;
      });
      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: validateBidMock,
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      assert.throws(
        () => handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true),
        expectedError,
      );
    });

    it("should throw PhaseLogicError if turnCard is missing when ordering up", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const stateWithoutTurnCard = {
        ...gameStateInOrderUpRound1,
        turnCard: null,
      };

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      assert.throws(
        () => handleOrderUpDecision(stateWithoutTurnCard, playerRole, true),
        {
          name: "PhaseLogicError",
          message: "Cannot order up: turn card is missing.",
        },
      );
    });

    it("should throw PhaseLogicError if player team cannot be determined when ordering up", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const stateWithoutTeam = JSON.parse(
        JSON.stringify(gameStateInOrderUpRound1),
      );
      delete stateWithoutTeam.players[playerRole].teamId;

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      assert.throws(
        () => handleOrderUpDecision(stateWithoutTeam, playerRole, true),
        {
          name: "PhaseLogicError",
          message: "Player team could not be determined for ordering up.",
        },
      );
    });

    it("Round 1: should advance currentPlayer if player passes", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerPassing = gameStateInOrderUpRound1.currentPlayer;

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      const nextState = handleOrderUpDecision(
        gameStateInOrderUpRound1,
        playerPassing,
        false,
      );
      assert.strictEqual(
        nextState.currentPlayer,
        testGetNextPlayer(playerPassing),
      );
    });

    it("Round 1: should set trump, maker, and transition to DEALER_DISCARD if player orders up", async () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const orderingPlayer = gameStateInOrderUpRound1.currentPlayer;

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      const nextState = handleOrderUpDecision(
        gameStateInOrderUpRound1,
        orderingPlayer,
        true,
      );
      assert.strictEqual(
        nextState.trumpSuit,
        gameStateInOrderUpRound1.turnCard.suit,
      );
      assert.strictEqual(
        nextState.makerTeam,
        gameStateInOrderUpRound1.players[orderingPlayer].teamId,
      );
      assert.strictEqual(nextState.gamePhase, GAME_PHASES.DEALER_DISCARD);
    });

    it("Round 1: should correctly set makerTeam if dealer partner orders up", async () => {
      let currentState = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
      const orderingPartner = PLAYER_ROLES[2];
      const dealerTeam = currentState.players[currentState.dealer].teamId;

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      currentState = handleOrderUpDecision(
        currentState,
        PLAYER_ROLES[1],
        false,
      );
      const nextState = handleOrderUpDecision(
        currentState,
        orderingPartner,
        true,
      );
      assert.strictEqual(nextState.makerTeam, dealerTeam);
    });

    it("Round 1: should transition to ORDER_UP_ROUND2 if all 4 players pass", async () => {
      let currentState = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleOrderUpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      currentState = handleOrderUpDecision(
        currentState,
        PLAYER_ROLES[1],
        false,
      );
      currentState = handleOrderUpDecision(
        currentState,
        PLAYER_ROLES[2],
        false,
      );
      currentState = handleOrderUpDecision(
        currentState,
        PLAYER_ROLES[3],
        false,
      );
      const finalState = handleOrderUpDecision(
        currentState,
        PLAYER_ROLES[0],
        false,
      );
      assert.strictEqual(finalState.gamePhase, GAME_PHASES.ORDER_UP_ROUND2);
    });
  });

  describe("handleDealerDiscard", () => {
    const dealer = PLAYER_ROLES[0];
    const orderingPlayer = PLAYER_ROLES[1];
    const turnCardData = {
      id: "AD",
      suit: SUITS.DIAMONDS,
      value: VALUES.ACE,
      name: "Ace of Diamonds",
      rank: 6,
    };

    const createTestState = () => {
      const gameStateForDiscard = setupBiddingState(
        dealer,
        1,
        turnCardData.suit,
      );
      gameStateForDiscard.gamePhase = GAME_PHASES.DEALER_DISCARD;
      gameStateForDiscard.currentPlayer = dealer;
      gameStateForDiscard.dealer = dealer;
      gameStateForDiscard.playerWhoOrderedUp = orderingPlayer;
      gameStateForDiscard.trumpSuit = turnCardData.suit;
      gameStateForDiscard.turnCard = { ...turnCardData };

      const testDealerHand = [
        {
          id: "TC",
          suit: SUITS.CLUBS,
          value: VALUES.TEN,
          name: "Ten of Clubs",
          rank: 2,
        },
        {
          id: "QC",
          suit: SUITS.CLUBS,
          value: VALUES.QUEEN,
          name: "Queen of Clubs",
          rank: 4,
        },
        {
          id: "KC",
          suit: SUITS.CLUBS,
          value: VALUES.KING,
          name: "King of Clubs",
          rank: 5,
        },
        {
          id: "AC",
          suit: SUITS.CLUBS,
          value: VALUES.ACE,
          name: "Ace of Clubs",
          rank: 6,
        },
        {
          id: "9S",
          suit: SUITS.SPADES,
          value: VALUES.NINE,
          name: "Nine of Spades",
          rank: 1,
        },
      ];
      gameStateForDiscard.players[dealer].hand = [
        ...testDealerHand,
        gameStateForDiscard.turnCard,
      ];
      gameStateForDiscard.makerTeam =
        gameStateForDiscard.players[orderingPlayer].teamId;
      return gameStateForDiscard;
    };

    it("should call validateDealerDiscard with correct arguments (6-card hand)", async () => {
      const gameStateForDiscard = createTestState();
      const cardToDiscardFrom6CardHand =
        gameStateForDiscard.players[dealer].hand[0];
      const cardToDiscardId = cardToDiscardFrom6CardHand.id;

      // Set up mock implementation for this specific test
      mockValidateDealerDiscard.mock.mockImplementation(() => true);
      
      // Get the function from the pre-imported module
      const { handleDealerDiscard } = biddingPhaseModule;

      await handleDealerDiscard(
        gameStateForDiscard,
        dealer,
        cardToDiscardId,
      );

      // Verify the mock was called with the correct arguments
      const calls = mockValidateDealerDiscard.mock.calls;
      assert.strictEqual(calls.length, 1, "validateDealerDiscard should be called once");
      assert.deepStrictEqual(
        calls[0].arguments,
        [gameStateForDiscard, dealer, cardToDiscardId],
        "validateDealerDiscard should be called with correct arguments"
      );
    });

    it("should throw CardNotInHandError if card ID not in hand (preliminary check on 6-card hand)", async () => {
      const gameStateForDiscard = createTestState();
      await mock.module("../../../src/game/logic/validation.js", {
        validateDealerDiscard: mock.fn(),
        validateBid: mock.fn(),
      });
      const { handleDealerDiscard } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      assert.throws(
        () => handleDealerDiscard(gameStateForDiscard, dealer, "XX"),
        {
          name: "CardNotInHandError",
          message: "Card XX not found in dealer's hand.",
        },
      );
    });

    it("should propagate errors from validateDealerDiscard (when called with 6-card hand)", async () => {
      const gameStateForDiscard = createTestState();
      const cardToDiscardId = "invalidCardId";
      const expectedError = new Error("Invalid discard");

      // Set up mock to throw error for this test
      mockValidateDealerDiscard.mock.mockImplementation(() => {
        throw expectedError;
      });
      
      // Get the function from the pre-imported module
      const { handleDealerDiscard } = biddingPhaseModule;

      await assert.rejects(
        () => handleDealerDiscard(gameStateForDiscard, dealer, cardToDiscardId),
        expectedError,
      );
    });

    it("should throw PhaseLogicError if turnCard is missing in gameState (after validation passes)", async () => {
      const gameStateForDiscard = createTestState();
      const cardToDiscardFrom6CardHand =
        gameStateForDiscard.players[dealer].hand[0];
      const stateWithoutTurnCardOnTable = {
        ...gameStateForDiscard,
        turnCard: null,
      };

      await mock.module("../../../src/game/logic/validation.js", {
        validateDealerDiscard: mock.fn(() => true),
        validateBid: mock.fn(),
      });
      const { handleDealerDiscard } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      assert.throws(
        () =>
          handleDealerDiscard(
            stateWithoutTurnCardOnTable,
            dealer,
            cardToDiscardFrom6CardHand.id,
          ),
        {
          name: "PhaseLogicError",
          message: "Cannot discard: turn card is missing from game state.",
        },
      );
    });

    it("should allow dealer to discard a card, resulting in a 5-card hand (after validation passes)", async () => {
      const gameStateForDiscard = createTestState();
      const cardToDiscardObj = gameStateForDiscard.players[dealer].hand[0];
      const pickedUpTurnCard = gameStateForDiscard.turnCard;

      await mock.module("../../../src/game/logic/validation.js", {
        validateDealerDiscard: mock.fn(() => true),
        validateBid: mock.fn(),
      });
      const { handleDealerDiscard } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      const nextState = handleDealerDiscard(
        gameStateForDiscard,
        dealer,
        cardToDiscardObj.id,
      );

      assert.strictEqual(nextState.players[dealer].hand.length, 5);
      if (cardToDiscardObj.id !== pickedUpTurnCard.id) {
        assert.strictEqual(
          nextState.players[dealer].hand.some(
            (c) => c.id === pickedUpTurnCard.id,
          ),
          true,
        );
      }
      assert.strictEqual(
        nextState.players[dealer].hand.some(
          (c) => c.id === cardToDiscardObj.id,
        ),
        false,
      );
    });
  });

  describe("handleCallTrumpDecision", () => {
    const originalTurnCardSuit = SUITS.DIAMONDS;

    const createTestState = () => {
      const gameStateInCallTrumpRound = setupBiddingState(
        PLAYER_ROLES[0],
        2,
        originalTurnCardSuit,
      );
      gameStateInCallTrumpRound.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
      gameStateInCallTrumpRound.currentPlayer = PLAYER_ROLES[1];
      gameStateInCallTrumpRound.dealer = PLAYER_ROLES[0];
      return gameStateInCallTrumpRound;
    };

    it("should call validateBid with correct arguments", async () => {
      const gameStateInCallTrumpRound = createTestState();
      const playerRole = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = SUITS.HEARTS;

      // Set up mock implementation for this test
      mockValidateBid.mock.mockImplementation(() => true);
      
      // Get the function from the pre-imported module
      const { handleCallTrumpDecision } = biddingPhaseModule;

      await handleCallTrumpDecision(
        gameStateInCallTrumpRound,
        playerRole,
        true,
        suitToCall,
      );

      // Verify the mock was called with the correct arguments
      const calls = mockValidateBid.mock.calls;
      assert.strictEqual(calls.length, 1, "validateBid should be called once");
      assert.deepStrictEqual(
        calls[0].arguments,
        [gameStateInCallTrumpRound, playerRole, "call", suitToCall],
        "validateBid should be called with correct arguments"
      );
    });

    it("should propagate errors from validateBid", async () => {
      const gameStateInCallTrumpRound = createTestState();
      const playerRole = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = "invalidSuit";
      const expectedError = new Error("Invalid bid");

      // Set up mock to throw error for this test
      mockValidateBid.mock.mockImplementation(() => {
        throw expectedError;
      });
      
      // Get the function from the pre-imported module
      const { handleCallTrumpDecision } = biddingPhaseModule;

      await assert.rejects(
        () =>
          handleCallTrumpDecision(
            gameStateInCallTrumpRound,
            playerRole,
            true,
            suitToCall,
          ),
        expectedError,
      );
    });

    it("should throw PhaseLogicError if player team cannot be determined when calling trump", async () => {
      const gameStateInCallTrumpRound = createTestState();
      const playerRole = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      const stateWithoutTeam = JSON.parse(
        JSON.stringify(gameStateInCallTrumpRound),
      );
      delete stateWithoutTeam.players[playerRole].teamId;

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleCallTrumpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      assert.throws(
        () =>
          handleCallTrumpDecision(stateWithoutTeam, playerRole, true, suitToCall),
        {
          name: "PhaseLogicError",
          message: "Player team could not be determined for calling trump.",
        },
      );
    });

    it("Round 2: should advance currentPlayer if player passes (after validation passes)", async () => {
      const gameStateInCallTrumpRound = createTestState();
      const playerPassing = gameStateInCallTrumpRound.currentPlayer;

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleCallTrumpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      const nextState = handleCallTrumpDecision(
        gameStateInCallTrumpRound,
        playerPassing,
        false,
      );
      assert.strictEqual(
        nextState.currentPlayer,
        testGetNextPlayer(playerPassing),
      );
    });

    it("Round 2: should set trump, maker, and transition to GOING_ALONE_DECISION if player calls a valid suit (after validation passes)", async () => {
      const gameStateInCallTrumpRound = createTestState();
      const callingPlayer = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = SUITS.HEARTS;

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleCallTrumpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      const nextState = handleCallTrumpDecision(
        gameStateInCallTrumpRound,
        callingPlayer,
        true,
        suitToCall,
      );
      assert.strictEqual(nextState.trumpSuit, suitToCall);
      assert.strictEqual(
        nextState.makerTeam,
        gameStateInCallTrumpRound.players[callingPlayer].teamId,
      );
      assert.strictEqual(
        nextState.gamePhase,
        GAME_PHASES.GOING_ALONE_DECISION,
      );
    });

    it("Round 2: should transition to DEALING (misdeal) if all 4 players pass (dealer passes last, after validation passes)", async () => {
      let currentState = createTestState();

      await mock.module("../../../src/game/logic/validation.js", {
        validateBid: mock.fn(() => true),
        validateDealerDiscard: mock.fn(),
      });
      const { handleCallTrumpDecision } = await import(
        "../../../src/game/phases/biddingPhase.js"
      );

      currentState = handleCallTrumpDecision(
        currentState,
        PLAYER_ROLES[1],
        false,
      );
      currentState = handleCallTrumpDecision(
        currentState,
        PLAYER_ROLES[2],
        false,
      );
      currentState = handleCallTrumpDecision(
        currentState,
        PLAYER_ROLES[3],
        false,
      );
      const finalState = handleCallTrumpDecision(
        currentState,
        PLAYER_ROLES[0],
        false,
      );
      assert.strictEqual(finalState.gamePhase, GAME_PHASES.DEALING);
    });
  });
});
