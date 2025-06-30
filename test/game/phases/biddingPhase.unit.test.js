/**
 * @file test/phases/biddingPhase.unit.test.js
 * @module test/phases/biddingPhase.unit
 * @description
 *   Unit tests for the bidding phase logic of the Euchre Multiplayer game.
 *   These tests cover the pure functions responsible for handling order up decisions,
 *   dealer discards, and call trump decisions, including all validation and state transitions.
 *
 *   CURRENT STATE:
 *     - These tests use esmock to isolate and mock dependencies for each function under test.
 *     - The tests verify correct argument validation, error propagation, and state transitions
 *       for each bidding phase action.
 *     - The test structure is aligned with the layered rewrite plan: all logic under test is pure,
 *       stateless, and does not mutate shared state directly.
 *     - The test file is self-contained and does not depend on any legacy or archived modules.
 *
 *   WHEN THE PROJECT IS COMPLETE:
 *     - This file will serve as the canonical unit test suite for Layer 1 (Core Logic) bidding phase.
 *     - All tests will target only pure functions, with all state mutation and persistence handled
 *       by Layer 2 (state management) and Layer 3 (network API).
 *     - No test will require integration with socket handlers, persistence, or UI code.
 *     - The test suite will guarantee that all bidding rules, edge cases, and error conditions
 *       are enforced at the logic layer, supporting robust and maintainable state management above.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import path from 'path';
import { fileURLToPath } from 'url';

// =============================================
// PATH CONSTANTS (Pattern C from esmock_fix_and_prevention_plan.md)
// =============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts a relative path to an absolute path with POSIX separators
 * @param {string} relativePath - Path relative to the test file
 * @returns {string} Absolute path with POSIX separators
 */
const toPosixPath = (relativePath) => {
  return path.resolve(__dirname, relativePath).replace(/\\/g, '/');
};

// Define all module paths as constants at the top of the file
const PATHS = {
  // Source files - use relative paths from the test file
  BIDDING_PHASE: toPosixPath('../../../src/game/phases/biddingPhase.js'),
  VALIDATION: toPosixPath('../../../src/game/logic/validation.js'),
  LOGGER: toPosixPath('../../../src/utils/logger.js'),
  CONSTANTS: toPosixPath('../../../src/config/constants.js'),
  PLAYERS: toPosixPath('../../../src/utils/players.js'),
  ERRORS: toPosixPath('../../../src/game/logic/errors.js'),
  
  // Test utilities
  TEST_UTILS: toPosixPath('../../testUtils.js')
};

// Import using path constants to ensure consistency
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, VALUES } from '../../../src/config/constants.js';
import { createDeck, shuffleDeck, cardToId } from '../../../src/utils/deck.js';
import { initializePlayers, getNextPlayer as testGetNextPlayer } from '../../../src/utils/players.js';
import {
  PhaseLogicError,
  ValidationError,
  NotPlayersTurnError,
  InvalidBidError,
  InvalidPhaseError,
  CardNotInHandError,
  InvalidDiscardError,
} from '../../../src/game/logic/errors.js';

const baseLoggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
};

const createInitialGameState = (dealer = PLAYER_ROLES[0]) => {
  let initialPlayerObjects = initializePlayers();
  let deck = shuffleDeck(createDeck());
  const playerHands = {};
  PLAYER_ROLES.forEach(role => playerHands[role] = []);
  const dealOrder = [
    testGetNextPlayer(dealer),
    testGetNextPlayer(testGetNextPlayer(dealer)),
    testGetNextPlayer(testGetNextPlayer(testGetNextPlayer(dealer))),
    dealer,
  ];
  dealOrder.forEach(role => {
    for (let i = 0; i < 5; i++) {
      if (deck.length > 0) playerHands[role].push(deck.pop());
    }
  });
  const turnCard = deck.length > 0 ? deck.pop() : { id: 'AH', suit: SUITS.HEARTS, value: VALUES.ACE };
  const kitty = deck;
  const playersWithHands = PLAYER_ROLES.reduce((acc, role) => {
    acc[role] = { ...initialPlayerObjects[role], hand: playerHands[role] || [] };
    return acc;
  }, {});
  return {
    gameId: 'testGame123',
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

const setupBiddingState = (dealer = PLAYER_ROLES[0], round = 1, turnCardSuit = SUITS.HEARTS) => {
  // Create a deep copy of the initial game state to avoid mutations
  let gameState = JSON.parse(JSON.stringify(createInitialGameState(dealer)));
  
  // Set round and phase
  gameState.roundNumber = round;
  gameState.gamePhase = (round === 1) ? GAME_PHASES.ORDER_UP_ROUND1 : GAME_PHASES.ORDER_UP_ROUND2;
  
  // Ensure turn card is properly initialized with a valid value from VALUES
  const cardValue = VALUES[VALUES.length - 1]; // Use the highest value (ACE)
  const suit = turnCardSuit || SUITS.HEARTS; // Default to HEARTS if not provided
  const valueChar = (cardValue && typeof cardValue === 'string') ? cardValue.charAt(0).toUpperCase() : 'A';
  const suitChar = (suit && typeof suit === 'string') ? suit.charAt(0).toUpperCase() : 'H';
  
  // Create a properly formatted turn card
  gameState.turnCard = {
    id: `${valueChar}${suitChar}`,
    suit: suit,
    value: cardValue,
    name: `${cardValue} of ${suit}`,
    rank: VALUES.indexOf(cardValue) + 1
  };
  
  // Set the first player
  gameState.currentPlayer = testGetNextPlayer(dealer);
  
  return gameState;
};

describe('BiddingPhase Logic', () => {
  afterEach(() => {
    sinon.restore();
    baseLoggerMock.info.resetHistory();
    baseLoggerMock.warn.resetHistory();
    baseLoggerMock.error.resetHistory();
    baseLoggerMock.debug.resetHistory();
  });

  describe('handleOrderUpDecision', () => {
    let gameStateInOrderUpRound1;
    let validateBidMock;
    let handleOrderUpDecision;

    // Helper function to create a deep copy of an object
    const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

    beforeEach(async () => {
      // Reset mocks
      validateBidMock = sinon.stub();
      baseLoggerMock.info.resetHistory();
      baseLoggerMock.error.resetHistory();

      // Set up the module with mocks using path constants
      const biddingPhaseModule = await esmock(
        PATHS.BIDDING_PHASE,
        {
          [PATHS.VALIDATION]: {
            validateBid: validateBidMock,
            validateDealerDiscard: sinon.stub().returns(true)
          },
          [PATHS.LOGGER]: baseLoggerMock
        },
        {
          // Mock any Node.js built-ins if needed
        }
      );

      handleOrderUpDecision = biddingPhaseModule.handleOrderUpDecision;
      gameStateInOrderUpRound1 = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
    });

    // Test that the function is pure (doesn't modify input)
    it('should not modify the input gameState', () => {
      // Arrange
      const originalState = deepCopy(gameStateInOrderUpRound1);
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      
      // Act
      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);
      
      // Assert
      expect(gameStateInOrderUpRound1).to.deep.equal(originalState);
    });

    // Test validation is called correctly
    it('should call validateBid with correct parameters', () => {
      // Arrange
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const wantsToOrderUp = true;
      
      // Act
      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, wantsToOrderUp);
      
      // Assert
      expect(validateBidMock.calledOnce).to.be.true;
      const [state, role, bidType, suit] = validateBidMock.firstCall.args;
      expect(state).to.equal(gameStateInOrderUpRound1);
      expect(role).to.equal(playerRole);
      expect(bidType).to.equal('orderUp');
      expect(suit).to.be.null;
    });

    // Test validation errors are propagated
    it('should propagate validation errors', () => {
      // Arrange
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const error = new Error('Validation failed');
      validateBidMock.throws(error);
      
      // Act & Assert
      expect(() => {
        handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);
      }).to.throw(error);
    });

    // Test successful order up
    it('should return correct state when player orders up', () => {
      // Arrange
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const expectedTrumpSuit = gameStateInOrderUpRound1.turnCard.suit;
      const expectedMakerTeam = gameStateInOrderUpRound1.players[playerRole].teamId;
      
      // Act
      const result = handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);
      
      // Assert
      expect(result.trumpSuit).to.equal(expectedTrumpSuit);
      expect(result.makerTeam).to.equal(expectedMakerTeam);
      expect(result.gamePhase).to.equal(GAME_PHASES.DEALER_DISCARD);
      expect(result.currentPlayer).to.equal(gameStateInOrderUpRound1.dealer);
    });

    // Test player passes
    it('should advance to next player when player passes', () => {
      // Arrange
      const currentPlayer = gameStateInOrderUpRound1.currentPlayer;
      const nextPlayer = testGetNextPlayer(currentPlayer);
      
      // Act
      const result = handleOrderUpDecision(gameStateInOrderUpRound1, currentPlayer, false);
      
      // Assert
      expect(result.currentPlayer).to.equal(nextPlayer);
      expect(result.trumpSuit).to.be.null;
    });

    // Test all players pass in round 1
    it('should advance to round 2 when all players pass in round 1', () => {
      // Arrange
      let currentState = deepCopy(gameStateInOrderUpRound1);
      const firstBidder = currentState.currentPlayer;
      
      // All players pass
      PLAYER_ROLES.forEach((_, index) => {
        const player = PLAYER_ROLES[(PLAYER_ROLES.indexOf(firstBidder) + index) % 4];
        currentState = handleOrderUpDecision(currentState, player, false);
      });
      
      // Assert
      expect(currentState.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND2);
      expect(currentState.currentPlayer).to.equal(firstBidder);
    });

    it('should call validateBid with correct arguments', () => {
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);
      expect(validateBidMock.calledOnceWith(gameStateInOrderUpRound1, playerRole, 'orderUp', null)).to.be.true;
      validateBidMock.resetHistory();
      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, false);
      expect(validateBidMock.calledOnceWith(gameStateInOrderUpRound1, playerRole, 'pass', null)).to.be.true;
    });

    it('should propagate errors from validateBid', () => {
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const expectedError = new NotPlayersTurnError(playerRole, 'otherPlayer');
      validateBidMock.throws(expectedError);
      expect(() => handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true)).to.throw(expectedError);
    });

    it('should throw PhaseLogicError if turnCard is missing when ordering up', () => {
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const stateWithoutTurnCard = { ...gameStateInOrderUpRound1, turnCard: null };
      validateBidMock.returns(true);
      expect(() => handleOrderUpDecision(stateWithoutTurnCard, playerRole, true))
        .to.throw(PhaseLogicError, "Cannot order up: turn card is missing.");
    });

    it('should throw PhaseLogicError if player team cannot be determined when ordering up', () => {
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const stateWithoutTeam = JSON.parse(JSON.stringify(gameStateInOrderUpRound1));
      delete stateWithoutTeam.players[playerRole].teamId;
      validateBidMock.returns(true);
      expect(() => handleOrderUpDecision(stateWithoutTeam, playerRole, true))
        .to.throw(PhaseLogicError, "Player team could not be determined for ordering up.");
    });

    it('Round 1: should advance currentPlayer if player passes', () => {
      const playerPassing = gameStateInOrderUpRound1.currentPlayer;
      validateBidMock.returns(true);
      const nextState = handleOrderUpDecision(gameStateInOrderUpRound1, playerPassing, false);
      expect(nextState.currentPlayer).to.equal(testGetNextPlayer(playerPassing));
    });

    it('Round 1: should set trump, maker, and transition to DEALER_DISCARD if player orders up', () => {
      const orderingPlayer = gameStateInOrderUpRound1.currentPlayer;
      validateBidMock.returns(true);
      const nextState = handleOrderUpDecision(gameStateInOrderUpRound1, orderingPlayer, true);
      expect(nextState.trumpSuit).to.equal(gameStateInOrderUpRound1.turnCard.suit);
      expect(nextState.makerTeam).to.equal(gameStateInOrderUpRound1.players[orderingPlayer].teamId);
      expect(nextState.gamePhase).to.equal(GAME_PHASES.DEALER_DISCARD);
    });

    it('Round 1: should correctly set makerTeam if dealer partner orders up', () => {
      validateBidMock.returns(true);
      let currentState = handleOrderUpDecision(gameStateInOrderUpRound1, PLAYER_ROLES[1], false);
      const orderingPartner = PLAYER_ROLES[2];
      const dealerTeam = currentState.players[currentState.dealer].teamId;
      validateBidMock.resetHistory();
      const nextState = handleOrderUpDecision(currentState, orderingPartner, true);
      expect(nextState.makerTeam).to.equal(dealerTeam);
    });

    it('Round 1: should transition to ORDER_UP_ROUND2 if all 4 players pass', () => {
      let currentState = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
      validateBidMock.returns(true);
      currentState = handleOrderUpDecision(currentState, PLAYER_ROLES[1], false);
      currentState = handleOrderUpDecision(currentState, PLAYER_ROLES[2], false);
      currentState = handleOrderUpDecision(currentState, PLAYER_ROLES[3], false);
      const finalState = handleOrderUpDecision(currentState, PLAYER_ROLES[0], false);
      expect(finalState.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND2);
    });
  });

  describe('handleDealerDiscard', () => {
    let gameStateForDiscard;
    let handleDealerDiscard;
    let validateDealerDiscardMock;
    const dealer = PLAYER_ROLES[0];
    const orderingPlayer = PLAYER_ROLES[1];
    const turnCardData = { 
      id: 'AD', 
      suit: SUITS.DIAMONDS, 
      value: VALUES.ACE, 
      name: 'Ace of Diamonds',
      rank: 6 // Assuming Ace has rank 6 in your game
    };
    let testDealerHand;

    beforeEach(async () => {
      validateDealerDiscardMock = sinon.stub();
      
      // Set up the module with mocks using path constants
      const biddingPhaseModule = await esmock(
        PATHS.BIDDING_PHASE,
        {
          [PATHS.VALIDATION]: {
            validateDealerDiscard: validateDealerDiscardMock,
            validateBid: sinon.stub()
          },
          [PATHS.LOGGER]: baseLoggerMock,
          [PATHS.ERRORS]: {
            PhaseLogicError,
            CardNotInHandError,
            InvalidDiscardError,
            NotPlayersTurnError,
            ValidationError,
            InvalidPhaseError
          }
        },
        {
          // Mock any Node.js built-ins if needed
        }
      );
      handleDealerDiscard = biddingPhaseModule.handleDealerDiscard;

      gameStateForDiscard = setupBiddingState(dealer, 1, turnCardData.suit);
      gameStateForDiscard.gamePhase = GAME_PHASES.DEALER_DISCARD;
      gameStateForDiscard.currentPlayer = dealer;
      gameStateForDiscard.dealer = dealer;
      gameStateForDiscard.playerWhoOrderedUp = orderingPlayer;
      gameStateForDiscard.trumpSuit = turnCardData.suit;
      gameStateForDiscard.turnCard = { ...turnCardData };
      // Initialize dealer's hand with complete card objects
      testDealerHand = [
        { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN, name: 'Ten of Clubs', rank: 2 },
        { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN, name: 'Queen of Clubs', rank: 4 },
        { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING, name: 'King of Clubs', rank: 5 },
        { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE, name: 'Ace of Clubs', rank: 6 },
        { id: '9S', suit: SUITS.SPADES, value: VALUES.NINE, name: 'Nine of Spades', rank: 1 }
      ];
      // The hand provided to handleDealerDiscard should be after pickup.
      gameStateForDiscard.players[dealer].hand = [...testDealerHand, gameStateForDiscard.turnCard]; // Now 6 cards
      gameStateForDiscard.makerTeam = gameStateForDiscard.players[orderingPlayer].teamId;
    });

    it('should call validateDealerDiscard with correct arguments (6-card hand)', () => {
      const cardToDiscardFrom6CardHand = gameStateForDiscard.players[dealer].hand[0]; // e.g., TC
      validateDealerDiscardMock.returns(true); // Assume validation passes

      handleDealerDiscard(gameStateForDiscard, dealer, cardToDiscardFrom6CardHand.id);

      expect(validateDealerDiscardMock.calledOnce).to.be.true;
      const validationArgs = validateDealerDiscardMock.firstCall.args;
      expect(validationArgs[0]).to.deep.equal(gameStateForDiscard); // gameState
      expect(validationArgs[1]).to.equal(dealer); // dealerRole
      expect(validationArgs[2]).to.deep.equal(cardToDiscardFrom6CardHand); // cardToDiscardObject
      expect(validationArgs[3]).to.deep.equal(gameStateForDiscard.players[dealer].hand); // The 6-card hand
      expect(validationArgs[3].length).to.equal(6);
    });

    it('should throw CardNotInHandError if card ID not in hand (preliminary check on 6-card hand)', () => {
        expect(() => handleDealerDiscard(gameStateForDiscard, dealer, 'XX')) // XX is not in the 6-card hand
            .to.throw(CardNotInHandError, "Card XX not found in dealer's hand.");
    });

    it('should propagate errors from validateDealerDiscard (when called with 6-card hand)', () => {
      const cardToDiscardFrom6CardHand = gameStateForDiscard.players[dealer].hand[0];
      const expectedError = new InvalidDiscardError("Only the dealer can discard.");
      validateDealerDiscardMock.throws(expectedError);
      expect(() => handleDealerDiscard(gameStateForDiscard, dealer, cardToDiscardFrom6CardHand.id))
        .to.throw(expectedError);
    });

    it('should throw PhaseLogicError if turnCard is missing in gameState (after validation passes)', () => {
      const cardToDiscardFrom6CardHand = gameStateForDiscard.players[dealer].hand[0];
      validateDealerDiscardMock.returns(true);
      const stateWithoutTurnCardOnTable = { ...gameStateForDiscard, turnCard: null };
      // Note: The turnCard is already part of the dealer's 6-card hand in this setup.
      // The function's internal logic uses gameState.turnCard for logging and potentially other things.
      // If gameState.turnCard is null, it means the card that *was* the turn card (and now in hand)
      // is somehow not referenced correctly at the game state level for the function's operation.
      // The function expects currentGameState.turnCard to be the card that was picked up.
      // This test ensures that if this reference is missing, it's handled.
      expect(() => handleDealerDiscard(stateWithoutTurnCardOnTable, dealer, cardToDiscardFrom6CardHand.id))
        .to.throw(PhaseLogicError, "Cannot discard: turn card is missing from game state.");
    });

    it('should allow dealer to discard a card, resulting in a 5-card hand (after validation passes)', () => {
      // gameStateForDiscard.players[dealer].hand is already 6 cards.
      // Let's say the dealer discards the first card from these 6.
      const cardToDiscardObj = gameStateForDiscard.players[dealer].hand[0]; // e.g., TC
      const pickedUpTurnCard = gameStateForDiscard.turnCard; // e.g., AD (Diamonds Ace)

      validateDealerDiscardMock.returns(true); // Assume validation passes

      const nextState = handleDealerDiscard(gameStateForDiscard, dealer, cardToDiscardObj.id);

      expect(nextState.players[dealer].hand.length).to.equal(5); // Corrected assertion
      // Ensure the card that was on the table (pickedUpTurnCard) is in the final 5-card hand,
      // unless it was the one discarded.
      if (cardToDiscardObj.id !== pickedUpTurnCard.id) {
        expect(nextState.players[dealer].hand.some(c => c.id === pickedUpTurnCard.id)).to.be.true;
      }
      // Ensure the discarded card is NOT in the hand.
      expect(nextState.players[dealer].hand.some(c => c.id === cardToDiscardObj.id)).to.be.false;
    });
  });

  describe('handleCallTrumpDecision', () => {
    let gameStateInCallTrumpRound;
    let handleCallTrumpDecision;
    let validateBidMock;
    const originalTurnCardSuit = SUITS.DIAMONDS;

    beforeEach(async () => {
      validateBidMock = sinon.stub();
      
      // Set up the module with mocks using path constants
      const biddingPhaseModule = await esmock(
        PATHS.BIDDING_PHASE,
        {
          [PATHS.VALIDATION]: {
            validateBid: validateBidMock,
            validateDealerDiscard: sinon.stub()
          },
          [PATHS.LOGGER]: baseLoggerMock,
          [PATHS.ERRORS]: {
            PhaseLogicError,
            ValidationError,
            NotPlayersTurnError,
            InvalidBidError,
            InvalidPhaseError
          }
        },
        {
          // Mock any Node.js built-ins if needed
        }
      );
      handleCallTrumpDecision = biddingPhaseModule.handleCallTrumpDecision;

      // Setup initial game state for call trump round
      gameStateInCallTrumpRound = setupBiddingState(PLAYER_ROLES[0], 2, originalTurnCardSuit);
      gameStateInCallTrumpRound.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
      gameStateInCallTrumpRound.currentPlayer = PLAYER_ROLES[1]; // Start with player after dealer
      gameStateInCallTrumpRound.dealer = PLAYER_ROLES[0];
    });

    it('should call validateBid with correct arguments', () => {
      const playerRole = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      handleCallTrumpDecision(gameStateInCallTrumpRound, playerRole, true, suitToCall);
      expect(validateBidMock.calledOnceWith(gameStateInCallTrumpRound, playerRole, 'callTrump', suitToCall)).to.be.true;

      validateBidMock.resetHistory();
      handleCallTrumpDecision(gameStateInCallTrumpRound, playerRole, false, null);
      expect(validateBidMock.calledOnceWith(gameStateInCallTrumpRound, playerRole, 'pass', null)).to.be.true;
    });

    it('should propagate errors from validateBid', () => {
      const playerRole = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      const expectedError = new InvalidBidError("Invalid suit.");
      validateBidMock.throws(expectedError);
      expect(() => handleCallTrumpDecision(gameStateInCallTrumpRound, playerRole, true, suitToCall))
        .to.throw(expectedError);
    });

    it('should throw PhaseLogicError if player team cannot be determined when calling trump', () => {
      const playerRole = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      const stateWithoutTeam = JSON.parse(JSON.stringify(gameStateInCallTrumpRound));
      delete stateWithoutTeam.players[playerRole].teamId;
      validateBidMock.returns(true); // Assume validateBid passes

      expect(() => handleCallTrumpDecision(stateWithoutTeam, playerRole, true, suitToCall))
        .to.throw(PhaseLogicError, "Player team could not be determined for calling trump.");
    });

    it('Round 2: should advance currentPlayer if player passes (after validation passes)', () => {
      const playerPassing = gameStateInCallTrumpRound.currentPlayer;
      validateBidMock.returns(true);
      const nextState = handleCallTrumpDecision(gameStateInCallTrumpRound, playerPassing, false);
      expect(nextState.currentPlayer).to.equal(testGetNextPlayer(playerPassing));
    });

    it('Round 2: should set trump, maker, and transition to GOING_ALONE if player calls a valid suit (after validation passes)', () => {
      const callingPlayer = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      validateBidMock.returns(true);
      const nextState = handleCallTrumpDecision(gameStateInCallTrumpRound, callingPlayer, true, suitToCall);
      expect(nextState.trumpSuit).to.equal(suitToCall);
      expect(nextState.makerTeam).to.equal(gameStateInCallTrumpRound.players[callingPlayer].teamId);
      expect(nextState.gamePhase).to.equal(GAME_PHASES.GOING_ALONE_DECISION);
    });

    it('Round 2: should transition to DEALING (misdeal) if all 4 players pass (dealer passes last, after validation passes)', () => {
      let currentState = setupBiddingState(PLAYER_ROLES[0], 2, SUITS.DIAMONDS); // Re-setup for clean bids array
      validateBidMock.returns(true); // Assume all calls to validateBid pass

      currentState = handleCallTrumpDecision(currentState, PLAYER_ROLES[1], false);
      currentState = handleCallTrumpDecision(currentState, PLAYER_ROLES[2], false);
      currentState = handleCallTrumpDecision(currentState, PLAYER_ROLES[3], false);
      const finalState = handleCallTrumpDecision(currentState, PLAYER_ROLES[0], false);
      expect(finalState.gamePhase).to.equal(GAME_PHASES.DEALING);
    });
  });
});
