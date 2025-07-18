// filepath: test/game/phases/scoringPhase.unit.test.js
/**
 * @file test/phases/scoringPhase.unit.test.js
 * @module test/phases/scoringPhase.unit
 * @description
 *   Unit tests for the scoring phase logic of the Euchre Multiplayer game.
 *   These tests cover score calculation, hand completion, game over detection,
 *   and new game initialization logic.
 *
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Direct imports for constants and errors, as they are not mocked dependencies
// of scoringPhase.js itself, but rather foundational values used by the tests.
import {
  GAME_PHASES,
  TEAMS,
  PLAYER_ROLES,
  WINNING_SCORE,
} from '../../../src/config/constants.js';
import {
  InvalidPhaseError,
  PhaseLogicError,
} from '../../../src/game/logic/errors.js';

// Helper to create a mock logger
const createMockLogger = () => ({
  info: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
  debug: mock.fn(),
});

const createScoringGameState = () => ({
  gameId: 'scoringTestGame',
  gamePhase: GAME_PHASES.SCORING,
  makerTeam: TEAMS.TEAM_NS,
  tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  goingAlone: false,
  dealer: PLAYER_ROLES[0],
  players: {
    [PLAYER_ROLES[0]]: {
      id: PLAYER_ROLES[0],
      name: 'South',
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[1]]: {
      id: PLAYER_ROLES[1],
      name: 'West',
      teamId: TEAMS.TEAM_EW,
    },
    [PLAYER_ROLES[2]]: {
      id: PLAYER_ROLES[2],
      name: 'North',
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[3]]: {
      id: PLAYER_ROLES[3],
      name: 'East',
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

describe('ScoringPhase Logic', () => {
  let calculateAndApplyScore;
  let loggerMock;

  beforeEach(async () => {
    loggerMock = createMockLogger();

    // Dynamically import the module under test after setting up mocks
    const scoringPhaseModule = await import(
      '../../../src/game/phases/scoringPhase.js'
    );
    calculateAndApplyScore = scoringPhaseModule.calculateAndApplyScore;

    // Mock the logger within the module under test
    mock.method(
      scoringPhaseModule,
      'logger',
      loggerMock,
      { times: Infinity } // Apply mock for all calls
    );
  });

  afterEach(() => {
    mock.reset(); // Resets all mock call histories
    mock.restoreAll(); // Restores all mocked methods to their original implementations
  });

  it('should throw InvalidPhaseError if not in SCORING phase', async () => {
    const gameState = {
      ...createScoringGameState(),
      gamePhase: GAME_PHASES.PLAYING,
    };

    await assert.rejects(
      async () => calculateAndApplyScore(gameState),
      (err) => {
        assert.ok(err instanceof InvalidPhaseError);
        assert.match(
          err.message,
          /calculateAndApplyScore called inappropriately during PLAYING/i
        );
        return true;
      }
    );
  });

  it('should throw PhaseLogicError if makerTeam is not defined', async () => {
    const gameState = { ...createScoringGameState(), makerTeam: null };

    await assert.rejects(
      async () => calculateAndApplyScore(gameState),
      (err) => {
        assert.ok(err instanceof PhaseLogicError);
        assert.match(
          err.message,
          /Cannot calculate score: makerTeam is not defined/i
        );
        return true;
      }
    );
  });

  const scenarios = [
    {
      name: 'Makers get 3 tricks',
      tricksNS: 3,
      tricksEW: 2,
      maker: TEAMS.TEAM_NS,
      alone: false,
      expectedScoreNS: 1,
      expectedScoreEW: 0,
      expectedMsg: /Team NS made their bid. 1 point./,
    },
    {
      name: 'Makers get 4 tricks',
      tricksNS: 4,
      tricksEW: 1,
      maker: TEAMS.TEAM_NS,
      alone: false,
      expectedScoreNS: 1,
      expectedScoreEW: 0,
      expectedMsg: /Team NS made their bid. 1 point./,
    },
    {
      name: 'Makers get 5 tricks (march)',
      tricksNS: 5,
      tricksEW: 0,
      maker: TEAMS.TEAM_NS,
      alone: false,
      expectedScoreNS: 2,
      expectedScoreEW: 0,
      expectedMsg: /Team NS achieved a march! 2 points./,
    },
    {
      name: 'Makers euchred (NS maker, EW wins)',
      tricksNS: 2,
      tricksEW: 3,
      maker: TEAMS.TEAM_NS,
      alone: false,
      expectedScoreNS: 0,
      expectedScoreEW: 2,
      expectedMsg: /Team NS was euchred! Team EW gets 2 points./,
    },
    {
      name: 'Makers get 3 tricks alone',
      tricksNS: 3,
      tricksEW: 2,
      maker: TEAMS.TEAM_NS,
      alone: true,
      expectedScoreNS: 1,
      expectedScoreEW: 0,
      expectedMsg: /Team NS made their bid \(alone\). 1 point./,
    },
    {
      name: 'Makers get 5 tricks alone (march)',
      tricksNS: 5,
      tricksEW: 0,
      maker: TEAMS.TEAM_NS,
      alone: true,
      expectedScoreNS: 4,
      expectedScoreEW: 0,
      expectedMsg: /Team NS achieved a march \(alone\)! 4 points./,
    },
    {
      name: 'EW Makers get 3 tricks',
      tricksNS: 2,
      tricksEW: 3,
      maker: TEAMS.TEAM_EW,
      alone: false,
      expectedScoreNS: 0,
      expectedScoreEW: 1,
      expectedMsg: /Team EW made their bid. 1 point./,
    },
    {
      name: 'EW Makers euchred (EW maker, NS wins)',
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

      assert.strictEqual(finalState.teamScores[TEAMS.TEAM_NS], scenario.expectedScoreNS);
      assert.strictEqual(finalState.teamScores[TEAMS.TEAM_EW], scenario.expectedScoreEW);
      assert.match(finalState.message, scenario.expectedMsg);
      assert.match(
        finalState.message,
        new RegExp(
          `Current scores: Team NS ${scenario.expectedScoreNS}, Team EW ${scenario.expectedScoreEW}.`
        )
      );
      assert.strictEqual(finalState.tricksTaken[TEAMS.TEAM_NS], 0);
      assert.strictEqual(finalState.tricksTaken[TEAMS.TEAM_EW], 0);
      assert.strictEqual(
        finalState.previousTricksTaken[TEAMS.TEAM_NS],
        scenario.tricksNS
      );

      const WINNING_SCORE_VALUE = 10; // Assuming WINNING_SCORE is 10 for this check
      if (
        scenario.expectedScoreNS < WINNING_SCORE_VALUE &&
        scenario.expectedScoreEW < WINNING_SCORE_VALUE
      ) {
        assert.strictEqual(finalState.gamePhase, GAME_PHASES.DEALING);
      }
    });
  }

  it('should correctly update scores and transition phase via checkGameOver', async () => {
    let gameState = createScoringGameState();
    gameState.makerTeam = TEAMS.TEAM_NS;
    gameState.tricksTaken[TEAMS.TEAM_NS] = 3;
    gameState.tricksTaken[TEAMS.TEAM_EW] = 2;
    gameState.teamScores[TEAMS.TEAM_NS] = 8;
    gameState.teamScores[TEAMS.TEAM_EW] = 5;

    const finalState = await calculateAndApplyScore(gameState);

    assert.strictEqual(finalState.teamScores[TEAMS.TEAM_NS], 9);
    assert.strictEqual(finalState.teamScores[TEAMS.TEAM_EW], 5);
    assert.strictEqual(finalState.gamePhase, GAME_PHASES.DEALING);
    assert.match(finalState.message, /Team NS made their bid. 1 point./);
    assert.match(finalState.message, /Current scores: Team NS 9, Team EW 5./);
    assert.match(finalState.message, /New dealer:/); // This message is added by checkGameOver/startNewHand
  });

  it('should correctly handle game over via checkGameOver', async () => {
    let gameState = createScoringGameState();
    gameState.makerTeam = TEAMS.TEAM_NS;
    gameState.tricksTaken[TEAMS.TEAM_NS] = 5;
    gameState.teamScores[TEAMS.TEAM_NS] = 9;
    gameState.teamScores[TEAMS.TEAM_EW] = 5;
    gameState.settings = { winningScore: 10 }; // Ensure winning score is set

    const finalState = await calculateAndApplyScore(gameState);

    assert.strictEqual(finalState.teamScores[TEAMS.TEAM_NS], 11);
    assert.strictEqual(finalState.teamScores[TEAMS.TEAM_EW], 5);
    assert.strictEqual(finalState.gamePhase, GAME_PHASES.GAME_OVER);
    assert.strictEqual(finalState.winningTeam, TEAMS.TEAM_NS);
    assert.match(finalState.message, /Team NS achieved a march! 2 points./);
    assert.match(
      finalState.message,
      /Game Over! Team NS wins with 11 points!/
    );
  });
});
