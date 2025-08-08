/**
 * @file test/game/phases/endGame.unit.test.js
 * @module test/game/phases/endGame.unit
 * @description
 *   Comprehensive unit tests for the end-game logic of the Euchre Multiplayer game.
 *   These tests validate the core functionality of the end-game phase, including:
 *   - Score calculation and point distribution
 *   - Game over detection and winning conditions
 *   - Match statistics tracking and persistence
 *   - New game initialization and state reset
 *   - Edge cases and error handling
 *
 *   Test Organization:
 *   - handleEndOfHand: Tests for end-of-hand scoring and state transitions
 *   - checkGameOver: Tests for game over detection and winner determination
 *   - startNewGame: Tests for proper game reset and initialization
 *
 * @see {@link module:src/game/phases/endGame}
 * @see {@link module:test/helpers/test-helpers}
 * @see {@link module:test/game/logic/validation.unit.test.js}
 * @see {@link module:test/utils/idGenerator.unit.test.js}
 * @see {@link module:.windsurf/rules/jsdoc.md}
 *
 * @example
 * // Run all tests in this file
 * node --test test/game/phases/endGame.unit.test.js
 *
 * @example
 * // Run a specific test case
 * node --test --test-name-pattern="should detect when a team has won" test/game/phases/endGame.unit.test.js
 *
 * @since 1.0.0
 * @lastModified 2025-08-07
 */

import assert from 'node:assert/strict';
import { describe, it, before, after, afterEach, beforeEach, mock } from 'node:test';

/**
 * Mock logger for testing purposes.
 * Tracks all logged messages for verification in tests.
 * @type {Object}
 * @property {Function} info - Logs an info message
 * @property {Function} warn - Logs a warning message
 * @property {Function} error - Logs an error message
 * @property {Function} reset - Clears all logged messages
 * @property {Function} assertLogged - Verifies if a message was logged
 * @see {@link module:test/test-utils/mock-logger}
 */
import { createMockLogger } from '../../test-utils/mock-logger.js';
const mockLogger = createMockLogger();

/**
 * Module under test and its exports.
 * @type {Object}
 * @property {Function} checkGameOver - Checks if the game is over
 * @property {Function} startNewGame - Initializes a new game
 * @property {Function} handleEndOfHand - Processes end-of-hand logic
 * @property {Function} getOpponentTeam - Gets the opponent team for a given team
 */
let endGameModule;
let createEndGameModule;
let checkGameOver, startNewGame, handleEndOfHand, getOpponentTeam;

/**
 * Loads the endGame module before any tests run.
 * Uses dynamic import with cache busting to ensure fresh imports.
 * Sets up a custom logger to capture log messages during tests.
 * @async
 * @function
 * @throws {Error} If module loading fails
 * @see {@link module:src/game/phases/endGame}
 */
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

/**
 * Game constants and test utilities.
 * @see {@link module:src/config/constants}
 * @see {@link module:test/helpers/test-helpers}
 */
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

/**
 * Test suite for the end game phase logic.
 * Covers all aspects of game completion, scoring, and new game initialization.
 * @see {@link module:src/game/phases/endGame}
 */
describe('End Game Phase Logic', () => {
  /** @type {Object} The current game state being tested */
  let gameState;

  /**
   * Sets up a fresh test environment before each test case.
   * - Resets the mock logger
   * - Creates a new game state
   * - Ensures test isolation
   * @function
   */
  beforeEach(() => {
    mockLogger.reset();
    gameState = createTestGameState();
  });

  /**
   * Cleans up after all tests have run.
   * Restores any mocked functions to their original implementations.
   * @function
   */
  after(() => {
    mock.restoreAll();
  });
  
  /**
   * Test suite for the handleEndOfHand function.
   * Validates scoring, game state transitions, and message generation
   * at the end of a hand.
   * @see {@link module:src/game/phases/endGame.handleEndOfHand}
   */
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

  /**
   * Test suite for the checkGameOver function.
   * Validates game over detection, winner determination, and
   * match statistics updates.
   * @see {@link module:src/game/phases/endGame.checkGameOver}
   */
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

  /**
   * Test suite for the startNewGame function.
   * Validates game state reset and proper initialization
   * of a new game session.
   * @see {@link module:src/game/phases/endGame.startNewGame}
   */
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