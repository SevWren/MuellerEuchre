// filepath: test/utils/statsUtils.unit.test.js
/**
 * @file Test suite for statsUtils.js utility functions
 * @module test/utils/statsUtils.unit.test
 * @description Contains unit tests for statistics calculation and player stat updates
 */

import { expect } from "chai";
import sinon from "sinon";
import { esmockWithPaths } from './esmock_wrapper.js';

/**
 * Test suite for statsUtils module
 * @namespace statsUtils
 * @description Contains unit tests for the statsUtils module
 */
describe("statsUtils", () => {
  let calculateHandStats;
  let updatePlayerStats;
  let mockLogger;
  let mockPhaseLogicError;
  let mockTEAMS;

  /**
   * Setup test doubles before running tests
   * @async
   */
  before(async () => {
    // Setup test doubles
    mockLogger = {
      /**
       * Mock logger info method
       * @memberof mockLogger
       */
      info: sinon.stub(),
      /**
       * Mock logger warn method
       * @memberof mockLogger
       */
      warn: sinon.stub(),
      /**
       * Mock logger error method
       * @memberof mockLogger
       */
      error: sinon.stub(),
    };

    mockPhaseLogicError = class MockPhaseLogicError extends Error {
      /**
       * Constructor for MockPhaseLogicError
       * @param {string} message - Error message
       */
      constructor(message) {
        super(message);
        this.name = "PhaseLogicError";
      }
    };

    mockTEAMS = {
      TEAM_NS: "NS",
      TEAM_EW: "EW",
    };

    // Use esmockWithPaths to load the module with mocks
    const moduleUnderTest = await esmockWithPaths(
      import.meta.url,
      '../../src/utils/statsUtils.js', // Use relative path
      {
        // Mock dependencies using path aliases
        '@/game/logic/errors.js': {
          PhaseLogicError: mockPhaseLogicError,
        },
        '@/utils/logger.js': { 
          logger: mockLogger 
        },
        '@/config/constants.js': { 
          TEAMS: mockTEAMS 
        },
      }
    );
    
    // Destructure the imported functions
    calculateHandStats = moduleUnderTest.calculateHandStats;
    updatePlayerStats = moduleUnderTest.updatePlayerStats;
  });

  beforeEach(() => {
    mockLogger.info.resetHistory();
    mockLogger.warn.resetHistory();
    mockLogger.error.resetHistory();
  });

  /**
   * Test suite for calculateHandStats function
   * @namespace statsUtils.calculateHandStats
   */
  describe("calculateHandStats(completedGameState)", () => {
    it("should calculate stats correctly for a maker team winning 5 tricks (alone)", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_NS]: 5, [mockTEAMS.TEAM_EW]: 0 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_NS, hand: [] },
          { role: "west", team: mockTEAMS.TEAM_EW, hand: ["card1"] },
          { role: "north", team: mockTEAMS.TEAM_NS, hand: [] },
          { role: "east", team: mockTEAMS.TEAM_EW, hand: ["card2"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 4,
        wasEuchre: false,
        wentAlone: true,
      });
    });

    it("should calculate stats correctly for a maker team winning 5 tricks (not alone)", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_NS]: 5, [mockTEAMS.TEAM_EW]: 0 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_NS, hand: ["card1"] },
          { role: "west", team: mockTEAMS.TEAM_EW, hand: ["card2"] },
          { role: "north", team: mockTEAMS.TEAM_NS, hand: ["card3"] },
          { role: "east", team: mockTEAMS.TEAM_EW, hand: ["card4"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 2,
        wasEuchre: false,
        wentAlone: false,
      });
    });

    it("should calculate stats correctly for a maker team winning 3 tricks", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_NS]: 3, [mockTEAMS.TEAM_EW]: 2 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_NS, hand: ["card1"] },
          { role: "west", team: mockTEAMS.TEAM_EW, hand: ["card2"] },
          { role: "north", team: mockTEAMS.TEAM_NS, hand: ["card3"] },
          { role: "east", team: mockTEAMS.TEAM_EW, hand: ["card4"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      });
    });

    it("should calculate stats correctly for a maker team winning 4 tricks", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_NS]: 4, [mockTEAMS.TEAM_EW]: 1 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_NS, hand: ["card1"] },
          { role: "west", team: mockTEAMS.TEAM_EW, hand: ["card2"] },
          { role: "north", team: mockTEAMS.TEAM_NS, hand: ["card3"] },
          { role: "east", team: mockTEAMS.TEAM_EW, hand: ["card4"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      });
    });

    it("should calculate stats correctly for a euchre (maker team wins less than 3 tricks)", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_NS]: 2, [mockTEAMS.TEAM_EW]: 3 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_NS, hand: ["card1"] },
          { role: "west", team: mockTEAMS.TEAM_EW, hand: ["card2"] },
          { role: "north", team: mockTEAMS.TEAM_NS, hand: ["card3"] },
          { role: "east", team: mockTEAMS.TEAM_EW, hand: ["card4"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_EW,
        pointsScored: 2,
        wasEuchre: true,
        wentAlone: false,
      });
    });

    it("should throw PhaseLogicError if completedGameState is null", () => {
      expect(() => calculateHandStats(null)).to.throw(
        mockPhaseLogicError,
        "Invalid completedGameState provided for stats calculation."
      );
    });

    it("should throw PhaseLogicError if completedGameState is not an object", () => {
      expect(() => calculateHandStats("invalid")).to.throw(
        mockPhaseLogicError,
        "Invalid completedGameState provided for stats calculation."
      );
    });

    it("should throw PhaseLogicError if makerTeam is missing", () => {
      const gameState = {
        tricksTaken: { [mockTEAMS.TEAM_NS]: 3, [mockTEAMS.TEAM_EW]: 2 },
        players: {},
      };
      expect(() => calculateHandStats(gameState)).to.throw(
        mockPhaseLogicError,
        "Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players."
      );
    });

    it("should throw PhaseLogicError if tricksTaken is missing", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        players: {},
      };
      expect(() => calculateHandStats(gameState)).to.throw(
        mockPhaseLogicError,
        "Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players."
      );
    });

    it("should throw PhaseLogicError if players is missing", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        tricksTaken: { [mockTEAMS.TEAM_NS]: 3, [mockTEAMS.TEAM_EW]: 2 },
      };
      expect(() => calculateHandStats(gameState)).to.throw(
        mockPhaseLogicError,
        "Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players."
      );
    });

    it("should handle cases where tricksTaken for a team is undefined (treat as 0)", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_NS,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_NS]: 5 }, // TEAM_EW tricksTaken is undefined
        players: [
          { role: "south", team: mockTEAMS.TEAM_NS, hand: [] },
          { role: "west", team: mockTEAMS.TEAM_EW, hand: ["card1"] },
          { role: "north", team: mockTEAMS.TEAM_NS, hand: [] },
          { role: "east", team: mockTEAMS.TEAM_EW, hand: ["card2"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result.pointsScored).to.equal(4);
    });
  });

  /**
   * Test suite for updatePlayerStats function
   * @namespace statsUtils.updatePlayerStats
   */
  describe("updatePlayerStats(currentStats, handResult, playerTeamId)", () => {
    const defaultStats = {
      handsPlayed: 0,
      handsWon: 0,
      pointsScored: 0,
      euchres: 0,
      wentAlone: 0,
      aloneHandsWon: 0,
      tricksTaken: 0,
    };

    /**
     * Test case: should initialize stats if currentStats is empty or undefined
     * @test {updatePlayerStats}
     */
    it("should initialize stats if currentStats is empty or undefined", () => {
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        undefined,
        handResult,
        mockTEAMS.TEAM_NS
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(1);
      expect(updatedStats.euchres).to.equal(0);
      expect(updatedStats.wentAlone).to.equal(0);
      expect(updatedStats.aloneHandsWon).to.equal(0);
    });

    /**
     * Test case: should increment handsPlayed for any hand
     * @test {updatePlayerStats}
     */
    it("should increment handsPlayed for any hand", () => {
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
        mockTEAMS.TEAM_EW
      );
      expect(updatedStats.handsPlayed).to.equal(6);
    });

    /**
     * Test case: should update stats correctly when playerTeam wins a hand (not alone)
     * @test {updatePlayerStats}
     */
    it("should update stats correctly when playerTeam wins a hand (not alone)", () => {
      const current = { ...defaultStats };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_NS
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(1);
      expect(updatedStats.euchres).to.equal(0);
      expect(updatedStats.wentAlone).to.equal(0);
      expect(updatedStats.aloneHandsWon).to.equal(0);
    });

    /**
     * Test case: should update stats correctly when playerTeam wins a hand (went alone)
     * @test {updatePlayerStats}
     */
    it("should update stats correctly when playerTeam wins a hand (went alone)", () => {
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
        mockTEAMS.TEAM_NS
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(4);
      expect(updatedStats.euchres).to.equal(0);
      expect(updatedStats.wentAlone).to.equal(1);
      expect(updatedStats.aloneHandsWon).to.equal(1);
    });

    /**
     * Test case: should update stats correctly when playerTeam is euchred
     * @test {updatePlayerStats}
     */
    it("should update stats correctly when playerTeam is euchred", () => {
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
        mockTEAMS.TEAM_NS
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(0);
      expect(updatedStats.pointsScored).to.equal(0);
      expect(updatedStats.euchres).to.equal(1);
      expect(updatedStats.wentAlone).to.equal(0);
      expect(updatedStats.aloneHandsWon).to.equal(0);
    });

    /**
     * Test case: should not increment euchres if playerTeam is the one who euchred
     * @test {updatePlayerStats}
     */
    it("should not increment euchres if playerTeam is the one who euchred", () => {
      const current = { ...defaultStats };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 2,
        wasEuchre: true,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_NS
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(2);
      expect(updatedStats.euchres).to.equal(0);
    });

    /**
     * Test case: should handle malformed handResult by logging a warning and returning current stats (with handsPlayed incremented)
     * @test {updatePlayerStats}
     */
    it("should handle malformed handResult by logging a warning and returning current stats (with handsPlayed incremented)", () => {
      const current = { ...defaultStats, handsPlayed: 5 };
      const updatedStats = updatePlayerStats(current, null, mockTEAMS.TEAM_NS);
      expect(updatedStats.handsPlayed).to.equal(6);
      expect(updatedStats.handsWon).to.equal(0);
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Invalid handResult provided to updatePlayerStats"
      );
    });

    /**
     * Test case: should return a new object, not mutate the input currentStats
     * @test {updatePlayerStats}
     */
    it("should return a new object, not mutate the input currentStats", () => {
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
        mockTEAMS.TEAM_NS
      );
      expect(updatedStats).to.not.equal(current);
      expect(current.handsPlayed).to.equal(5);
    });

    /**
     * Test case: should correctly merge existing stats with default schema
     * @test {updatePlayerStats}
     */
    it("should correctly merge existing stats with default schema", () => {
      const current = { handsPlayed: 10, customStat: "abc" };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_NS,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_NS
      );
      expect(updatedStats.handsPlayed).to.equal(11);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(1);
      expect(updatedStats.customStat).to.equal("abc");
    });
  });
});