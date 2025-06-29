// filepath: test/utils/statsUtils.unit.test.js

import { expect } from "chai";
import esmock from "esmock";
import sinon from "sinon";

describe("statsUtils", () => {
  let calculateHandStats;
  let updatePlayerStats;
  let mockLogger;
  let mockPhaseLogicError;
  let mockTEAMS;

  before(async () => {
    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    mockPhaseLogicError = class MockPhaseLogicError extends Error {
      constructor(message) {
        super(message);
        this.name = "PhaseLogicError";
      }
    };

    mockTEAMS = {
      TEAM_1: "NS",
      TEAM_2: "EW",
    };

    ({ calculateHandStats, updatePlayerStats } = await esmock(
      "../../src/utils/statsUtils.js",
      {
        "../../src/game/logic/errors.js": {
          PhaseLogicError: mockPhaseLogicError,
        },
        "../../src/utils/logger.js": { logger: mockLogger },
        "../../src/config/constants.js": { TEAMS: mockTEAMS },
      }
    ));
  });

  beforeEach(() => {
    mockLogger.info.resetHistory();
    mockLogger.warn.resetHistory();
    mockLogger.error.resetHistory();
  });

  describe("calculateHandStats(completedGameState)", () => {
    it("should calculate stats correctly for a maker team winning 5 tricks (alone)", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_1,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_1]: 5, [mockTEAMS.TEAM_2]: 0 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_1, hand: [] }, // Maker, went alone
          { role: "west", team: mockTEAMS.TEAM_2, hand: ["card1"] },
          { role: "north", team: mockTEAMS.TEAM_1, hand: [] }, // Partner, empty hand
          { role: "east", team: mockTEAMS.TEAM_2, hand: ["card2"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 4,
        wasEuchre: false,
        wentAlone: true,
      });
    });

    it("should calculate stats correctly for a maker team winning 5 tricks (not alone)", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_1,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_1]: 5, [mockTEAMS.TEAM_2]: 0 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_1, hand: ["cardA"] },
          { role: "west", team: mockTEAMS.TEAM_2, hand: ["cardB"] },
          { role: "north", team: mockTEAMS.TEAM_1, hand: ["cardC"] },
          { role: "east", team: mockTEAMS.TEAM_2, hand: ["cardD"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 2,
        wasEuchre: false,
        wentAlone: false,
      });
    });

    it("should calculate stats correctly for a maker team winning 3 tricks", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_1,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_1]: 3, [mockTEAMS.TEAM_2]: 2 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_1, hand: ["cardA"] },
          { role: "west", team: mockTEAMS.TEAM_2, hand: ["cardB"] },
          { role: "north", team: mockTEAMS.TEAM_1, hand: ["cardC"] },
          { role: "east", team: mockTEAMS.TEAM_2, hand: ["cardD"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      });
    });

    it("should calculate stats correctly for a maker team winning 4 tricks", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_1,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_1]: 4, [mockTEAMS.TEAM_2]: 1 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_1, hand: ["cardA"] },
          { role: "west", team: mockTEAMS.TEAM_2, hand: ["cardB"] },
          { role: "north", team: mockTEAMS.TEAM_1, hand: ["cardC"] },
          { role: "east", team: mockTEAMS.TEAM_2, hand: ["cardD"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      });
    });

    it("should calculate stats correctly for a euchre (maker team wins less than 3 tricks)", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_1,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_1]: 2, [mockTEAMS.TEAM_2]: 3 },
        players: [
          { role: "south", team: mockTEAMS.TEAM_1, hand: ["cardA"] },
          { role: "west", team: mockTEAMS.TEAM_2, hand: ["cardB"] },
          { role: "north", team: mockTEAMS.TEAM_1, hand: ["cardC"] },
          { role: "east", team: mockTEAMS.TEAM_2, hand: ["cardD"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result).to.deep.equal({
        scoringTeam: mockTEAMS.TEAM_2,
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
        tricksTaken: { [mockTEAMS.TEAM_1]: 3, [mockTEAMS.TEAM_2]: 2 },
        players: [],
      };
      expect(() => calculateHandStats(gameState)).to.throw(
        mockPhaseLogicError,
        "Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players."
      );
    });

    it("should throw PhaseLogicError if tricksTaken is missing", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_1,
        players: [],
      };
      expect(() => calculateHandStats(gameState)).to.throw(
        mockPhaseLogicError,
        "Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players."
      );
    });

    it("should throw PhaseLogicError if players is missing", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_1,
        tricksTaken: { [mockTEAMS.TEAM_1]: 3, [mockTEAMS.TEAM_2]: 2 },
      };
      expect(() => calculateHandStats(gameState)).to.throw(
        mockPhaseLogicError,
        "Incomplete game state for stats calculation: missing makerTeam, tricksTaken, or players."
      );
    });

    it("should handle cases where tricksTaken for a team is undefined (treat as 0)", () => {
      const gameState = {
        makerTeam: mockTEAMS.TEAM_1,
        makerPlayerRole: "south",
        tricksTaken: { [mockTEAMS.TEAM_1]: 5 }, // TEAM_2 tricksTaken is undefined
        players: [
          { role: "south", team: mockTEAMS.TEAM_1, hand: [] },
          { role: "west", team: mockTEAMS.TEAM_2, hand: ["card1"] },
          { role: "north", team: mockTEAMS.TEAM_1, hand: [] },
          { role: "east", team: mockTEAMS.TEAM_2, hand: ["card2"] },
        ],
      };
      const result = calculateHandStats(gameState);
      expect(result.pointsScored).to.equal(4); // Still 4 points for alone
    });
  });

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

    it("should initialize stats if currentStats is empty or undefined", () => {
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        undefined,
        handResult,
        mockTEAMS.TEAM_1
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(1);
      expect(updatedStats.euchres).to.equal(0);
      expect(updatedStats.wentAlone).to.equal(0);
      expect(updatedStats.aloneHandsWon).to.equal(0);
    });

    it("should increment handsPlayed for any hand", () => {
      const current = { ...defaultStats, handsPlayed: 5 };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_2
      ); // Opponent team
      expect(updatedStats.handsPlayed).to.equal(6);
    });

    it("should update stats correctly when playerTeam wins a hand (not alone)", () => {
      const current = { ...defaultStats };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_1
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(1);
      expect(updatedStats.euchres).to.equal(0);
      expect(updatedStats.wentAlone).to.equal(0);
      expect(updatedStats.aloneHandsWon).to.equal(0);
    });

    it("should update stats correctly when playerTeam wins a hand (went alone)", () => {
      const current = { ...defaultStats };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 4,
        wasEuchre: false,
        wentAlone: true,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_1
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(4);
      expect(updatedStats.euchres).to.equal(0);
      expect(updatedStats.wentAlone).to.equal(1);
      expect(updatedStats.aloneHandsWon).to.equal(1);
    });

    it("should update stats correctly when playerTeam is euchred", () => {
      const current = { ...defaultStats };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_2,
        pointsScored: 2,
        wasEuchre: true,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_1
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(0);
      expect(updatedStats.pointsScored).to.equal(0);
      expect(updatedStats.euchres).to.equal(1);
      expect(updatedStats.wentAlone).to.equal(0);
      expect(updatedStats.aloneHandsWon).to.equal(0);
    });

    it("should not increment euchres if playerTeam is the one who euchred", () => {
      const current = { ...defaultStats };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 2,
        wasEuchre: true,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_1
      );
      expect(updatedStats.handsPlayed).to.equal(1);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(2);
      expect(updatedStats.euchres).to.equal(0); // Should not increment euchres for self
    });

    it("should handle malformed handResult by logging a warning and returning current stats (with handsPlayed incremented)", () => {
      const current = { ...defaultStats, handsPlayed: 5 };
      const updatedStats = updatePlayerStats(current, null, mockTEAMS.TEAM_1);
      expect(updatedStats.handsPlayed).to.equal(6); // handsPlayed should still increment
      expect(updatedStats.handsWon).to.equal(0);
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Invalid handResult provided to updatePlayerStats"
      );
    });

    it("should return a new object, not mutate the input currentStats", () => {
      const current = { ...defaultStats, handsPlayed: 5 };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_1
      );
      expect(updatedStats).to.not.equal(current);
      expect(current.handsPlayed).to.equal(5); // Original should be unchanged
    });

    it("should correctly merge existing stats with default schema", () => {
      const current = { handsPlayed: 10, customStat: "abc" };
      const handResult = {
        scoringTeam: mockTEAMS.TEAM_1,
        pointsScored: 1,
        wasEuchre: false,
        wentAlone: false,
      };
      const updatedStats = updatePlayerStats(
        current,
        handResult,
        mockTEAMS.TEAM_1
      );
      expect(updatedStats.handsPlayed).to.equal(11);
      expect(updatedStats.handsWon).to.equal(1);
      expect(updatedStats.pointsScored).to.equal(1);
      expect(updatedStats.customStat).to.equal("abc"); // Custom stat should be preserved
    });
  });
});
