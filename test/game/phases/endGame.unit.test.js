/**
 * @file test/game/phases/endGame.unit.test.js
 * @module test/game/phases/endGame.unit
 * @description
 *   Unit tests for the end-game logic of the Euchre Multiplayer game.
 *   These tests cover score calculation, game over detection, match statistics,
 *   and new game initialization.
 *
 *   Key Test Areas:
 *   - Score calculation at end of hand
 *   - Game over detection when winning score is reached
 *   - Match statistics tracking
 *   - New game initialization
 *
 * @see src/game/phases/endGame.js
 * @see test/game/logic/validation.unit.test.js
 * @see test/utils/idGenerator.unit.test.js
 */

import assert from 'node:assert/strict';
import { describe, it, before, after, afterEach, beforeEach, mock } from 'node:test';

// Import the project's mock logger utility
import { createMockLogger } from '../../test-utils/mock-logger.js';

// Create a mock logger
const mockLogger = createMockLogger();

// Import the module under test using dynamic import with cache busting
let endGameModule;
let createEndGameModule;
let checkGameOver, startNewGame, handleEndOfHand, getOpponentTeam;

// Load the module before tests run
before(async () => {
  try {
    // Use a cache-busting query parameter to ensure fresh import
    const modulePath = `../../../src/game/phases/endGame.js?t=${Date.now()}`;
    const module = await import(modulePath);
    createEndGameModule = module.createEndGameModule;
    const customLogMock = (level, message, ...args) => {
      const logMessage = [message, ...args].filter(Boolean).join(' ');
      
      if (level === 1) { // INFO
        mockLogger.info(logMessage);
      } else if (level === 2) { // WARN
        mockLogger.warn(logMessage);
      } else if (level === 3) { // ERROR
        mockLogger.error(logMessage);
      } else {
        // Fallback for unknown level
        mockLogger.info(`UNKNOWN_LOG_LEVEL [${level}]: ${logMessage}`);
      }
    };
    endGameModule = createEndGameModule({ log: customLogMock });
    
    // Extract the methods we need
    checkGameOver = endGameModule.checkGameOver;
    startNewGame = endGameModule.startNewGame;
    handleEndOfHand = endGameModule.handleEndOfHand;
    getOpponentTeam = endGameModule.getOpponentTeam;
  } catch (error) {
    console.error('Error loading module:', error);
    throw error;
  }
});

// Import constants and test utilities
import { GAME_PHASES, PLAYER_ROLES, TEAMS, WINNING_SCORE, DEBUG_LEVELS } from '../../../src/config/constants.js';
import { createBaseGameState, withTestState } from '../../../test/helpers/test-helpers.js';

/**
 * Helper function to set up a completed hand state for testing
 * @param {Object} params - Parameters for the test
 * @param {string} params.makerTeam - The team that made the bid
 * @param {number} params.tricksWonByMaker - Number of tricks won by the maker team
 * @param {Object} [params.stateOverrides={}] - Overrides for the game state
 * @returns {Object} The configured game state
 */
function setupCompletedHandState({ makerTeam, tricksWonByMaker, stateOverrides = {} }) {
  const totalTricks = 5; // Total tricks in a hand of euchre
  const tricksWonByOpponent = totalTricks - tricksWonByMaker;
  
  // Create base state with overrides
  const baseState = {
    ...createTestGameState(),
    makerTeam,
    tricks: [
      ...Array(tricksWonByMaker).fill({ team: makerTeam }),
      ...Array(tricksWonByOpponent).fill({ team: getOpponentTeam(makerTeam) })
    ],
    ...stateOverrides
  };
  
  return baseState;
}

/**
 * Helper function to check if a message exists in the messages array
 * @param {Array} messages - Array of message objects
 * @param {string} type - The type of message to check for
 * @param {string|RegExp} text - The text to search for in the message
 * @returns {boolean} True if a matching message is found
 */
const hasMessage = (messages, type, text) => {
  if (!messages) return false;
  return messages.some(msg => {
    if (msg.type !== type) return false;
    return typeof text === 'string' 
      ? msg.text.includes(text) 
      : text.test(msg.text);
  });
};

/**
 * Creates a base game state object for testing.
 * @returns {object} A standardized game state object.
 */
const createTestGameState = () => ({
  gameId: 'test-game-123',
  currentPhase: GAME_PHASES.END_GAME,
  players: {
    [PLAYER_ROLES[0]]: { id: PLAYER_ROLES[0], name: 'Player 1', teamId: TEAMS.NS },
    [PLAYER_ROLES[1]]: { id: PLAYER_ROLES[1], name: 'Player 2', teamId: TEAMS.EW },
    [PLAYER_ROLES[2]]: { id: PLAYER_ROLES[2], name: 'Player 3', teamId: TEAMS.NS },
    [PLAYER_ROLES[3]]: { id: PLAYER_ROLES[3], name: 'Player 4', teamId: TEAMS.EW },
  },
  currentPlayer: PLAYER_ROLES[0],
  dealer: PLAYER_ROLES[0],
  makerTeam: TEAMS.NS,
  tricks: [],
  scores: { [TEAMS.NS]: 0, [TEAMS.EW]: 0 },
  matchStats: {
    gamesPlayed: 0,
    teamWins: { [TEAMS.NS]: 0, [TEAMS.EW]: 0 },
  },
  messages: [],
  gameOver: false, // Explicitly initialize gameOver flag to false
});

// --- Test Suite ---

describe('End Game Phase Logic', () => {
  let gameState;

  // Setup before each test
  beforeEach(() => {
    // Reset the mock logger before each test
    mockLogger.reset();
    
    // Create a fresh game state for each test
    gameState = createTestGameState();
  });

  // Cleanup after all tests
  after(() => {
    // Restore all mocks
    mock.restoreAll();
  });
  
  describe('handleEndOfHand', () => {
    it('should update scores correctly when winning score is not reached', () => {
      gameState.makerTeam = TEAMS.NS;
      gameState.scores = { [TEAMS.NS]: 8, [TEAMS.EW]: 7 };
      gameState.tricks = Array(3).fill({ team: TEAMS.NS }).concat(Array(2).fill({ team: TEAMS.EW }));

      const result = endGameModule.handleEndOfHand(gameState);

      assert.strictEqual(result.scores[TEAMS.NS], 9, 'N/S score should be 9');
      assert.strictEqual(result.scores[TEAMS.EW], 7, 'E/W score should remain 7');
      assert.ok(hasMessage(result.messages, 'score', 'Team TEAM_NS made their bid! 1 point.'), 'Should add score message');
      assert.ok(result.gameOver === false || result.gameOver === undefined, 'Game should not be over');
    });

    it('should award 2 points for a march and end the game if score reaches threshold', () => {
      gameState.makerTeam = TEAMS.NS;
      gameState.scores = { [TEAMS.NS]: WINNING_SCORE - 2, [TEAMS.EW]: 0 };
      gameState.tricks = Array(5).fill({ team: TEAMS.NS });

      const result = endGameModule.handleEndOfHand(gameState);

      assert.strictEqual(result.scores[TEAMS.NS], WINNING_SCORE, 'N/S score should reach WINNING_SCORE');
      assert.ok(hasMessage(result.messages, 'score', 'Team TEAM_NS made a march! 2 points!'), 'Should add march message');
      assert.strictEqual(result.gameOver, true, 'Game should be over');
      assert.strictEqual(result.winningTeam, TEAMS.NS, 'Winning team should be set');
      assert.strictEqual(result.currentPhase, GAME_PHASES.GAME_OVER, 'Should transition to GAME_OVER phase');
    });

    it('should award 2 points for a march and end the game if score reaches threshold', () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.scores = { [TEAMS.TEAM_NS]: WINNING_SCORE - 2, [TEAMS.TEAM_EW]: 0 };
      gameState.tricks = Array(5).fill({ team: TEAMS.TEAM_NS });

      const result = endGameModule.handleEndOfHand(gameState);

      assert.strictEqual(result.scores[TEAMS.TEAM_NS], WINNING_SCORE, 'N/S score should reach WINNING_SCORE');
      assert.ok(hasMessage(result.messages, 'score', 'Team TEAM_NS made a march! 2 points!'), 'Should add march message');
      assert.strictEqual(result.gameOver, true, 'Game should be over');
      assert.strictEqual(result.winningTeam, TEAMS.TEAM_NS, 'Winning team should be set');
      assert.strictEqual(result.currentPhase, GAME_PHASES.GAME_OVER, 'Should transition to GAME_OVER phase');
    });

    it("should award 2 points to opponents for a euchre", () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.scores = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 7 };
      gameState.tricks = Array(5).fill({ team: TEAMS.TEAM_EW }); // Opponents take all tricks

      const result = endGameModule.handleEndOfHand(gameState);

      assert.strictEqual(result.scores[TEAMS.TEAM_EW], 9, 'E/W score should be 9');
      assert.ok(hasMessage(result.messages, 'score', `Team TEAM_NS was euchred! 2 points for TEAM_EW!`), 'Should add euchre message');
    });

    it("should log a warning if a trick has an unknown team", () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricks = [{ team: "UNKNOWN_TEAM" }];

      endGameModule.handleEndOfHand(gameState);

      // Check that a warning was logged
      mockLogger.assertLogged('warn', 'Encountered trick with unknown team');
    });

    it("should log a warning if makerTeam is invalid", () => {
      gameState.makerTeam = "INVALID_TEAM";
      gameState.tricks = Array(5).fill({ team: TEAMS.TEAM_NS });

      endGameModule.handleEndOfHand(gameState);

      // Check that an error was logged
      mockLogger.assertLogged('error', 'Invalid or missing makerTeam');
    });
  });

  describe('checkGameOver', () => {
    it("should detect when a team has won and update state", async () => {
      // Use the test helper to create a consistent test state
      const gameState = setupCompletedHandState({
        makerTeam: TEAMS.TEAM_NS,
        tricksWonByMaker: 5,
        stateOverrides: {
          scores: { [TEAMS.TEAM_NS]: WINNING_SCORE, [TEAMS.TEAM_EW]: 0 },
          matchStats: { gamesPlayed: 0, teamWins: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 } }
        }
      });

      const result = endGameModule.checkGameOver(gameState);

      // Assert the game over state
      assert.strictEqual(result.gameOver, true, 'gameOver flag should be true');
      assert.strictEqual(result.winningTeam, TEAMS.TEAM_NS, 'Winning team should be NS');
      
      // Check both phase properties to be safe
      const phase = result.currentPhase || result.gamePhase;
      assert.strictEqual(phase, GAME_PHASES.GAME_OVER, 'Phase should be GAME_OVER');
      
      // Check game messages
      assert.ok(
        hasMessage(result.messages, 'game_over', 'Game Over! Team North/South wins the game!'),
        'Should have game over message'
      );
      
      // Verify match stats
      assert.strictEqual(
        result.matchStats.gamesPlayed, 
        1, 
        'gamesPlayed should be incremented'
      );
      assert.strictEqual(
        result.matchStats.teamWins[TEAMS.TEAM_NS], 
        1, 
        'Team NS wins should be incremented'
      );
    });

    it("should not change phase if no team has won", () => {
      gameState.scores = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 5 };
      gameState.gamePhase = GAME_PHASES.SCORING;

      const result = endGameModule.checkGameOver(gameState);

      // Check both phase properties to be safe
      const phase = result.currentPhase || result.gamePhase;
      assert.notStrictEqual(phase, GAME_PHASES.GAME_OVER, 'Phase should not be GAME_OVER');
      assert.strictEqual(result.gameOver, false, 'gameOver flag should be false');
      assert.strictEqual(result.winningTeam, undefined, 'winningTeam should not be set');
    });
  });

  describe('endGame (internal function)', () => {
    it("should log a warning if trying to increment win for an unknown team", async () => {
      // Reset mock before test
      mockLogger.reset();
      
      // Create a test state using the helper
      const testState = setupCompletedHandState({
        makerTeam: TEAMS.TEAM_NS, // Can be any valid team for this test setup
        tricksWonByMaker: 3, // Can be any number, doesn't affect the warning for unknown team
        stateOverrides: {
          gameOver: false,
          matchStats: {
            gamesPlayed: 0,
            teamWins: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }
          }
        }
      });
      
      // Call the internal endGame function directly with an unknown team
      endGameModule.endGame(testState, 'UNKNOWN_TEAM', { [TEAMS.TEAM_NS]: 10, [TEAMS.TEAM_EW]: 5 });
      
      // Check the error was logged
      mockLogger.assertLogged('error', 'Attempted to increment win for unknown team: UNKNOWN_TEAM');
    });
  });

  describe('startNewGame', () => {
    it("should reset the game state for a new game session", () => {
      const completedGame = {
        ...gameState,
        gameOver: true,
        winningTeam: TEAMS.TEAM_NS,
        currentPhase: GAME_PHASES.GAME_OVER,
        scores: { [TEAMS.TEAM_NS]: WINNING_SCORE, [TEAMS.TEAM_EW]: 5 },
        matchStats: { gamesPlayed: 1, teamWins: { [TEAMS.TEAM_NS]: 1, [TEAMS.TEAM_EW]: 0 } },
      };

      const result = endGameModule.startNewGame(completedGame);

      assert.strictEqual(result.gameOver, false, 'gameOver flag should be reset');
      assert.strictEqual(result.winningTeam, null, 'winningTeam should be reset');
      assert.strictEqual(result.currentPhase, GAME_PHASES.LOBBY, 'Phase should be reset to LOBBY');
      assert.deepStrictEqual(result.players, {}, 'Players object should be cleared');
      assert.deepStrictEqual(result.scores, { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, 'Scores should be reset');
      assert.ok(hasMessage(result.messages, 'game', 'A new game is starting!'), 'Should add new game message');
    });
  });
});