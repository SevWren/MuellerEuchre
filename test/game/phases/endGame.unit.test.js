/**
 * @file test/phases/endGame.unit.test.js
 * @module test/phases/endGame.unit
 * @description
 *   Unit tests for the end-game logic of the Euchre Multiplayer game.
 *   These tests cover score calculation, game over detection, match statistics,
 *   and new game initialization. This file has been refactored to use native
 *   Node.js test runner and assertion modules.
 *
 *   Key Test Areas:
 *   - Score calculation at end of hand
 *   - Game over detection when winning score is reached
 *   - Match statistics tracking
 *   - New game initialization
 */

import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Import constants and errors directly from the source
import {
  GAME_PHASES,
  PLAYER_ROLES,
  TEAMS,
  WINNING_SCORE,
} from '../../../src/config/constants.js';

// Import the module under test first to avoid circular dependencies
import * as endGameModule from '../../../src/game/phases/endGame.js';

// Import the mock logger
import mockLogger, { log, error, warn, info, debug } from '../../__mocks__/utils/logger.js';

// Mock the logger module
mock.method(console, 'log', log);
mock.method(console, 'error', error);
mock.method(console, 'warn', warn);
mock.method(console, 'info', info);
mock.method(console, 'debug', debug);

// --- Test Helpers ---

/**
 * Creates a mock logger object for testing purposes.
 * @returns {object} A mock logger with mocked methods.
 */
function createMockLogger() {
  return {
    log: mock.fn(),
  };
}

/**
 * Creates a base game state object for testing.
 * @returns {object} A standardized game state object.
 */
const createTestGameState = () => ({
  gameId: 'test-game-123',
  gamePhase: GAME_PHASES.END_GAME,
  players: {
    [PLAYER_ROLES[0]]: { id: PLAYER_ROLES[0], name: 'Player 1', teamId: TEAMS.TEAM_NS },
    [PLAYER_ROLES[1]]: { id: PLAYER_ROLES[1], name: 'Player 2', teamId: TEAMS.TEAM_EW },
    [PLAYER_ROLES[2]]: { id: PLAYER_ROLES[2], name: 'Player 3', teamId: TEAMS.TEAM_NS },
    [PLAYER_ROLES[3]]: { id: PLAYER_ROLES[3], name: 'Player 4', teamId: TEAMS.TEAM_EW },
  },
  currentPlayer: PLAYER_ROLES[0],
  dealer: PLAYER_ROLES[0],
  makerTeam: TEAMS.TEAM_NS,
  tricks: [],
  scores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  matchStats: {
    gamesPlayed: 0,
    teamWins: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  },
  messages: [],
});

/**
 * Checks if a specific message exists in the game messages array.
 * @param {Array<object>} messages - The array of game messages.
 * @param {string} type - The type of message to find.
 * @param {string} text - The partial text to match in the message.
 * @returns {boolean} True if a matching message is found.
 */
function hasMessage(messages, type, text) {
  if (!Array.isArray(messages)) return false;
  
  return messages.some(
    (msg) =>
      msg.type === type &&
      typeof msg.text === 'string' &&
      msg.text.includes(text)
  );
}

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
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.scores = { [TEAMS.TEAM_NS]: 8, [TEAMS.TEAM_EW]: 7 };
      gameState.tricks = Array(3).fill({ team: TEAMS.TEAM_NS }).concat(Array(2).fill({ team: TEAMS.TEAM_EW }));

      const result = endGameModule.handleEndOfHand(gameState);

      assert.strictEqual(result.scores[TEAMS.TEAM_NS], 9, 'N/S score should be 9');
      assert.strictEqual(result.scores[TEAMS.TEAM_EW], 7, 'E/W score should remain 7');
      assert.ok(hasMessage(result.messages, 'score', 'Team NS made their bid! 1 point.'), 'Should add score message');
      assert.ok(result.gameOver === false || result.gameOver === undefined, 'Game should not be over');
    });

    it('should award 2 points for a march and end the game if score reaches threshold', () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.scores = { [TEAMS.TEAM_NS]: WINNING_SCORE - 2, [TEAMS.TEAM_EW]: 0 };
      gameState.tricks = Array(5).fill({ team: TEAMS.TEAM_NS });

      const result = endGameModule.handleEndOfHand(gameState);

      assert.strictEqual(result.scores[TEAMS.TEAM_NS], WINNING_SCORE, 'N/S score should reach WINNING_SCORE');
      assert.ok(hasMessage(result.messages, 'score', 'Team NS made a march! 2 points!'), 'Should add march message');
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
      assert.ok(hasMessage(result.messages, 'score', `Team NS was euchred! 2 points for EW!`), 'Should add euchre message');
    });

    it("should log a warning if a trick has an unknown team", () => {
      gameState.makerTeam = TEAMS.TEAM_NS;
      gameState.tricks = [{ team: "UNKNOWN_TEAM" }];

      endGameModule.handleEndOfHand(gameState);

      assert.strictEqual(mockLogger.log.mock.calls.length, 1, "Logger should have been called once.");
      const [logLevel, logMessage] = mockLogger.log.mock.calls[0].arguments;
      assert.strictEqual(logLevel, 2);
      assert.match(logMessage, /Encountered trick with unknown team/);
    });

    it("should log a warning if makerTeam is invalid", () => {
      gameState.makerTeam = "INVALID_TEAM";
      gameState.tricks = Array(5).fill({ team: TEAMS.TEAM_NS });

      endGameModule.handleEndOfHand(gameState);

      assert.strictEqual(mockLogger.log.mock.calls.length, 1, "Logger should have been called once.");
      const [logLevel, logMessage] = mockLogger.log.mock.calls[0].arguments;
      assert.strictEqual(logLevel, 3);
      assert.match(logMessage, /Invalid or missing makerTeam/);
    });
  });

  describe('checkGameOver', () => {
    it("should detect when a team has won and update state", () => {
      gameState.scores[TEAMS.TEAM_NS] = WINNING_SCORE;

      const result = endGameModule.checkGameOver(gameState);

      assert.strictEqual(result.gameOver, true, 'gameOver flag should be true');
      assert.strictEqual(result.winningTeam, TEAMS.TEAM_NS, 'Winning team should be NS');
      assert.strictEqual(result.currentPhase, GAME_PHASES.GAME_OVER, 'Phase should be GAME_OVER');
      assert.ok(hasMessage(result.messages, 'game_over', 'Team North/South wins the game!'), 'Should have game over message');
      assert.strictEqual(result.matchStats.gamesPlayed, 1, 'gamesPlayed should be incremented');
      assert.strictEqual(result.matchStats.teamWins[TEAMS.TEAM_NS], 1, 'Team wins should be incremented');
    });

    it("should not change phase if no team has won", () => {
      gameState.scores = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 5 };
      gameState.gamePhase = GAME_PHASES.SCORING;

      const result = endGameModule.checkGameOver(gameState);

      assert.notStrictEqual(result.gamePhase, GAME_PHASES.GAME_OVER, 'Phase should not be GAME_OVER');
      assert.strictEqual(result.gameOver, false, 'gameOver flag should be false');
      assert.strictEqual(result.winningTeam, undefined, 'winningTeam should not be set');
    });
  });

  describe('endGame (internal function)', () => {
    it("should log a warning if trying to increment win for an unknown team", () => {
      const testState = createTestGameState();
      testState.matchStats.teamWins = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 };

      // Directly test the internal endGame function with an invalid team
      const unknownTeam = "UNKNOWN_TEAM";
      const result = endGameModule.endGame(testState, unknownTeam, { [unknownTeam]: 10 });

      // Check if the warning was logged by checking the logger calls
      const warningCalls = mockLogger.log.mock.calls.filter(
        call => call[0] === 3 && call[1].includes('Attempted to increment win for unknown team:')
      );

      // Verify warning was logged for unknown team
      assert.ok(
        warningCalls.length > 0,
        'Expected a warning log for unknown team'
      );
      
      if (warningCalls.length > 0) {
        assert.ok(
          warningCalls[0][1].includes('UNKNOWN_TEAM'),
          'Warning should include UNKNOWN_TEAM'
        );
      }
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