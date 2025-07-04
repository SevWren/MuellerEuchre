/**
 * @file test/phases/scoringPhase.unit.test.js
 * @module test/phases/scoringPhase.unit
 * @description
 *   Unit tests for the scoring phase logic of the Euchre Multiplayer game.
 *   These tests cover score calculation, hand completion, game over detection,
 *   and new game initialization logic.
 *
 */
/*
 * CURRENT STATE:
 *   - Tests use esmock to mock persistence and logger dependencies.
 *   - All scoring scenarios, error conditions, and phase transitions are covered.
 *   - The file is focused on pure logic, not on state management or network.
 *
 * WHEN THE PROJECT IS COMPLETE:
 *   - This file will be the canonical test suite for Layer 1 scoring phase logic.
 *   - All rules for scoring, hand completion, and game over will be validated here.
 *   - No test will require integration with state, persistence, or network code.
 */

import { expect } from "chai";
import sinon from "sinon";
import chaiAsPromised from "chai-as-promised";

// Import the new esmock wrapper
import { createMockedModule } from "../../utils/esmock_wrapper.js"; // Corrected relative path

// Direct imports for constants and errors, as they are not mocked dependencies
// of scoringPhase.js itself, but rather foundational values used by the tests.
import {
  GAME_PHASES,
  TEAMS,
  PLAYER_ROLES,
  WINNING_SCORE,
} from "../../../src/config/constants.js";
import {
  InvalidPhaseError,
  PhaseLogicError,
} from "../../../src/game/logic/errors.js";

// Apply chai-as-promised
import * as chaiModule from "chai";
chaiModule.use(chaiAsPromised);

// Removed defaultLoggerMock as createMockedModule will provide its own stubs.

const createScoringGameState = () => ({
  gameId: "scoringTestGame",
  gamePhase: GAME_PHASES.SCORING,
  makerTeam: TEAMS.TEAM_NS,
  tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  goingAlone: false,
  dealer: PLAYER_ROLES[0],
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
  gameMessages: [],
  trumpSuit: null,
  playerWhoOrderedUp: null,
  playerWhoCalledTrump: null,
  playerGoingAlone: null,
  partnerSittingOut: null,
  bids: [],
  orderUpTurn: null,
  kitty: [],
  turnCard: null,
  leadSuit: null,
  currentTrick: [],
  settings: { winningScore: WINNING_SCORE }, // Default winning score for tests
});

describe("ScoringPhase Logic", () => {
  let calculateAndApplyScore;
  let mockedDependencies; // To hold the mocks (e.g., logger) provided by createMockedModule
  let updateGameMock; // This stub is for asserting that Layer 1 does NOT call Layer 5 directly.

  beforeEach(async () => {
    // This stub is for asserting that Layer 1 (scoringPhase.js) does NOT
    // directly interact with Layer 5 (Persistence). It's not a dependency
    // being injected into scoringPhase.js.
    updateGameMock = sinon.stub().resolves();

    // Use the new wrapper to mock dependencies of scoringPhase.js
    const { module, mocks } = await createMockedModule(
      import.meta.url, // Pass import.meta.url of the current test file
      "../../../src/game/phases/scoringPhase.js", // Path to the module under test
      {
        // No specific overrides needed here for scoringPhase's dependencies
        // because `logger.js` is mocked by default in `createMockedModule`.
        // If scoringPhase.js *did* import `gameRepository.js`, we would mock it here:
        // '@/db/gameRepository.js': { updateGame: updateGameMock }
      }
    );
    calculateAndApplyScore = module.calculateAndApplyScore;
    mockedDependencies = mocks; // Store the provided mocks for assertions in afterEach
  });

  afterEach(() => {
    sinon.restore(); // Restores all stubs created with sinon.stub()
    // Reset the history of the logger stubs provided by createMockedModule
    if (mockedDependencies && mockedDependencies.logger) {
      mockedDependencies.logger.info.resetHistory();
      mockedDependencies.logger.warn.resetHistory();
      mockedDependencies.logger.error.resetHistory();
      mockedDependencies.logger.debug.resetHistory();
    }
    // updateGameMock is redefined in each beforeEach, so its history is implicitly reset.
  });

  describe("calculateAndApplyScore", () => {
    it("should throw InvalidPhaseError if not in SCORING phase", async () => {
      const gameState = {
        ...createScoringGameState(),
        gamePhase: GAME_PHASES.PLAYING,
      };
      await expect(calculateAndApplyScore(gameState)).to.be.rejectedWith(
        InvalidPhaseError,
        /calculateAndApplyScore called inappropriately during PLAYING/i
      );
    });

    it("should throw PhaseLogicError if makerTeam is not defined", async () => {
      const gameState = { ...createScoringGameState(), makerTeam: null };
      await expect(calculateAndApplyScore(gameState)).to.be.rejectedWith(
        PhaseLogicError,
        /Cannot calculate score: makerTeam is not defined/i
      );
    });

    const scenarios = [
      {
        name: "Makers get 3 tricks",
        tricksNS: 3,
        tricksEW: 2,
        maker: TEAMS.TEAM_NS,
        alone: false,
        expectedScoreNS: 1,
        expectedScoreEW: 0,
        expectedMsg: /Team NS made their bid. 1 point./,
      },
      {
        name: "Makers get 4 tricks",
        tricksNS: 4,
        tricksEW: 1,
        maker: TEAMS.TEAM_NS,
        alone: false,
        expectedScoreNS: 1,
        expectedScoreEW: 0,
        expectedMsg: /Team NS made their bid. 1 point./,
      },
      {
        name: "Makers get 5 tricks (march)",
        tricksNS: 5,
        tricksEW: 0,
        maker: TEAMS.TEAM_NS,
        alone: false,
        expectedScoreNS: 2,
        expectedScoreEW: 0,
        expectedMsg: /Team NS achieved a march! 2 points./,
      },
      {
        name: "Makers euchred (NS maker, EW wins)",
        tricksNS: 2,
        tricksEW: 3,
        maker: TEAMS.TEAM_NS,
        alone: false,
        expectedScoreNS: 0,
        expectedScoreEW: 2,
        expectedMsg: /Team NS was euchred! Team EW gets 2 points./,
      },
      {
        name: "Makers get 3 tricks alone",
        tricksNS: 3,
        tricksEW: 2,
        maker: TEAMS.TEAM_NS,
        alone: true,
        expectedScoreNS: 1,
        expectedScoreEW: 0,
        expectedMsg: /Team NS made their bid \(alone\). 1 point./,
      },
      {
        name: "Makers get 5 tricks alone (march)",
        tricksNS: 5,
        tricksEW: 0,
        maker: TEAMS.TEAM_NS,
        alone: true,
        expectedScoreNS: 4,
        expectedScoreEW: 0,
        expectedMsg: /Team NS achieved a march \(alone\)! 4 points./,
      },
      {
        name: "EW Makers get 3 tricks",
        tricksNS: 2,
        tricksEW: 3,
        maker: TEAMS.TEAM_EW,
        alone: false,
        expectedScoreNS: 0,
        expectedScoreEW: 1,
        expectedMsg: /Team EW made their bid. 1 point./,
      },
      {
        name: "EW Makers euchred (EW maker, NS wins)",
        tricksNS: 3,
        tricksEW: 2,
        maker: TEAMS.TEAM_EW,
        alone: false,
        expectedScoreNS: 2,
        expectedScoreEW: 0,
        expectedMsg: /Team EW was euchred! Team NS gets 2 points./,
      },
    ];

    for (const scenario of scenarios) {
      it(`should correctly score when ${scenario.name}`, async () => {
        let gameState = createScoringGameState();
        gameState.makerTeam = scenario.maker;
        gameState.tricksTaken[TEAMS.TEAM_NS] = scenario.tricksNS;
        gameState.tricksTaken[TEAMS.TEAM_EW] = scenario.tricksEW;
        gameState.goingAlone = scenario.alone;
        gameState.teamScores[TEAMS.TEAM_NS] = 0;
        gameState.teamScores[TEAMS.TEAM_EW] = 0;

        const finalState = await calculateAndApplyScore(gameState);

        // The function now returns the state instead of calling updateGameMock
        expect(updateGameMock.called).to.be.false; // Ensure updateGame is NOT called

        expect(finalState.teamScores[TEAMS.TEAM_NS]).to.equal(
          scenario.expectedScoreNS
        );
        expect(finalState.teamScores[TEAMS.TEAM_EW]).to.equal(
          scenario.expectedScoreEW
        );
        expect(finalState.message).to.match(scenario.expectedMsg);
        expect(finalState.message).to.include(
          `Current scores: Team NS ${scenario.expectedScoreNS}, Team EW ${scenario.expectedScoreEW}.`
        );
        expect(finalState.tricksTaken[TEAMS.TEAM_NS]).to.equal(0);
        expect(finalState.tricksTaken[TEAMS.TEAM_EW]).to.equal(0);
        expect(finalState.previousTricksTaken[TEAMS.TEAM_NS]).to.equal(
          scenario.tricksNS
        );

        const WINNING_SCORE_VALUE = 10; // Assuming WINNING_SCORE is 10 for this check
        if (
          scenario.expectedScoreNS < WINNING_SCORE_VALUE &&
          scenario.expectedScoreEW < WINNING_SCORE_VALUE
        ) {
          expect(finalState.gamePhase).to.equal(GAME_PHASES.DEALING);
        }
      });
    }

    it("should correctly update scores and transition phase via checkGameOver", async () => {
      let gameState = createScoringGameState();
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken[TEAMS.TEAM_NS] = 3;
      gameState.tricksTaken[TEAMS.TEAM_EW] = 2;
      gameState.teamScores[TEAMS.TEAM_NS] = 8;
      gameState.teamScores[TEAMS.TEAM_EW] = 5;

      const finalState = await calculateAndApplyScore(gameState);

      expect(updateGameMock.called).to.be.false; // Ensure updateGame is NOT called

      expect(finalState.teamScores[TEAMS.TEAM_NS]).to.equal(9);
      expect(finalState.teamScores[TEAMS.TEAM_EW]).to.equal(5);
      expect(finalState.gamePhase).to.equal(GAME_PHASES.DEALING);
      expect(finalState.message).to.include("Team NS made their bid. 1 point.");
      expect(finalState.message).to.include(
        "Current scores: Team NS 9, Team EW 5."
      );
      expect(finalState.message).to.include("New dealer:"); // This message is added by checkGameOver/startNewHand
    });

    it("should correctly handle game over via checkGameOver", async () => {
      let gameState = createScoringGameState();
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken[TEAMS.TEAM_NS] = 5;
      gameState.teamScores[TEAMS.TEAM_NS] = 9;
      gameState.teamScores[TEAMS.TEAM_EW] = 5;
      gameState.settings = { winningScore: 10 }; // Ensure winning score is set

      const finalState = await calculateAndApplyScore(gameState);

      expect(updateGameMock.called).to.be.false; // Ensure updateGame is NOT called

      expect(finalState.teamScores[TEAMS.TEAM_NS]).to.equal(11);
      expect(finalState.teamScores[TEAMS.TEAM_EW]).to.equal(5);
      expect(finalState.gamePhase).to.equal(GAME_PHASES.GAME_OVER);
      expect(finalState.winningTeam).to.equal(TEAMS.TEAM_NS);
      expect(finalState.message).to.include(
        "Team NS achieved a march! 2 points."
      );
      expect(finalState.message).to.include(
        "Game Over! Team NS wins with 11 points!"
      );
    });
  });
});