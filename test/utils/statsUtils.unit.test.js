// filepath: test/utils/statsUtils.unit.test.js
/**
 * @file Test suite for statsUtils.js utility functions
 * @module test/utils/statsUtils.unit.test
 * @description Contains unit tests for statistics calculation and player stat updates using only node:test.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mocked dependencies
const mockLogger = {
  info: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
};

class MockPhaseLogicError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PhaseLogicError';
  }
}

const mockTEAMS = {
  TEAM_NS: 'NS',
  TEAM_EW: 'EW',
};

// Mock the dependencies of statsUtils.js
mock.module('../../src/game/logic/errors.js', () => ({
  PhaseLogicError: MockPhaseLogicError,
}));
mock.module('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));
mock.module('../../src/config/constants.js', () => ({
  TEAMS: mockTEAMS,
}));

// Dynamically import the module under test after mocks are set up
const { calculateHandStats, updatePlayerStats } = await import(
  '../../src/utils/statsUtils.js'
);

describe('statsUtils', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mock.reset();
  });

  describe('calculateHandStats(completedGameState)', () => {
    it('should calculate stats correctly for a maker team winning 5 tricks (alone)', () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: 'south',
        tricksTaken: { [mockTEAMS.TEAM_NS]: 5, [mockTEAMS.TEAM_EW]: 0 },
        players: [
          { role: 'south', team: mockTEAMS.TEAM_NS, hand: [] },
          { role: 'west', team: mockTEAMS.TEAM_EW, hand: ['card1'] },
          { role: 'north', team: mockTEAMS.TEAM_NS, hand: [] },
          { role: 'east', team: mockTEAMS.TEAM_EW, hand: ['card2'] },
        ],
      };
      const result = calculateHandStats(gameState);
      assert.deepStrictEqual(result, {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 4,
        wasEuchre: false,
        wentAlone: true,
      });
    });

    it('should calculate stats correctly for a maker team winning 5 tricks (not alone)', () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: 'south',
        tricksTaken: { [mockTEAMS.TEAM_NS]: 5, [mockTEAMS.TEAM_EW]: 0 },
        players: [
          { role: 'south', team: mockTEAMS.TEAM_NS, hand: ['card1'] },
          { role: 'west', team: mockTEAMS.TEAM_EW, hand: ['card2'] },
          { role: 'north', team: mockTEAMS.TEAM_NS, hand: ['card3'] },
          { role: 'east', team: mockTEAMS.TEAM_EW, hand: ['card4'] },
        ],
      };
      const result = calculateHandStats(gameState);
      assert.deepStrictEqual(result, {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 2,
        wasEuchre: false,
        wentAlone: false,
      });
    });

    it('should calculate stats correctly for a maker team winning 3 tricks', () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: 'south',
        tricksTaken: { [mockTEAMS.TEAM_NS]: 3, [mockTEAMS.TEAM_EW]: 2 },
        players: [
          { role: 'south', team: mockTEAMS.TEAM_NS, hand: ['card1'] },
          { role: 'west', team: mockTEAMS.TEAM_EW, hand: ['card2'] },
          { role: 'north', team: mockTEAMS.TEAM_NS, hand: ['card3'] },
          { role: 'east', team: mockTEAMS.TEAM_EW, hand: ['card4'] },
        ],
      };
      const result = calculateHandStats(gameState);
      assert.deepStrictEqual(result, {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      });
    });

    it('should calculate stats correctly for a euchre (maker team wins less than 3 tricks)', () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: 'south',
        tricksTaken: { [mockTEAMS.TEAM_NS]: 2, [mockTEAMS.TEAM_EW]: 3 },
        players: [
          { role: 'south', team: mockTEAMS.TEAM_NS, hand: ['card1'] },
          { role: 'west', team: mockTEAMS.TEAM_EW, hand: ['card2'] },
          { role: 'north', team: mockTEAMS.TEAM_NS, hand: ['card3'] },
          { role: 'east', team: mockTEAMS.TEAM_EW, hand: ['card4'] },
        ],
      };
      const result = calculateHandStats(gameState);
      assert.deepStrictEqual(result, {
        scoringTeam: mockTEAMS.TEAM_EW,
        pointsScored: 2,
        wasEuchre: true,
        wentAlone: false,
      });
    });

    it('should throw PhaseLogicError if completedGameState is null', () => {
      assert.throws(
        () => calculateHandStats(null),
        (err) => {
          assert(err instanceof MockPhaseLogicError);
          assert.strictEqual(
            err.message,
            'Invalid completedGameState provided for stats calculation.',
          );
          return true;
        },
      );
    });

    it('should throw PhaseLogicError if completedGameState is not an object', () => {
      assert.throws(
        () => calculateHandStats('invalid'),
        (err) => {
          assert(err instanceof MockPhaseLogicError);
          assert.strictEqual(
            err.message,
            'Invalid completedGameState provided for stats calculation.',
          );
          return true;
        },
      );
    });

    it('should throw PhaseLogicError if makerTeam is missing', () => {
      const gameState = {
        tricksTaken: { [mockTEAMS.TEAM_NS]: 3, [mockTEAMS.TEAM_EW]: 2 },
        players: {},
      };
      assert.throws(
        () => calculateHandStats(gameState),
        (err) => {
          assert(err instanceof MockPhaseLogicError);
          assert.strictEqual(
            err.message,
            'Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players.',
          );
          return true;
        },
      );
    });

    it('should handle cases where tricksTaken for a team is undefined (treat as 0)', () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: 'south',
        tricksTaken: { [mockTEAMS.TEAM_NS]: 5 }, // TEAM_EW tricksTaken is undefined
        players: [
          { role: 'south', team: mockTEAMS.TEAM_NS, hand: [] },
          { role: 'west', team: mockTEAMS.TEAM_EW, hand: ['card1'] },
          { role: 'north', team: mockTEAMS.TEAM_NS, hand: [] },
          { role: 'east', team: mockTEAMS.TEAM_EW, hand: ['card2'] },
        ],
      };
      const result = calculateHandStats(gameState);
      assert.strictEqual(result.pointsScored, 4);
    });
  });

  describe('updatePlayerStats(currentStats, handResult, playerTeamId)', () => {
    const defaultStats = {
      handsPlayed: 0,
      handsWon: 0,
      pointsScored: 0,
      euchres: 0,
      wentAlone: 0,
      aloneHandsWon: 0,
      tricksTaken: 0,
    };

    it('should initialize stats if currentStats is empty or undefined', () => {
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        undefined,
        handResult,
        mockTEAMS.TEAM_NS,
      );
      assert.strictEqual(updatedStats.handsPlayed, 1);
      assert.strictEqual(updatedStats.handsWon, 1);
      assert.strictEqual(updatedStats.pointsScored, 1);
      assert.strictEqual(updatedStats.euchres, 0);
    });

    it('should increment handsPlayed for any hand', () => {
      const current = { ...defaultStats, handsPlayed: 5 };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_EW,
      );
      assert.strictEqual(updatedStats.handsPlayed, 6);
    });

    it('should update stats correctly when playerTeam wins a hand (went alone)', () => {
      const current = { ...defaultStats };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 4,
        wasEuchre: false,
        wentAlone: true,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_NS,
      );
      assert.strictEqual(updatedStats.handsPlayed, 1);
      assert.strictEqual(updatedStats.handsWon, 1);
      assert.strictEqual(updatedStats.pointsScored, 4);
      assert.strictEqual(updatedStats.wentAlone, 1);
      assert.strictEqual(updatedStats.aloneHandsWon, 1);
    });

    it('should update stats correctly when playerTeam is euchred', () => {
      const current = { ...defaultStats };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_EW,
        pointsScored: 2,
        wasEuchre: true,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_NS,
      );
      assert.strictEqual(updatedStats.handsPlayed, 1);
      assert.strictEqual(updatedStats.handsWon, 0);
      assert.strictEqual(updatedStats.pointsScored, 0);
      assert.strictEqual(updatedStats.euchres, 1);
    });

    it('should handle malformed handResult by logging a warning and returning current stats (with handsPlayed incremented)', () => {
      const current = { ...defaultStats, handsPlayed: 5 };
      const updatedStats = updatePlayerStats(current, null, mockTEAMS.TEAM_NS);
      assert.strictEqual(updatedStats.handsPlayed, 6);
      assert.strictEqual(updatedStats.handsWon, 0);
      assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
      assert.match(
        mockLogger.warn.mock.calls[0].arguments[0],
        /Invalid handResult provided to updatePlayerStats/,
      );
    });

    it('should return a new object, not mutate the input currentStats', () => {
      const current = { ...defaultStats, handsPlayed: 5 };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_NS,
      );
      assert.notStrictEqual(updatedStats, current);
      assert.strictEqual(current.handsPlayed, 5);
    });

    it('should correctly merge existing stats with default schema', () => {
      const current = { handsPlayed: 10, customStat: 'abc' };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_NS,
      );
      assert.strictEqual(updatedStats.handsPlayed, 11);
      assert.strictEqual(updatedStats.handsWon, 1);
      assert.strictEqual(updatedStats.pointsScored, 1);
      assert.strictEqual(updatedStats.customStat, 'abc');
    });
  });
});