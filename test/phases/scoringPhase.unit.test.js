import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock'; // Import esmock

// Using resetFullGame for initial state setup
import { updateGameState, resetFullGame } from '../../src/game/state.js';
// Tested functions will be loaded via esmock
// Constants are fine to import directly
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, WINNING_SCORE } from '../../src/config/constants.js';
// logger will be mocked, so direct import for type/reference if needed, but esmock handles replacement

describe('Scoring Phase Logic', () => {
  let gameState; // This will be set in beforeEach
  let sandbox;
  let mockLogger;
  let mockPlayersUtils;
  let calculateAndApplyScore, checkGameOver, handleNewGameRequest; // Functions to load with esmock

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    mockLogger = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
    };

    mockPlayersUtils = {
      getNextPlayer: sandbox.stub().returns(PLAYER_ROLES[1]), // Default next dealer
    };

    const mockUpdateGame = sandbox.stub().resolvesArg(0); // Resolves with the game state passed to it
    const mockResetFullGame = sandbox.stub().callsFake(() => {
      // Return a minimal but valid game state structure for resetFullGame
      return {
        gameId: `mockGame_${Date.now()}`,
        gamePhase: GAME_PHASES.LOBBY,
        players: {}, // initializePlayers would normally fill this
        deck: [], kitty: [], turnCard: null, trumpSuit: null,
        dealer: PLAYER_ROLES[0], currentPlayer: PLAYER_ROLES[0],
        orderUpTurn: null, bids: [], roundNumber: 1,
        playerWhoOrderedUp: null, playerWhoCalledTrump: null, makerTeam: null,
        goingAlone: false, playerGoingAlone: null, partnerSittingOut: null,
        currentTrick: [], leadSuit: null,
        tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
        teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
        gameMessages: [], hostId: null, settings: { winningScore: WINNING_SCORE },
        lastUpdated: Date.now()
      };
    });

    const scoringPhaseModule = await esmock('../../src/game/phases/scoringPhase.js', {
      '../../src/utils/logger.js': mockLogger,
      '../../src/utils/players.js': mockPlayersUtils,
      '../../src/db/gameRepository.js': { updateGame: mockUpdateGame },
      '../../src/game/state.js': { resetFullGame: mockResetFullGame }
      // constants.js will be loaded as actual by removing it from mocks
    });
    calculateAndApplyScore = scoringPhaseModule.calculateAndApplyScore;
    // checkGameOver is not exported by scoringPhase.js, it's in endGame.js
    // Tests for checkGameOver will be moved to endGame.unit.test.js
    handleNewGameRequest = scoringPhaseModule.handleNewGameRequest;

    // Create a base game state using resetFullGame
    // gameState = resetFullGame(); // Now use the mocked version or setup manually
    // Use the mockResetFullGame for a predictable base, then layer specifics
    gameState = mockResetFullGame();

    // Layer on specifics for scoring tests
    const playersForTest = [
      { role: PLAYER_ROLES[0], id: 'p1', name: 'Player 1', team: TEAMS.TEAM_NS, isHost: true, socketId: 'socket1' },
      { role: PLAYER_ROLES[1], id: 'p2', name: 'Player 2', team: TEAMS.TEAM_EW, socketId: 'socket2' },
      { role: PLAYER_ROLES[2], id: 'p3', name: 'Player 3', team: TEAMS.TEAM_NS, socketId: 'socket3' },
      { role: PLAYER_ROLES[3], id: 'p4', name: 'Player 4', team: TEAMS.TEAM_EW, socketId: 'socket4' },
    ];

    // gameState.players is an object keyed by role from resetFullGame/initializePlayers.
    // We need to ensure the player objects within that structure have the 'team' property.
    // initializePlayers in state.js already sets up teams correctly.
    // We just need to ensure our tests align with this structure if we modify players.
    // For these tests, we'll mostly rely on the gameState provided by resetFullGame and modify specific parts.

    gameState.gamePhase = GAME_PHASES.SCORING;
    gameState.teamScores = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 };
    gameState.tricksTaken = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }; // Ensure this is object-based
    gameState.makerTeam = TEAMS.TEAM_NS;
    gameState.goingAlone = false;
    gameState.dealer = PLAYER_ROLES[0];
    // gameState.gameId is already set by resetFullGame(). We can use it or override for predictability if needed.
    // For clarity in tests, let's use a predictable gameId.
    gameState.gameId = 'gameScoringTest';

    // Update players in gameState to match structure from initializePlayers (object keyed by role)
    // and ensure they have 'team' property. initializePlayers should handle this.
    // The players array created by resetFullGame (via initializePlayers) should be fine.
    // If specific player hands or other properties were needed, they'd be set here.
    // The 'players' array in the prompt was a list; gameState.players is an object.
    // scoringPhase.js uses gameState.players (object) to get roles for getNextPlayer.
    // This is fine as PLAYER_ROLES constant is used in scoringPhase for dealer rotation.
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('calculateAndApplyScore', () => {
    it('should return current state if not in SCORING phase', async () => {
      gameState.gamePhase = GAME_PHASES.PLAYING;
      const newState = await calculateAndApplyScore(gameState);
      expect(newState).to.deep.equal(gameState);
      sinon.assert.calledWith(mockLogger.warn, sinon.match(/calculateAndApplyScore called inappropriately/));
    });

    it('makers (NS) take 3 tricks, not alone - 1 point for NS', async () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 };
      gameState.goingAlone = false;
      const newState = await calculateAndApplyScore(gameState);
      expect(newState.teamScores[TEAMS.TEAM_NS]).to.equal(1);
      expect(newState.teamScores[TEAMS.TEAM_EW]).to.equal(0);
      expect(newState.message).to.include(`Team ${TEAMS.TEAM_NS} made their bid. 1 point.`);
      expect(newState.gamePhase).to.equal(GAME_PHASES.DEALING);
    });

    it('makers (EW) take 4 tricks, not alone - 1 point for EW', async () => {
      gameState.makerTeam = TEAMS.TEAM_EW;
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 1, [TEAMS.TEAM_EW]: 4 };
      gameState.goingAlone = false;
      const newState = await calculateAndApplyScore(gameState);
      expect(newState.teamScores[TEAMS.TEAM_EW]).to.equal(1);
      expect(newState.teamScores[TEAMS.TEAM_NS]).to.equal(0);
      expect(newState.message).to.include(`Team ${TEAMS.TEAM_EW} made their bid. 1 point.`);
    });

    it('makers (NS) take 5 tricks (march), not alone - 2 points for NS', async () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 0 };
      gameState.goingAlone = false;
      const newState = await calculateAndApplyScore(gameState);
      expect(newState.teamScores[TEAMS.TEAM_NS]).to.equal(2);
      expect(newState.message).to.include(`Team ${TEAMS.TEAM_NS} achieved a march! 2 points.`);
    });

    it('makers (NS) take 3 tricks, going alone - 1 point for NS (as per current rule in scoringPhase.js)', async () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 };
      gameState.goingAlone = true;
      const newState = await calculateAndApplyScore(gameState);
      expect(newState.teamScores[TEAMS.TEAM_NS]).to.equal(1);
      expect(newState.message).to.include(`Team ${TEAMS.TEAM_NS} made their bid (alone). 1 point.`);
    });

    it('makers (NS) take 5 tricks (march), going alone - 4 points for NS', async () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 0 };
      gameState.goingAlone = true;
      const newState = await calculateAndApplyScore(gameState);
      expect(newState.teamScores[TEAMS.TEAM_NS]).to.equal(4);
      expect(newState.message).to.include(`Team ${TEAMS.TEAM_NS} achieved a march (alone)! 4 points.`);
    });

    it('makers (NS) euchred (2 tricks), not alone - 2 points for EW', async () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 2, [TEAMS.TEAM_EW]: 3 };
      gameState.goingAlone = false;
      const newState = await calculateAndApplyScore(gameState);
      expect(newState.teamScores[TEAMS.TEAM_EW]).to.equal(2);
      expect(newState.teamScores[TEAMS.TEAM_NS]).to.equal(0);
      expect(newState.message).to.include(`Team ${TEAMS.TEAM_NS} was euchred! Team ${TEAMS.TEAM_EW} gets 2 points.`);
    });

    it('makers (EW) euchred (0 tricks), going alone - 2 points for NS', async () => {
      gameState.makerTeam = TEAMS.TEAM_EW;
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 0 }; // TEAM_EW (makers) got 0 tricks
      gameState.goingAlone = true;
      const newState = await calculateAndApplyScore(gameState);
      expect(newState.teamScores[TEAMS.TEAM_NS]).to.equal(2);
      expect(newState.teamScores[TEAMS.TEAM_EW]).to.equal(0);
      expect(newState.message).to.include(`Team ${TEAMS.TEAM_EW} was euchred! Team ${TEAMS.TEAM_NS} gets 2 points.`);
    });

    it('should reset tricksTaken, currentTrick for next hand and preserve previousTricksTaken', async () => {
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 };
      gameState.currentTrick = [{ suit: SUITS.SPADES, rank: 'A', playedBy: PLAYER_ROLES[0] }];
      const originalTricks = { ...gameState.tricksTaken }; // Deep copy for assertion

      const newState = await calculateAndApplyScore(gameState);
      expect(newState.tricksTaken).to.deep.equal({ [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 });
      expect(newState.currentTrick).to.deep.equal([]);
      expect(newState.previousTricksTaken).to.deep.equal(originalTricks);
    });
  });

  // Removed describe('checkGameOver', ...) block as it's being moved to endGame.unit.test.js

  describe('handleNewGameRequest', () => {
    it('should throw error if not in GAME_OVER phase', () => {
      gameState.gamePhase = GAME_PHASES.PLAYING;
      expect(() => handleNewGameRequest(gameState)).to.throw('Can only start a new game from GAME_OVER phase.');
    });

    it('should call resetFullGame and return a new LOBBY state if in GAME_OVER phase', () => {
      gameState.gamePhase = GAME_PHASES.GAME_OVER;
      const originalGameId = gameState.gameId; // gameScoringTest

      let newState;
      expect(() => {
        newState = handleNewGameRequest(gameState);
      }).to.not.throw();

      expect(newState.gamePhase).to.equal(GAME_PHASES.LOBBY);
      // resetFullGame from state.js is designed to create a brand new gameId
      expect(newState.gameId).to.not.equal(originalGameId);
      // Check a few other properties to ensure it's a fresh state (updated to reflect new initialization)
      expect(newState.teamScores).to.deep.equal({
        [TEAMS.TEAM_NS]: 0,
        [TEAMS.TEAM_EW]: 0
      });
      expect(newState.tricksTaken).to.deep.equal({
        [TEAMS.TEAM_NS]: 0,
        [TEAMS.TEAM_EW]: 0
      });
      expect(newState.dealer).to.equal(PLAYER_ROLES[0]); // Default dealer
    });
  });
});
