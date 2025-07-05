/**
 * @file test/phases/goAlonePhase.unit.test.js
 * @module test/phases/goAlonePhase.unit
 * @description
 *   Unit tests for the "Go Alone" phase logic in Euchre Multiplayer.
 *   These tests verify correct validation, error handling, and state transitions
 *   when a player decides to go alone or play with a partner.
 *
 *   CURRENT STATE:
 *     - Tests use esmock to mock dependencies and isolate the pure logic.
 *     - All validation, error, and state transition scenarios are covered.
 *     - The test file is focused on Layer 1 logic, not on state management or network.
 *
 *   WHEN THE PROJECT IS COMPLETE:
 *     - This file will serve as the authoritative test suite for "Go Alone" logic in Layer 1.
 *     - All possible decision paths and edge cases will be validated here.
 *     - No test will require integration with state, persistence, or network code.
 */

import { expect } from "chai";
import sinon from "sinon";
import { esmockWithPaths } from "../../utils/esmock_wrapper.js";
import { createMockLogger, resetMocks } from "../../utils/testMocks.js";

// Import constants and errors directly
import {
  GAME_PHASES,
  PLAYER_ROLES,
  TEAMS,
} from "../../../src/config/constants.js";

import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  PhaseLogicError,
} from "../../../src/game/logic/errors.js";

// Create logger mock
const defaultLoggerMock = createMockLogger();

// Helper to create a base game state for go_alone phase tests
const createGoAloneGameState = (currentPlayer, trumpMaker) => ({
  gameId: "goAloneTestGame",
  gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
  players: {
    [PLAYER_ROLES[0]]: {
      id: PLAYER_ROLES[0],
      name: "South",
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[1]]: {
      id: PLAYER_ROLES[1],
      name: "West",
      teamId: TEAMS.TEAM_EW,
    },
    [PLAYER_ROLES[2]]: {
      id: PLAYER_ROLES[2],
      name: "North",
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[3]]: {
      id: PLAYER_ROLES[3],
      name: "East",
      teamId: TEAMS.TEAM_EW,
    },
  },
  currentPlayer: currentPlayer || PLAYER_ROLES[0],
  dealer: PLAYER_ROLES[0],
  makerTeam: trumpMaker ? TEAMS.TEAM_NS : TEAMS.TEAM_EW,
  playerWhoOrderedUp: trumpMaker || PLAYER_ROLES[0],
  currentTrick: [],
  tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  gameMessages: [],
  settings: { winningScore: 10 },
  leadSuit: null, // Should be null before play starts
});

describe("GoAlonePhase Logic", () => {
  let handleGoAloneDecision;
  let updateGameStateStub;
  let getNextPlayerMock;
  let getPartnerMock;
  let currentTestGameStateForStub; // To be set by each test
  let sandbox;

  beforeEach(async () => {
    // Create a fresh sandbox for each test
    sandbox = sinon.createSandbox();
    
    // Setup stubs
    updateGameStateStub = sandbox.stub().callsFake((updaterFn) => {
      // The updater function will receive the gameState set by currentTestGameStateForStub
      return updaterFn(currentTestGameStateForStub);
    });
    
    getNextPlayerMock = sandbox.stub();
    getPartnerMock = sandbox.stub();

    // Reset the logger mocks
    resetMocks(sandbox, { defaultLoggerMock });

    // Import the module with mocked dependencies using esmockWithPaths
    const goAlonePhaseModule = await esmockWithPaths(
      import.meta.url,
      '../../../src/game/phases/goAlonePhase.js',
      {
        '@/utils/logger.js': defaultLoggerMock,
        '@/utils/players.js': {
          getNextPlayer: getNextPlayerMock,
          getPartner: getPartnerMock,
        },
        // Errors are imported by the test file directly for assertions
      }
    );

    handleGoAloneDecision = goAlonePhaseModule.handleGoAloneDecision;
  });

  afterEach(() => {
    // Restore the sandbox and reset all mocks after each test
    sandbox.restore();
    sinon.restore();
  });

  // Argument Validation Tests
  it("should throw ValidationError if currentGameState is null", () => {
    expect(() => handleGoAloneDecision(null, PLAYER_ROLES[0], true)).to.throw(
      ValidationError,
      "Internal error: Missing or invalid arguments for go alone decision.",
    );
  });
  it("should throw ValidationError if decidingPlayerRole is invalid", () => {
    const gameState = createGoAloneGameState(PLAYER_ROLES[0], PLAYER_ROLES[0]);
    expect(() =>
      handleGoAloneDecision(gameState, "InvalidRole", true),
    ).to.throw(
      ValidationError,
      "Internal error: Missing or invalid arguments for go alone decision.",
    );
  });
  it("should throw ValidationError if wantsToGoAlone is not boolean", () => {
    const gameState = createGoAloneGameState(PLAYER_ROLES[0], PLAYER_ROLES[0]);
    expect(() =>
      handleGoAloneDecision(gameState, PLAYER_ROLES[0], "not_boolean"),
    ).to.throw(
      ValidationError,
      "Internal error: Missing or invalid arguments for go alone decision.",
    );
  });

  // Phase and Turn Validation
  it("should throw InvalidPhaseError if not in GOING_ALONE_DECISION phase", () => {
    let gameState = createGoAloneGameState(PLAYER_ROLES[0], PLAYER_ROLES[0]);
    gameState.gamePhase = GAME_PHASES.PLAYING;
    expect(() =>
      handleGoAloneDecision(gameState, PLAYER_ROLES[0], true),
    ).to.throw(
      InvalidPhaseError,
      `Cannot make "go alone" decision during ${GAME_PHASES.PLAYING} phase.`,
    );
  });

  it("should throw NotPlayersTurnError if current player is not the deciding player", () => {
    const decidingPlayer = PLAYER_ROLES[0];
    const currentPlayer = PLAYER_ROLES[1];
    let gameState = createGoAloneGameState(currentPlayer, decidingPlayer); // currentPlayer is West, trumpMaker is South
    expect(() =>
      handleGoAloneDecision(gameState, decidingPlayer, true),
    ).to.throw(
      NotPlayersTurnError,
      `Not ${decidingPlayer}'s turn. It is ${currentPlayer}'s turn.`,
    );
  });

  it("should throw PhaseLogicError if deciding player is not the trump maker", () => {
    const trumpMaker = PLAYER_ROLES[0]; // South made trump
    const decidingPlayer = PLAYER_ROLES[1]; // West attempts to decide
    let gameState = createGoAloneGameState(decidingPlayer, trumpMaker); // West's turn, but South made trump
    expect(() =>
      handleGoAloneDecision(gameState, decidingPlayer, true),
    ).to.throw(
      PhaseLogicError,
      `Only the player who made trump (${trumpMaker}) can decide to go alone. Player ${decidingPlayer} attempted.`,
    );
  });

  // Success Path: Going Alone
  it("should update state correctly when player decides to go alone", () => {
    const trumpMaker = PLAYER_ROLES[0]; // South
    const partner = PLAYER_ROLES[2]; // North
    const dealer = PLAYER_ROLES[3]; // East (different from trumpMaker for this test)
    let gameState = createGoAloneGameState(trumpMaker, trumpMaker);
    gameState.dealer = dealer;

    // Set currentTestGameStateForStub for the updateGameStateStub to use
    currentTestGameStateForStub = gameState;

    getPartnerMock.withArgs(trumpMaker, gameState.players).returns(partner); // South's partner is North
    // Scenario: Dealer East (P3), initial lead is South (P0). South (trumpMaker) goes alone. Partner North (P2) sits out.
    // South (P0) should lead because South is the initial leader and is not sitting out.
    getNextPlayerMock.withArgs(dealer, PLAYER_ROLES).returns(PLAYER_ROLES[0]); // Initial lead: South (P0)
    // The following mock for getNextPlayer(PLAYER_ROLES[0]) is not relevant if the initial leader isn't skipped.
    // getNextPlayerMock.withArgs(PLAYER_ROLES[0], PLAYER_ROLES).returns(PLAYER_ROLES[1]);

    const newState = handleGoAloneDecision(gameState, trumpMaker, true);

    expect(newState.goingAlone).to.be.true;
    expect(newState.playerGoingAlone).to.equal(trumpMaker);
    expect(newState.partnerSittingOut).to.equal(partner);
    expect(newState.gamePhase).to.equal(GAME_PHASES.PLAYING);
    // South (trumpMaker, P0) is the initial lead and is going alone (not sitting out). So, South leads.
    expect(newState.currentPlayer).to.equal(trumpMaker);
    expect(getPartnerMock.calledOnceWith(trumpMaker, gameState.players)).to.be
      .true;
    // getNextPlayer is called once to determine the initial leader (left of dealer).
    // It's not called a second time because the initial leader (South) is not sitting out.
    expect(getNextPlayerMock.calledOnceWith(dealer, PLAYER_ROLES)).to.be.true;
    expect(newState.currentTrick).to.deep.equal([]);
    expect(newState.leadSuit).to.be.null;
  });

  it("should correctly set first player if initial lead player is sitting out", () => {
    const trumpMaker = PLAYER_ROLES[1]; // West (EW team)
    const partner = PLAYER_ROLES[3]; // East
    const dealer = PLAYER_ROLES[0]; // South
    let gameState = createGoAloneGameState(trumpMaker, trumpMaker);
    gameState.dealer = dealer;
    gameState.makerTeam = TEAMS.TEAM_EW;
    gameState.playerWhoOrderedUp = null; // Clear this if set by helper
    gameState.playerWhoCalledTrump = trumpMaker;

    currentTestGameStateForStub = gameState;

    getPartnerMock.withArgs(trumpMaker, gameState.players).returns(partner);
    // Dealer South(0). Left of dealer is West(1). West is trumpMaker.
    // Partner East(3) sits out.
    // Initial lead is West(1).
    getNextPlayerMock.withArgs(dealer, PLAYER_ROLES).returns(PLAYER_ROLES[1]); // West is initial lead
    // Since West is going alone, West still leads. Partner East sitting out doesn't affect West leading.
    // Let's change scenario: Trump maker is South(0). Partner is North(2). Dealer is East(3).
    // Initial lead is South(0). South goes alone. North sits out. South leads.
    // Let's change scenario: Trump maker is South(0). Partner is North(2). Dealer is North(2).
    // Initial lead is East(3). South goes alone. North sits out. East leads.
    // Let's change scenario: Trump maker is South(0). Partner is North(2). Dealer is West(1).
    // Initial lead is North(2). South goes alone. North (the initial lead) sits out. East(3) should lead.
    gameState.dealer = PLAYER_ROLES[1]; // West is dealer
    gameState.players[PLAYER_ROLES[0]].teamId = TEAMS.TEAM_NS; // South
    gameState.players[PLAYER_ROLES[2]].teamId = TEAMS.TEAM_NS; // North
    gameState.makerTeam = TEAMS.TEAM_NS;
    gameState.playerWhoCalledTrump = null;
    gameState.playerWhoOrderedUp = PLAYER_ROLES[0]; // South ordered up
    gameState.currentPlayer = PLAYER_ROLES[0]; // South's turn to decide
    const south = PLAYER_ROLES[0];
    const north = PLAYER_ROLES[2];
    const east = PLAYER_ROLES[3];

    currentTestGameStateForStub = gameState;

    getPartnerMock.withArgs(south, gameState.players).returns(north); // South's partner is North
    // Dealer West (P1). Initial lead is North (P2). North (partner) sits out.
    // So, player after North (P2) should lead: East (P3).
    getNextPlayerMock
      .withArgs(PLAYER_ROLES[1], PLAYER_ROLES)
      .returns(PLAYER_ROLES[2]); // Call 1: getNextPlayer(West P1) -> North P2
    getNextPlayerMock
      .withArgs(PLAYER_ROLES[2], PLAYER_ROLES)
      .returns(PLAYER_ROLES[3]); // Call 2: getNextPlayer(North P2) -> East P3

    const newState = handleGoAloneDecision(gameState, south, true); // South goes alone, North sits out.

    expect(newState.goingAlone).to.be.true;
    expect(newState.playerGoingAlone).to.equal(south);
    expect(newState.partnerSittingOut).to.equal(north);
    expect(newState.currentPlayer).to.equal(east); // East should lead
  });

  // Success Path: Not Going Alone
  it("should update state correctly when team plays with partner", () => {
    const trumpMaker = PLAYER_ROLES[0]; // South
    const dealer = PLAYER_ROLES[3]; // East
    let gameState = createGoAloneGameState(trumpMaker, trumpMaker);
    gameState.dealer = dealer;

    currentTestGameStateForStub = gameState;

    // getPartner should not be called if not going alone for setting partnerSittingOut
    // getNextPlayer will be called for initial lead
    const initialLeadPlayer = PLAYER_ROLES[0]; // Left of East is South
    getNextPlayerMock.withArgs(dealer, PLAYER_ROLES).returns(initialLeadPlayer);

    const newState = handleGoAloneDecision(gameState, trumpMaker, false);

    expect(newState.goingAlone).to.be.false;
    expect(newState.playerGoingAlone).to.be.null;
    expect(newState.partnerSittingOut).to.be.null;
    expect(newState.gamePhase).to.equal(GAME_PHASES.PLAYING);
    expect(newState.currentPlayer).to.equal(initialLeadPlayer);
    expect(getPartnerMock.called).to.be.false; // Or ensure it's not called for this path's specific logic
    expect(getNextPlayerMock.calledOnceWith(dealer, PLAYER_ROLES)).to.be.true;
  });
});
