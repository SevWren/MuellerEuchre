/**
 * @file test/phases/startNewHandPhase.unit.test.js
 * @module test/phases/startNewHandPhase.unit
 * @description
 *   Unit tests for the start new hand phase logic of the Euchre Multiplayer game.
 *   These tests cover deck creation, dealing, dealer rotation, and error handling
 *   for starting a new hand.
 *
 *   CURRENT STATE:
 *     - Tests use esmock to mock deck, player, and logger dependencies.
 *     - All scenarios for dealing, dealer rotation, and error propagation are covered.
 *     - The file is focused on Layer 1 logic, not on state management or network.
 *
 *   WHEN THE PROJECT IS COMPLETE:
 *     - This file will serve as the definitive test suite for Layer 1 start new hand logic.
 *     - All rules for dealing, dealer rotation, and hand initialization will be validated here.
 *     - No test will require integration with state, persistence, or network code.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, VALUES } from '../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  PhaseLogicError,
} from '../../src/game/logic/errors.js';

// Default logger mock
const defaultLoggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
};

// Helper to create a base game state for tests
const createBaseGameState = (phase = GAME_PHASES.LOBBY, dealer = PLAYER_ROLES[0]) => {
  const gameState = {
    gameId: 'startNewHandTestGame',
    gamePhase: phase,
    players: {},
    dealer: dealer,
    currentPlayer: null,
    gameMessages: [],
    // ... other minimal required fields by startNewHand
    teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, // Needed for reset
  };

  for (const role of PLAYER_ROLES) {
    gameState.players[role] = {
      id: role,
      name: `Player ${role}`,
      isConnected: true,
      teamId: (role === PLAYER_ROLES[0] || role === PLAYER_ROLES[2]) ? TEAMS.TEAM_NS : TEAMS.TEAM_EW,
      hand: [], // Empty hand initially
    };
  }
  return gameState;
};

// Helper to create a mock deck
const createMockDeck = (numCards = 24) => {
  return Array(numCards).fill(null).map((_, i) => ({
    id: `C${i}`,
    suit: SUITS.HEARTS, // Default suit
    value: Object.values(VALUES)[i % Object.values(VALUES).length], // Cycle through values
  }));
};

describe('StartNewHandPhase Logic', () => {
  let startNewHand;
  let createDeckMock, shuffleDeckMock, cardToIdMock;
  let getNextPlayerMock;

  beforeEach(async () => {
    createDeckMock = sinon.stub();
    shuffleDeckMock = sinon.stub().callsFake(deck => deck); // Pass through by default
    cardToIdMock = sinon.stub().returns('MockCardID'); // Returns a generic ID
    getNextPlayerMock = sinon.stub();

    const startNewHandPhaseModule = await esmock('../../src/game/phases/startNewHandPhase.js', {
      '../../src/utils/deck.js': {
        createDeck: createDeckMock,
        shuffleDeck: shuffleDeckMock,
        cardToId: cardToIdMock,
      },
      '../../src/utils/players.js': { getNextPlayer: getNextPlayerMock },
      '../../src/utils/logger.js': defaultLoggerMock,
      // No state.js or gameRepository.js mocks needed as startNewHand is pure
    });
    startNewHand = startNewHandPhaseModule.startNewHand;

    // Reset history for stubs that might be called multiple times across tests
    createDeckMock.resetHistory();
    shuffleDeckMock.resetHistory();
    cardToIdMock.resetHistory();
    getNextPlayerMock.resetHistory();
    defaultLoggerMock.info.resetHistory();
    defaultLoggerMock.warn.resetHistory();
    defaultLoggerMock.error.resetHistory();
  });

  afterEach(() => {
    sinon.restore();
  });

  // Error Handling Tests
  it('should throw ValidationError if currentGameState is null', () => {
    expect(() => startNewHand(null))
      .to.throw(ValidationError, 'startNewHand: Missing or invalid currentGameState (must include players and gameId).');
  });

  it('should throw ValidationError if currentGameState.players is missing', () => {
    const gameState = { gameId: 'test' }; // Missing players
    expect(() => startNewHand(gameState))
      .to.throw(ValidationError, 'startNewHand: Missing or invalid currentGameState (must include players and gameId).');
  });

  it('should throw InvalidPhaseError if game phase is not DEALING, LOBBY, SCORING, or GAME_OVER', () => {
    const gameState = createBaseGameState(GAME_PHASES.PLAYING);
    expect(() => startNewHand(gameState))
      .to.throw(InvalidPhaseError, `Cannot start a new hand from the current game phase: ${GAME_PHASES.PLAYING}.`);
  });

  it('should throw PhaseLogicError if kitty is empty before setting turn card', () => {
    const gameState = createBaseGameState();
    // Create a deck that will be empty after dealing (4 players * 5 cards = 20 cards)
    createDeckMock.returns(createMockDeck(20));
    getNextPlayerMock.returns(PLAYER_ROLES[1]); // Mock return for dealer rotation and first bidder

    expect(() => startNewHand(gameState))
      .to.throw(PhaseLogicError, "Error in dealing: Kitty is empty before setting turn card!");
  });

  it('should throw PhaseLogicError if no turn card can be set (kitty becomes empty exactly after dealing)', () => {
    // This scenario is essentially the same as the one above with a deck of 20.
    // If deck has 20 cards, after dealing 5 to each of 4 players, kitty is empty, turnCard cannot be popped.
    const gameState = createBaseGameState();
    createDeckMock.returns(createMockDeck(20));
    getNextPlayerMock.returns(PLAYER_ROLES[1]);

    expect(() => startNewHand(gameState))
      .to.throw(PhaseLogicError, "Error in dealing: Kitty is empty before setting turn card!");
      // Note: The "No turn card could be set" error is secondary if kitty is empty first.
      // To test "No turn card could be set" specifically, kitty must have 0 cards when pop is attempted.
      // This is covered by the "kitty is empty" test if pop fails on empty array.
  });


  // Success Path Tests
  it('should correctly start a new hand from LOBBY phase (keeps initial dealer)', () => {
    const initialDealer = PLAYER_ROLES[0]; // South
    // For the first hand from LOBBY, the initial dealer is kept if already set.
    const expectedDealerForFirstHand = initialDealer;
    const expectedFirstBidder = PLAYER_ROLES[1]; // West (left of South)

    const gameState = createBaseGameState(GAME_PHASES.LOBBY, initialDealer);

    const mockDeck = createMockDeck(24);
    createDeckMock.returns([...mockDeck]);

    // getNextPlayer is NOT called to determine new dealer in this specific LOBBY path.
    // It IS called to determine the first bidder (left of expectedDealerForFirstHand).
    getNextPlayerMock.withArgs(expectedDealerForFirstHand, PLAYER_ROLES).returns(expectedFirstBidder);

    const newState = startNewHand(gameState);

    expect(newState.dealer).to.equal(expectedDealerForFirstHand); // South remains dealer
    expect(newState.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND1);
    expect(newState.currentPlayer).to.equal(expectedFirstBidder); // West bids
    expect(newState.orderUpTurn).to.equal(expectedFirstBidder);

    PLAYER_ROLES.forEach(role => {
      expect(newState.players[role].hand.length).to.equal(5);
    });
    expect(newState.turnCard).to.be.an('object');
    expect(newState.turnCard).to.have.all.keys('id', 'suit', 'value');
    expect(newState.kitty.length).to.equal(3);

    // Check state resets
    expect(newState.trumpSuit).to.be.null;
    expect(newState.bids).to.deep.equal([]);
    expect(newState.roundNumber).to.equal(1);
    // ... (other state resets are important too)
    expect(newState.tricksTaken).to.deep.equal({ [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 });
    expect(newState.gameMessages.length).to.be.greaterThan(0);
    // Message should reflect the dealer that was kept
    expect(newState.gameMessages[newState.gameMessages.length -1].text).to.include(`New hand started. Dealer is ${expectedDealerForFirstHand}.`);

    // getNextPlayer(initialDealer, PLAYER_ROLES) is called twice:
    // 1. To determine starting index for dealing.
    // 2. To determine firstBidder.
    expect(getNextPlayerMock.calledWith(expectedDealerForFirstHand, PLAYER_ROLES)).to.be.true;
    expect(getNextPlayerMock.callCount).to.equal(2);
  });

  it('should correctly start a new hand after SCORING phase', () => {
    const previousDealer = PLAYER_ROLES[3]; // East
    const expectedNewDealer = PLAYER_ROLES[0]; // South
    const expectedFirstBidder = PLAYER_ROLES[1]; // West

    const gameState = createBaseGameState(GAME_PHASES.SCORING, previousDealer);
    gameState.teamScores = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 3 }; // Existing scores

    const mockDeck = createMockDeck(24);
    createDeckMock.returns([...mockDeck]);

    getNextPlayerMock.withArgs(previousDealer, PLAYER_ROLES).returns(expectedNewDealer);
    getNextPlayerMock.withArgs(expectedNewDealer, PLAYER_ROLES).returns(expectedFirstBidder);

    const newState = startNewHand(gameState);

    expect(newState.dealer).to.equal(expectedNewDealer);
    expect(newState.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND1);
    expect(newState.currentPlayer).to.equal(expectedFirstBidder);
    expect(newState.teamScores).to.deep.equal(gameState.teamScores); // Scores should persist
    expect(newState.players[PLAYER_ROLES[0]].hand.length).to.equal(5);
    expect(newState.turnCard).to.exist;
    expect(newState.kitty.length).to.equal(3);
  });

  it('should handle new hand from DEALING phase (e.g. misdeal recovery)', () => {
    // If game was already in DEALING, it implies a dealer might have been set for that deal.
    // startNewHand will rotate from that existing dealer.
    const currentDealerForMisdeal = PLAYER_ROLES[1]; // West was dealer for the misdeal
    const expectedNewDealer = PLAYER_ROLES[2];       // North becomes new dealer
    const expectedFirstBidder = PLAYER_ROLES[3];     // East bids first

    const gameState = createBaseGameState(GAME_PHASES.DEALING, currentDealerForMisdeal);

    const mockDeck = createMockDeck(24);
    createDeckMock.returns([...mockDeck]);

    getNextPlayerMock.withArgs(currentDealerForMisdeal, PLAYER_ROLES).returns(expectedNewDealer);
    getNextPlayerMock.withArgs(expectedNewDealer, PLAYER_ROLES).returns(expectedFirstBidder);

    const newState = startNewHand(gameState);

    expect(newState.dealer).to.equal(expectedNewDealer);
    expect(newState.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND1);
    expect(newState.currentPlayer).to.equal(expectedFirstBidder);
  });
});
