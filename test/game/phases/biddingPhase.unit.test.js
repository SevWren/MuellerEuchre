/**
 * @file test/phases/biddingPhase.unit.test.js
 * @module test/phases/biddingPhase.unit
 * @description
 *   Unit tests for the bidding phase logic of the Euchre Multiplayer game.
 *   These tests cover the pure functions responsible for handling order up decisions,
 *   dealer discards, and call trump decisions, including all validation and state transitions.
 *
 *   CURRENT STATE:
 *     - These tests use the standard `createMockedModule` wrapper to isolate and mock dependencies
 *       for each function under test, adhering to the project's testing conventions.
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
import { createMockedModule } from '../../utils/esmock_wrapper.js';

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
  const turnCard = deck.length > 0 ? deck.pop() : { id: 'AH', suit: SUITS.HEARTS, value: VALUES.ACE, name: 'Ace of Hearts' };
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
  let gameState = JSON.parse(JSON.stringify(createInitialGameState(dealer)));
  
  gameState.roundNumber = round;
  gameState.gamePhase = (round === 1) ? GAME_PHASES.ORDER_UP_ROUND1 : GAME_PHASES.ORDER_UP_ROUND2;
  
  const cardValue = VALUES[VALUES.length - 1]; // Use ACE
  const suit = turnCardSuit || SUITS.HEARTS;
  const valueChar = (cardValue && typeof cardValue === 'string') ? cardValue.charAt(0).toUpperCase() : 'A';
  const suitChar = (suit && typeof suit === 'string') ? suit.charAt(0).toUpperCase() : 'H';
  
  gameState.turnCard = {
    id: `${valueChar}${suitChar}`,
    suit: suit,
    value: cardValue,
    name: `${cardValue} of ${suit}`,
    rank: VALUES.indexOf(cardValue) + 1
  };
  
  gameState.currentPlayer = testGetNextPlayer(dealer);
  
  return gameState;
};

describe('BiddingPhase Logic', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handleOrderUpDecision', () => {
    let gameStateInOrderUpRound1;
    let validateBidMock;
    let handleOrderUpDecision;

    const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

    beforeEach(async () => {
      validateBidMock = sinon.stub();

      const { module: biddingPhaseModule } = await createMockedModule(
        import.meta.url,
        '../../../src/game/phases/biddingPhase.js',
        {
          '../logic/validation.js': {
            validateBid: validateBidMock,
            validateDealerDiscard: sinon.stub().returns(true)
          }
        }
      );

      handleOrderUpDecision = biddingPhaseModule.handleOrderUpDecision;
      gameStateInOrderUpRound1 = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
    });

    it('should not modify the input gameState', () => {
      const originalState = deepCopy(gameStateInOrderUpRound1);
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      
      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);
      
      expect(gameStateInOrderUpRound1).to.deep.equal(originalState);
    });

    it('should call validateBid with correct parameters', () => {
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const wantsToOrderUp = true;
      
      handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, wantsToOrderUp);
      
      expect(validateBidMock.calledOnce).to.be.true;
      const [state, role, bidType, suit] = validateBidMock.firstCall.args;
      expect(state).to.equal(gameStateInOrderUpRound1);
      expect(role).to.equal(playerRole);
      expect(bidType).to.equal('orderUp');
      expect(suit).to.be.null;
    });

    it('should propagate validation errors', () => {
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const error = new Error('Validation failed');
      validateBidMock.throws(error);
      
      expect(() => {
        handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);
      }).to.throw(error);
    });

    it('should return correct state when player orders up', () => {
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const expectedTrumpSuit = gameStateInOrderUpRound1.turnCard.suit;
      const expectedMakerTeam = gameStateInOrderUpRound1.players[playerRole].teamId;
      
      const result = handleOrderUpDecision(gameStateInOrderUpRound1, playerRole, true);
      
      expect(result.trumpSuit).to.equal(expectedTrumpSuit);
      expect(result.makerTeam).to.equal(expectedMakerTeam);
      expect(result.gamePhase).to.equal(GAME_PHASES.DEALER_DISCARD);
      expect(result.currentPlayer).to.equal(gameStateInOrderUpRound1.dealer);
    });

    it('should advance to next player when player passes', () => {
      const currentPlayer = gameStateInOrderUpRound1.currentPlayer;
      const nextPlayer = testGetNextPlayer(currentPlayer);
      
      const result = handleOrderUpDecision(gameStateInOrderUpRound1, currentPlayer, false);
      
      expect(result.currentPlayer).to.equal(nextPlayer);
      expect(result.trumpSuit).to.be.null;
    });

    it('should advance to round 2 when all players pass in round 1', () => {
      let currentState = deepCopy(gameStateInOrderUpRound1);
      const firstBidder = currentState.currentPlayer;
      
      PLAYER_ROLES.forEach((_, index) => {
        const player = PLAYER_ROLES[(PLAYER_ROLES.indexOf(firstBidder) + index) % 4];
        currentState = handleOrderUpDecision(currentState, player, false);
      });
      
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
      validateBidMock.returns(true); // Assume pre-validation passes to isolate the logic error
      try {
        handleOrderUpDecision(stateWithoutTurnCard, playerRole, true);
        // If the function does not throw, this test should fail.
        expect.fail('Expected PhaseLogicError to be thrown but no error was thrown.');
      } catch (error) {
        // Assert on the properties of the caught error.
        expect(error.name).to.equal('PhaseLogicError');
        expect(error.message).to.equal("Cannot order up: turn card is missing.");
      }
    });

    it('should throw PhaseLogicError if player team cannot be determined when ordering up', () => {
      const playerRole = gameStateInOrderUpRound1.currentPlayer;
      const stateWithoutTeam = JSON.parse(JSON.stringify(gameStateInOrderUpRound1));
      delete stateWithoutTeam.players[playerRole].teamId;
      validateBidMock.returns(true); // Assume pre-validation passes
      try {
        handleOrderUpDecision(stateWithoutTeam, playerRole, true);
        // If the function does not throw, this test should fail.
        expect.fail('Expected PhaseLogicError to be thrown but it was not.');
      } catch (error) {
        // Assert on the properties of the caught error.
        expect(error.name).to.equal('PhaseLogicError');
        expect(error.message).to.equal("Player team could not be determined for ordering up.");
      }
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
      rank: 6
    };
    let testDealerHand;

    beforeEach(async () => {
      validateDealerDiscardMock = sinon.stub();
      
      const { module: biddingPhaseModule } = await createMockedModule(
        import.meta.url,
        '../../../src/game/phases/biddingPhase.js',
        {
          '../logic/validation.js': {
            validateDealerDiscard: validateDealerDiscardMock,
            validateBid: sinon.stub()
          },
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
      
      testDealerHand = [
        { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN, name: 'Ten of Clubs', rank: 2 },
        { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN, name: 'Queen of Clubs', rank: 4 },
        { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING, name: 'King of Clubs', rank: 5 },
        { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE, name: 'Ace of Clubs', rank: 6 },
        { id: '9S', suit: SUITS.SPADES, value: VALUES.NINE, name: 'Nine of Spades', rank: 1 }
      ];
      gameStateForDiscard.players[dealer].hand = [...testDealerHand, gameStateForDiscard.turnCard];
      gameStateForDiscard.makerTeam = gameStateForDiscard.players[orderingPlayer].teamId;
    });

    it('should call validateDealerDiscard with correct arguments (6-card hand)', () => {
      const cardToDiscardFrom6CardHand = gameStateForDiscard.players[dealer].hand[0];
      validateDealerDiscardMock.returns(true);

      handleDealerDiscard(gameStateForDiscard, dealer, cardToDiscardFrom6CardHand.id);

      expect(validateDealerDiscardMock.calledOnce).to.be.true;
      const validationArgs = validateDealerDiscardMock.firstCall.args;
      expect(validationArgs[0]).to.deep.equal(gameStateForDiscard);
      expect(validationArgs[1]).to.equal(dealer);
      expect(validationArgs[2]).to.deep.equal(cardToDiscardFrom6CardHand);
      expect(validationArgs[3]).to.deep.equal(gameStateForDiscard.players[dealer].hand);
      expect(validationArgs[3].length).to.equal(6);
    });

    it('should throw CardNotInHandError if card ID not in hand (preliminary check on 6-card hand)', () => {
        expect(() => handleDealerDiscard(gameStateForDiscard, dealer, 'XX'))
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
      expect(() => handleDealerDiscard(stateWithoutTurnCardOnTable, dealer, cardToDiscardFrom6CardHand.id))
        .to.throw(PhaseLogicError, "Cannot discard: turn card is missing from game state.");
    });

    it('should allow dealer to discard a card, resulting in a 5-card hand (after validation passes)', () => {
      const cardToDiscardObj = gameStateForDiscard.players[dealer].hand[0];
      const pickedUpTurnCard = gameStateForDiscard.turnCard;

      validateDealerDiscardMock.returns(true);

      const nextState = handleDealerDiscard(gameStateForDiscard, dealer, cardToDiscardObj.id);

      expect(nextState.players[dealer].hand.length).to.equal(5);
      if (cardToDiscardObj.id !== pickedUpTurnCard.id) {
        expect(nextState.players[dealer].hand.some(c => c.id === pickedUpTurnCard.id)).to.be.true;
      }
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
      
      const { module: biddingPhaseModule } = await createMockedModule(
        import.meta.url,
        '../../../src/game/phases/biddingPhase.js',
        {
          '../logic/validation.js': {
            validateBid: validateBidMock,
            validateDealerDiscard: sinon.stub()
          },
        }
      );
      handleCallTrumpDecision = biddingPhaseModule.handleCallTrumpDecision;

      gameStateInCallTrumpRound = setupBiddingState(PLAYER_ROLES[0], 2, originalTurnCardSuit);
      gameStateInCallTrumpRound.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
      gameStateInCallTrumpRound.currentPlayer = PLAYER_ROLES[1];
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
      validateBidMock.returns(true);

      expect(() => handleCallTrumpDecision(stateWithoutTeam, playerRole, true, suitToCall))
        .to.throw(PhaseLogicError, "Player team could not be determined for calling trump.");
    });

    it('Round 2: should advance currentPlayer if player passes (after validation passes)', () => {
      const playerPassing = gameStateInCallTrumpRound.currentPlayer;
      validateBidMock.returns(true);
      const nextState = handleCallTrumpDecision(gameStateInCallTrumpRound, playerPassing, false);
      expect(nextState.currentPlayer).to.equal(testGetNextPlayer(playerPassing));
    });

    it('Round 2: should set trump, maker, and transition to GOING_ALONE_DECISION if player calls a valid suit (after validation passes)', () => {
      const callingPlayer = gameStateInCallTrumpRound.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      validateBidMock.returns(true);
      const nextState = handleCallTrumpDecision(gameStateInCallTrumpRound, callingPlayer, true, suitToCall);
      expect(nextState.trumpSuit).to.equal(suitToCall);
      expect(nextState.makerTeam).to.equal(gameStateInCallTrumpRound.players[callingPlayer].teamId);
      expect(nextState.gamePhase).to.equal(GAME_PHASES.GOING_ALONE_DECISION);
    });

    it('Round 2: should transition to DEALING (misdeal) if all 4 players pass (dealer passes last, after validation passes)', () => {
      let currentState = setupBiddingState(PLAYER_ROLES[0], 2, SUITS.DIAMONDS);
      validateBidMock.returns(true);

      currentState = handleCallTrumpDecision(currentState, PLAYER_ROLES[1], false);
      currentState = handleCallTrumpDecision(currentState, PLAYER_ROLES[2], false);
      currentState = handleCallTrumpDecision(currentState, PLAYER_ROLES[3], false);
      const finalState = handleCallTrumpDecision(currentState, PLAYER_ROLES[0], false);
      expect(finalState.gamePhase).to.equal(GAME_PHASES.DEALING);
    });
  });
});