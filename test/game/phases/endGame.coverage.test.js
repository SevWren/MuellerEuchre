
import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { createEndGameModule } from "../../../src/game/phases/endGame.js";
import { GAME_PHASES, TEAMS } from "../../../src/config/constants.js";

describe("endGame Coverage Tests", () => {
  const mockLogger = mock.fn();
  const endGameModule = createEndGameModule({ log: mockLogger });

  describe("handleEndOfHand", () => {
    it("should handle tricks with unknown teams gracefully", () => {
      const gameState = {
        scores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
        tricks: [
          { team: "UNKNOWN_TEAM", cards: [] }
        ],
        makerTeam: TEAMS.TEAM_NS,
        messages: []
      };

      // Should not throw
      const result = endGameModule.handleEndOfHand(gameState);
      
      // Should log a warning
      const warningCall = mockLogger.mock.calls.find(c => c.arguments[1].includes("unknown team"));
      assert.ok(warningCall, "Should log warning for unknown team");
    });

    it("should initialize matchStats if missing in endGame", () => {
        const gameState = {
            gameOver: false,
            messages: [],
            scores: { [TEAMS.TEAM_NS]: 10, [TEAMS.TEAM_EW]: 9 }
        };
        
        const result = endGameModule.endGame(gameState, TEAMS.TEAM_NS, gameState.scores);
        
        assert.ok(result.matchStats, "matchStats should be initialized");
        assert.strictEqual(result.matchStats.gamesPlayed, 1);
        assert.strictEqual(result.matchStats.teamWins[TEAMS.TEAM_NS], 1);
    });
    
    it("should handle unknown winning team in matchStats update", () => {
        const gameState = {
            gameOver: false,
            messages: [],
            matchStats: {
                gamesPlayed: 0,
                teamWins: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }
            }
        };
        
        const result = endGameModule.endGame(gameState, "UNKNOWN_TEAM", {});
        
        // Should log warning
        const warningCall = mockLogger.mock.calls.find(c => c.arguments[1].includes("unknown team"));
        assert.ok(warningCall, "Should log warning for unknown winning team");
        
        // Should increment gamesPlayed but not teamWins
        assert.strictEqual(result.matchStats.gamesPlayed, 1);
        assert.strictEqual(result.matchStats.teamWins[TEAMS.TEAM_NS], 0);
    });

    it("should handle missing makerTeam in handleEndOfHand", () => {
        const gameState = {
            scores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
            tricks: [],
            makerTeam: null,
            messages: []
        };
        
        const result = endGameModule.handleEndOfHand(gameState);
        
        const errorCall = mockLogger.mock.calls.find(c => c.arguments[1].includes("Invalid or missing makerTeam"));
        assert.ok(errorCall, "Should log error for missing makerTeam");
    });

    it("should log warning when no team scores (unknown maker euchred)", () => {
        const gameState = {
            scores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
            tricks: [], // No tricks, so maker (UNKNOWN) gets 0 tricks -> Euchred
            makerTeam: "UNKNOWN_TEAM",
            messages: []
        };
        
        endGameModule.handleEndOfHand(gameState);
        
        const warningCall = mockLogger.mock.calls.find(c => c.arguments[1].includes("No team scored points this hand"));
        assert.ok(warningCall, "Should log warning when no team scores");
    });
  });

  describe("getOpponentTeam", () => {
    it("should return null and log for unknown team", () => {
      const result = endGameModule.getOpponentTeam("INVALID_TEAM");
      assert.strictEqual(result, null);
      
      const warningCall = mockLogger.mock.calls.find(c => c.arguments[1].includes("Unknown team provided"));
      assert.ok(warningCall, "Should log warning for unknown team");
    });
  });
});
