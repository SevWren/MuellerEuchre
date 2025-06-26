/**
 * @file test/phases/scoringPhase.unit.test.js
 * @module test/phases/scoringPhase.unit
 * @description
 *   Unit tests for the scoring phase logic of the Euchre Multiplayer game.
 *   These tests cover score calculation, hand completion, game over detection,
 *   and new game initialization logic.
 *
 *   CURRENT STATE:
 *     - Tests use esmock to mock persistence and logger dependencies.
 *     - All scoring scenarios, error conditions, and phase transitions are covered.
 *     - The file is focused on pure logic, not on state management or network.
 *
 *   WHEN THE PROJECT IS COMPLETE:
 *     - This file will be the canonical test suite for Layer 1 scoring phase logic.
 *     - All rules for scoring, hand completion, and game over will be validated here.
 *     - No test will require integration with state, persistence, or network code.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import chaiAsPromised from 'chai-as-promised';
import { GAME_PHASES, TEAMS, PLAYER_ROLES } from '../../src/config/constants.js';
import { InvalidPhaseError, PhaseLogicError } from '../../src/game/logic/errors.js';

// Apply chai-as-promised
import * as chaiModule from 'chai';
chaiModule.use(chaiAsPromised);

const defaultLoggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
};

const createScoringGameState = () => ({
  gameId: 'scoringTestGame',
  gamePhase: GAME_PHASES.SCORING,
  makerTeam: TEAMS.TEAM_NS,
  tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  goingAlone: false,
  dealer: PLAYER_ROLES[0],
  players: {
    [PLAYER_ROLES[0]]: { id: PLAYER_ROLES[0], name: 'South', teamId: TEAMS.TEAM_NS },
    [PLAYER_ROLES[1]]: { id: PLAYER_ROLES[1], name: 'West', teamId: TEAMS.TEAM_EW },
    [PLAYER_ROLES[2]]: { id: PLAYER_ROLES[2], name: 'North', teamId: TEAMS.TEAM_NS },
    [PLAYER_ROLES[3]]: { id: PLAYER_ROLES[3], name: 'East', teamId: TEAMS.TEAM_EW },
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
});

describe('ScoringPhase Logic', () => {
  afterEach(() => {
    sinon.restore();
    defaultLoggerMock.info.resetHistory();
    defaultLoggerMock.warn.resetHistory();
    defaultLoggerMock.error.resetHistory();
    defaultLoggerMock.debug.resetHistory();
  });

  describe('calculateAndApplyScore', () => {
    let calculateAndApplyScore;
    let updateGameMock;

    beforeEach(async () => {
      updateGameMock = sinon.stub().resolves();
      const scoringPhaseModule = await esmock('../../src/game/phases/scoringPhase.js', {
        '../../src/db/gameRepository.js': {
          gameRepository: { updateGame: updateGameMock }
        },
        '../../src/utils/logger.js': defaultLoggerMock,
      });
      calculateAndApplyScore = scoringPhaseModule.calculateAndApplyScore;
    });

    it('should throw InvalidPhaseError if not in SCORING phase', async () => {
      const gameState = { ...createScoringGameState(), gamePhase: GAME_PHASES.PLAYING };
      await expect(calculateAndApplyScore(gameState))
        .to.be.rejectedWith(InvalidPhaseError, /calculateAndApplyScore called inappropriately during PLAYING/i);
    });

    it('should throw PhaseLogicError if makerTeam is not defined', async () => {
      const gameState = { ...createScoringGameState(), makerTeam: null };
      await expect(calculateAndApplyScore(gameState))
        .to.be.rejectedWith(PhaseLogicError, /Cannot calculate score: makerTeam is not defined/i);
    });

    const scenarios = [
      { name: 'Makers get 3 tricks', tricksNS: 3, tricksEW: 2, maker: TEAMS.TEAM_NS, alone: false, expectedScoreNS: 1, expectedScoreEW: 0, expectedMsg: /Team NS made their bid. 1 point./ },
      { name: 'Makers get 4 tricks', tricksNS: 4, tricksEW: 1, maker: TEAMS.TEAM_NS, alone: false, expectedScoreNS: 1, expectedScoreEW: 0, expectedMsg: /Team NS made their bid. 1 point./ },
      { name: 'Makers get 5 tricks (march)', tricksNS: 5, tricksEW: 0, maker: TEAMS.TEAM_NS, alone: false, expectedScoreNS: 2, expectedScoreEW: 0, expectedMsg: /Team NS achieved a march! 2 points./ },
      { name: 'Makers euchred (NS maker, EW wins)', tricksNS: 2, tricksEW: 3, maker: TEAMS.TEAM_NS, alone: false, expectedScoreNS: 0, expectedScoreEW: 2, expectedMsg: /Team NS was euchred! Team EW gets 2 points./ },
      { name: 'Makers get 3 tricks alone', tricksNS: 3, tricksEW: 2, maker: TEAMS.TEAM_NS, alone: true, expectedScoreNS: 1, expectedScoreEW: 0, expectedMsg: /Team NS made their bid \(alone\). 1 point./ },
      { name: 'Makers get 5 tricks alone (march)', tricksNS: 5, tricksEW: 0, maker: TEAMS.TEAM_NS, alone: true, expectedScoreNS: 4, expectedScoreEW: 0, expectedMsg: /Team NS achieved a march \(alone\)! 4 points./ },
      { name: 'EW Makers get 3 tricks', tricksNS: 2, tricksEW: 3, maker: TEAMS.TEAM_EW, alone: false, expectedScoreNS: 0, expectedScoreEW: 1, expectedMsg: /Team EW made their bid. 1 point./ },
      { name: 'EW Makers euchred (EW maker, NS wins)', tricksNS: 3, tricksEW: 2, maker: TEAMS.TEAM_EW, alone: false, expectedScoreNS: 2, expectedScoreEW: 0, expectedMsg: /Team EW was euchred! Team NS gets 2 points./ },
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

        await calculateAndApplyScore(gameState);

        expect(updateGameMock.calledOnce).to.be.true;
        const stateSaved = updateGameMock.firstCall.args[1];

        expect(stateSaved.teamScores[TEAMS.TEAM_NS]).to.equal(scenario.expectedScoreNS);
        expect(stateSaved.teamScores[TEAMS.TEAM_EW]).to.equal(scenario.expectedScoreEW);
        expect(stateSaved.message).to.match(scenario.expectedMsg);
        expect(stateSaved.message).to.include(`Current scores: Team NS ${scenario.expectedScoreNS}, Team EW ${scenario.expectedScoreEW}.`);
        expect(stateSaved.tricksTaken[TEAMS.TEAM_NS]).to.equal(0);
        expect(stateSaved.tricksTaken[TEAMS.TEAM_EW]).to.equal(0);
        expect(stateSaved.previousTricksTaken[TEAMS.TEAM_NS]).to.equal(scenario.tricksNS);

        // WINNING_SCORE is imported from constants.js but not used in the original faulty check.
        // Assuming WINNING_SCORE is 10 for this check as per problem description.
        const WINNING_SCORE_VALUE = 10;
        if(scenario.expectedScoreNS < WINNING_SCORE_VALUE && scenario.expectedScoreEW < WINNING_SCORE_VALUE) {
             expect(stateSaved.gamePhase).to.equal(GAME_PHASES.DEALING);
        }
      });
    }

    it('should correctly update scores and transition phase via checkGameOver (which calls mocked updateGame)', async () => {
      let gameState = createScoringGameState();
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken[TEAMS.TEAM_NS] = 3;
      gameState.tricksTaken[TEAMS.TEAM_EW] = 2;
      gameState.teamScores[TEAMS.TEAM_NS] = 8;
      gameState.teamScores[TEAMS.TEAM_EW] = 5;

      await calculateAndApplyScore(gameState);

      expect(updateGameMock.calledOnce).to.be.true;
      const finalState = updateGameMock.firstCall.args[1];

      expect(finalState.teamScores[TEAMS.TEAM_NS]).to.equal(9);
      expect(finalState.teamScores[TEAMS.TEAM_EW]).to.equal(5);
      expect(finalState.gamePhase).to.equal(GAME_PHASES.DEALING);
      expect(finalState.message).to.include("Team NS made their bid. 1 point.");
      expect(finalState.message).to.include("Current scores: Team NS 9, Team EW 5.");
      expect(finalState.message).to.include("New dealer:");
    });

    it('should correctly handle game over via checkGameOver (which calls mocked updateGame)', async () => {
      let gameState = createScoringGameState();
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken[TEAMS.TEAM_NS] = 5;
      gameState.teamScores[TEAMS.TEAM_NS] = 9;
      gameState.teamScores[TEAMS.TEAM_EW] = 5;
      gameState.settings = { winningScore: 10 }; // Ensure winning score is set

      await calculateAndApplyScore(gameState);

      expect(updateGameMock.calledOnce).to.be.true;
      const finalState = updateGameMock.firstCall.args[1];

      expect(finalState.teamScores[TEAMS.TEAM_NS]).to.equal(11);
      expect(finalState.teamScores[TEAMS.TEAM_EW]).to.equal(5);
      expect(finalState.gamePhase).to.equal(GAME_PHASES.GAME_OVER);
      expect(finalState.winningTeam).to.equal(TEAMS.TEAM_NS);
      expect(finalState.message).to.include("Team NS achieved a march! 2 points.");
      expect(finalState.message).to.include("Game Over! Team NS wins with 11 points!");
    });
  });

  describe('handleNewGameRequest', () => {
    let handleNewGameRequest;
    let resetFullGameMock;

    beforeEach(async () => {
      resetFullGameMock = sinon.stub().returns({ gameId: 'newTestGame', gamePhase: GAME_PHASES.LOBBY });
      const scoringPhaseModule = await esmock('../../src/game/phases/scoringPhase.js', {
        '../../src/game/state.js': { resetFullGame: resetFullGameMock },
        '../../src/utils/logger.js': defaultLoggerMock,
        // Mock other external deps if handleNewGameRequest uses them
      });
      handleNewGameRequest = scoringPhaseModule.handleNewGameRequest;
    });

    it('should throw InvalidPhaseError if game is not in GAME_OVER phase', () => {
      const gameState = { gameId: 'testId', gamePhase: GAME_PHASES.SCORING };
      expect(() => handleNewGameRequest(gameState))
        .to.throw(InvalidPhaseError, 'Can only start a new game from GAME_OVER phase.');
    });

    it('should call resetFullGame and return its result if in GAME_OVER phase', () => {
      const gameState = { gameId: 'testId', gamePhase: GAME_PHASES.GAME_OVER };
      const newGame = handleNewGameRequest(gameState);
      expect(resetFullGameMock.calledOnce).to.be.true;
      expect(newGame).to.deep.equal({ gameId: 'newTestGame', gamePhase: GAME_PHASES.LOBBY });
    });
  });
});
