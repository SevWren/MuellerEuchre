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

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import test utilities and constants
const projectRoot = path.resolve(__dirname, '../../..');

// Import using relative paths
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
  let gameState = createInitialGameState(dealer);
  gameState.roundNumber = round;
  gameState.gamePhase = (round === 1) ? GAME_PHASES.ORDER_UP_ROUND1 : GAME_PHASES.ORDER_UP_ROUND2;
  if (gameState.turnCard) {
    gameState.turnCard.suit = turnCardSuit;
    gameState.turnCard.value = gameState.turnCard.value || VALUES.ACE;
    gameState.turnCard.id = `${gameState.turnCard.value.charAt(0).toUpperCase()}${turnCardSuit.charAt(0).toUpperCase()}`;
  } else {
    gameState.turnCard = { id: `A${turnCardSuit.charAt(0).toUpperCase()}`, suit: turnCardSuit, value: VALUES.ACE };
  }
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

    beforeEach(async () => {
      validateBidMock = sinon.stub();
      
      // Use file URLs for Windows compatibility
      const toFileUrl = (filepath) => {
        const pathName = path.resolve(filepath).replace(/\\/g, '/');
        return 'file:///' + pathName;
      };

      const projectRoot = path.resolve(__dirname, '../../..');
      const biddingPhasePath = toFileUrl(path.join(projectRoot, 'src/game/phases/biddingPhase.js'));
      const validationPath = toFileUrl(path.join(projectRoot, 'src/game/logic/validation.js'));
      const loggerPath = toFileUrl(path.join(projectRoot, 'src/utils/logger.js'));
      
      const biddingPhaseModule = await esmock(biddingPhasePath, {
        [validationPath]: { 
          validateBid: validateBidMock,
          validateDealerDiscard: sinon.stub().returns(true)
        },
        [loggerPath]: baseLoggerMock
      });
      handleOrderUpDecision = biddingPhaseModule.handleOrderUpDecision;
      gameStateInOrderUpRound1 = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
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
    const turnCardData = { id: 'AD', suit: SUITS.DIAMONDS, value: VALUES.ACE };
    let testDealerHand;

    beforeEach(async () => {
      validateDealerDiscardMock = sinon.stub();
      const biddingPhaseModule = await esmock('../../src/game/phases/biddingPhase.js', {
          '../../src/game/logic/validation.js': {
            validateDealerDiscard: validateDealerDiscardMock,
            validateBid: sinon.stub()
          },
          '../../src/utils/logger.js': baseLoggerMock,
          '../../src/game/logic/errors.js': { PhaseLogicError, CardNotInHandError, InvalidDiscardError, NotPlayersTurnError, ValidationError, InvalidPhaseError }
      });
      handleDealerDiscard = biddingPhaseModule.handleDealerDiscard;

      gameStateForDiscard = setupBiddingState(dealer, 1, turnCardData.suit);
      gameStateForDiscard.gamePhase = GAME_PHASES.DEALER_DISCARD;
      gameStateForDiscard.currentPlayer = dealer;
      gameStateForDiscard.dealer = dealer;
      gameStateForDiscard.playerWhoOrderedUp = orderingPlayer;
      gameStateForDiscard.trumpSuit = turnCardData.suit;
      gameStateForDiscard.turnCard = { ...turnCardData };
      testDealerHand = [
        { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN },
        { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN },
        { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING },
        { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE },
        { id: '9S', suit: SUITS.SPADES, value: VALUES.NINE },
      ];
      // Original 5 cards for the dealer
      testDealerHand = [
        { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN },
        { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN },
        { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING },
        { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE },
        { id: '9S', suit: SUITS.SPADES, value: VALUES.NINE },
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
      // Ensure game state's turnCard (on table) is now null.
      expect(nextState.turnCard).to.be.null;
    });
  });

  describe('handleCallTrumpDecision', () => {
    let gameStateInCallTrumpRound;
    let handleCallTrumpDecision; // Will be esmocked version
    let validateBidMock;
    const dealer = PLAYER_ROLES[0];
    const originalTurnCardSuit = SUITS.DIAMONDS;

    beforeEach(async () => {
      validateBidMock = sinon.stub();
      const biddingPhaseModule = await esmock('../../src/game/phases/biddingPhase.js', {
          '../../src/game/logic/validation.js': {
            validateBid: validateBidMock,
            // Provide stubs for other validation functions if they are in the same file
            // and might be called by other functions in biddingPhase.js
            validateDealerDiscard: sinon.stub(),
          },
          '../../src/utils/logger.js': baseLoggerMock,
          '../../src/game/logic/errors.js': { PhaseLogicError, InvalidBidError, NotPlayersTurnError, ValidationError, InvalidPhaseError }
      });
      handleCallTrumpDecision = biddingPhaseModule.handleCallTrumpDecision;

      gameStateInCallTrumpRound = setupBiddingState(dealer, 2, originalTurnCardSuit);
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
