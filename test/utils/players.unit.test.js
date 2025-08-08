/**
 * Unit tests for player utility functions in the Euchre Multiplayer game.
 * @module test/utils/players.unit.test
 * @description
 *   Comprehensive test suite for player management utilities including:
 *   - Player initialization (initializePlayers)
 *   - Team identification (getPlayerTeam)
 *   - Teammate verification (isTeammate)
 *   - Partner lookup (getPartner)
 *   - Socket-based player lookup (getPlayerBySocketId, getRoleBySocketId)
 *   - Turn progression (getNextPlayer)
 *
 * @see {@link module:src/utils/players} for the implementation being tested
 * @see {@link module:src/config/constants} for TEAMS and PLAYER_ROLES constants
 * @see {@link module:src/utils/logger} for logging utilities
 
 */
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import * as loggerModule from "../../src/utils/logger.js";
import { TEAMS, PLAYER_ROLES } from "../../src/config/constants.js";

/**
 * Module under test - will be dynamically imported after mocking the logger
 * @type {object}
 */
let playersUtils;

/**
 * Mock function for logger.warn - tracks calls for assertion verification
 * @type {import('node:test').Mock}
 */
let loggerWarnMock;

beforeEach(async () => {
  // Mock the logger's warn method before importing the module under test.
  // The 'loggerModule' object is the module's namespace.
  // The actual pino instance is exported as 'logger' (named) and 'default'.
  // We patch the method on the actual pino instance.
  loggerWarnMock = mock.method(loggerModule.logger, "warn", () => {});

  // Dynamically import the module to ensure it gets the mocked logger
  playersUtils = await import("../../src/utils/players.js");
});

afterEach(() => {
  // Restore all mocks to their original state
  mock.restoreAll();
});

describe("Player Utilities", () => {
  /**
   * Test suite for initializePlayers() function
   * @see {@link module:src/utils/players.initializePlayers}
   */
  describe("initializePlayers()", () => {
    /** @type {Object} */
    let players;

    beforeEach(() => {
      players = playersUtils.initializePlayers();
    });

    it("should initialize four players", () => {
      assert.strictEqual(Object.keys(players).length, 4);
    });

    it("should assign correct roles to players", () => {
      PLAYER_ROLES.forEach((role) => {
        assert.ok(players[role]);
        assert.strictEqual(
          players[role].name,
          role.charAt(0).toUpperCase() + role.slice(1)
        );
      });
    });

    it("should assign teamId to players correctly (TEAM_NS: south, north; TEAM_EW: west, east)", () => {
      // PLAYER_ROLES = ['PLAYER_SOUTH', 'PLAYER_WEST', 'PLAYER_NORTH', 'PLAYER_EAST']
      // South & North are TEAM_NS (index 0, 2)
      // West & East are TEAM_EW (index 1, 3)
      assert.strictEqual(
        players[PLAYER_ROLES[0]].teamId,
        TEAMS.TEAM_NS,
        `${PLAYER_ROLES[0]} should be TEAM_NS`
      ); // south
      assert.strictEqual(
        players[PLAYER_ROLES[1]].teamId,
        TEAMS.TEAM_EW,
        `${PLAYER_ROLES[1]} should be TEAM_EW`
      ); // west
      assert.strictEqual(
        players[PLAYER_ROLES[2]].teamId,
        TEAMS.TEAM_NS,
        `${PLAYER_ROLES[2]} should be TEAM_NS`
      ); // north
      assert.strictEqual(
        players[PLAYER_ROLES[3]].teamId,
        TEAMS.TEAM_EW,
        `${PLAYER_ROLES[3]} should be TEAM_EW`
      ); // east
    });

    it("should initialize player hands as empty arrays", () => {
      PLAYER_ROLES.forEach((role) => {
        assert.deepStrictEqual(players[role].hand, []);
      });
    });

    it("should initialize other player properties", () => {
      PLAYER_ROLES.forEach((role) => {
        assert.strictEqual(players[role].socketId, null);
        assert.strictEqual(players[role].score, 0); // This score might be team score, consider if it's still needed per player
        assert.strictEqual(players[role].isConnected, false);
        assert.strictEqual(players[role].tricksWonThisHand, 0);
      });
    });
  });

  /**
   * Test suite for getPlayerTeam() function
   * @see {@link module:src/utils/players.getPlayerTeam}
   */
  describe("getPlayerTeam()", () => {
    // Test data
    /** @type {import('../../src/utils/players').Player} */
    const validPlayerNS = {
      id: "p1",
      name: "Player NS",
      teamId: TEAMS.TEAM_NS,
    };

    const validPlayerEW = {
      id: "p2",
      name: "Player EW",
      teamId: TEAMS.TEAM_EW,
    };

    const playerWithoutTeamId = {
      id: "p3",
      name: "Player No Team",
    };

    describe("with valid player objects", () => {
      it("should return TEAM_NS for North/South players", () => {
        const result = playersUtils.getPlayerTeam(validPlayerNS);
        assert.strictEqual(result, TEAMS.TEAM_NS);
        assert.strictEqual(loggerWarnMock.mock.calls.length, 0);
      });

      it("should return TEAM_EW for East/West players", () => {
        const result = playersUtils.getPlayerTeam(validPlayerEW);
        assert.strictEqual(result, TEAMS.TEAM_EW);
        assert.strictEqual(loggerWarnMock.mock.calls.length, 0);
      });
    });

    describe("with invalid inputs", () => {
      it("should log warning and return undefined for null", () => {
        const result = playersUtils.getPlayerTeam(null);
        assert.strictEqual(result, undefined);
        assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
        const [context, message] = loggerWarnMock.mock.calls[0].arguments;
        assert.ok(
          message.includes("Invalid player object passed to getPlayerTeam")
        );
        assert.strictEqual(context.player, null);
      });

      it("should log warning and return undefined for undefined", () => {
        const result = playersUtils.getPlayerTeam(undefined);
        assert.strictEqual(result, undefined);
        assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
        const [context] = loggerWarnMock.mock.calls[0].arguments;
        assert.strictEqual(context.player, undefined);
      });

      it("should log warning and return undefined for non-object inputs", (t) => {
        const testCases = [
          { input: 42, description: "number" },
          { input: "string", description: "string" },
          { input: true, description: "boolean" },
          { input: 0, description: "zero" },
          { input: "", description: "empty string" },
        ];

        testCases.forEach(({ input, description }) => {
          t.diagnostic(`Testing with ${description}`);
          loggerWarnMock.mock.resetCalls(); // Reset history for this sub-test

          const result = playersUtils.getPlayerTeam(input);

          assert.strictEqual(
            result,
            undefined,
            `Expected ${description} to return undefined`
          );
          assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

          const [logObj, message] = loggerWarnMock.mock.calls[0].arguments;

          assert.strictEqual(logObj.player, input);
          assert.strictEqual(
            message,
            "Invalid player object passed to getPlayerTeam."
          );
        });
      });

      it("should handle array input by checking for teamId", () => {
        const arrayInput = [];
        const result = playersUtils.getPlayerTeam(arrayInput);

        assert.strictEqual(result, undefined);
        assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

        const [logObj, message] = loggerWarnMock.mock.calls[0].arguments;

        assert.deepStrictEqual(logObj, {
          playerId: undefined,
          playerName: undefined,
        });

        assert.strictEqual(message, "Player object does not have a teamId.");
      });
    });

    describe("with player missing teamId", () => {
      it("should log warning and return undefined", () => {
        const result = playersUtils.getPlayerTeam(playerWithoutTeamId);
        assert.strictEqual(result, undefined);
        assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
        const [context, message] = loggerWarnMock.mock.calls[0].arguments;
        assert.ok(message.includes("Player object does not have a teamId"));
        assert.deepStrictEqual(context, {
          playerId: playerWithoutTeamId.id,
          playerName: playerWithoutTeamId.name,
        });
      });

      it("should handle null/undefined id and name gracefully", () => {
        const minimalPlayer = { teamId: null };
        const result = playersUtils.getPlayerTeam(minimalPlayer);
        assert.strictEqual(result, null); // teamId is explicitly set to null
        assert.strictEqual(loggerWarnMock.mock.calls.length, 0);

        const emptyPlayer = {};
        const result2 = playersUtils.getPlayerTeam(emptyPlayer);
        assert.strictEqual(result2, undefined);
        assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
        const [context] = loggerWarnMock.mock.calls[0].arguments;
        assert.deepStrictEqual(context, {
          playerId: undefined,
          playerName: undefined,
        });
      });
    });
  });

  /**
   * Test suite for isTeammate() function
   * @see {@link module:src/utils/players.isTeammate}
   */
  describe("isTeammate()", () => {
    // PLAYER_ROLES = ['PLAYER_SOUTH', 'PLAYER_WEST', 'PLAYER_NORTH', 'PLAYER_EAST']
    it("should return true for players on the same team (South and North)", () => {
      assert.strictEqual(
        playersUtils.isTeammate(PLAYER_ROLES[0], PLAYER_ROLES[2]),
        true
      );
    });

    it("should return true for players on the same team (West and East)", () => {
      assert.strictEqual(
        playersUtils.isTeammate(PLAYER_ROLES[1], PLAYER_ROLES[3]),
        true
      );
    });

    it("should return false for players on opposite teams (South and West)", () => {
      assert.strictEqual(
        playersUtils.isTeammate(PLAYER_ROLES[0], PLAYER_ROLES[1]),
        false
      );
    });

    it("should return false for players on opposite teams (North and East)", () => {
      assert.strictEqual(
        playersUtils.isTeammate(PLAYER_ROLES[2], PLAYER_ROLES[3]),
        false
      );
    });

    it("should return false if comparing a player to themselves", () => {
      assert.strictEqual(
        playersUtils.isTeammate(PLAYER_ROLES[0], PLAYER_ROLES[0]),
        false
      );
    });

    it("should return false for invalid playerRole1 and log a warning", () => {
      assert.strictEqual(
        playersUtils.isTeammate("invalidRole1", PLAYER_ROLES[0]),
        false
      );
      assert.strictEqual(loggerWarnMock.mock.calls.length > 0, true);
    });

    it("should return false for invalid playerRole2 and log a warning", () => {
      assert.strictEqual(
        playersUtils.isTeammate(PLAYER_ROLES[0], "invalidRole2"),
        false
      );
      assert.strictEqual(loggerWarnMock.mock.calls.length > 0, true);
    });

    it("should return false for null playerRole1 and log a warning", () => {
      assert.strictEqual(playersUtils.isTeammate(null, PLAYER_ROLES[0]), false);
      assert.strictEqual(loggerWarnMock.mock.calls.length > 0, true);
    });

    it("should return false for undefined playerRole2 and log a warning", () => {
      assert.strictEqual(
        playersUtils.isTeammate(PLAYER_ROLES[0], undefined),
        false
      );
      assert.strictEqual(loggerWarnMock.mock.calls.length > 0, true);
    });
  });

  /**
   * Test suite for getPartner() function
   * @see {@link module:src/utils/players.getPartner}
   */
  describe("getPartner()", () => {
    // PLAYER_ROLES = ['PLAYER_SOUTH', 'PLAYER_WEST', 'PLAYER_NORTH', 'PLAYER_EAST']
    it("should return the correct partner for South", () => {
      assert.strictEqual(
        playersUtils.getPartner(PLAYER_ROLES[0]),
        PLAYER_ROLES[2]
      ); // North
    });

    it("should return the correct partner for West", () => {
      assert.strictEqual(
        playersUtils.getPartner(PLAYER_ROLES[1]),
        PLAYER_ROLES[3]
      ); // East
    });

    it("should return the correct partner for North", () => {
      assert.strictEqual(
        playersUtils.getPartner(PLAYER_ROLES[2]),
        PLAYER_ROLES[0]
      ); // South
    });

    it("should return the correct partner for East", () => {
      assert.strictEqual(
        playersUtils.getPartner(PLAYER_ROLES[3]),
        PLAYER_ROLES[1]
      ); // West
    });

    it("should return undefined for an invalid player role string and log a warning", () => {
      assert.strictEqual(playersUtils.getPartner("invalidRole"), undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length > 0, true);
    });

    it("should return undefined for null player role and log a warning", () => {
      assert.strictEqual(playersUtils.getPartner(null), undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length > 0, true);
    });

    it("should return undefined for undefined player role and log a warning", () => {
      assert.strictEqual(playersUtils.getPartner(undefined), undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length > 0, true);
    });
  });

  /**
   * Test suite for getPlayerBySocketId() function
   * @see {@link module:src/utils/players.getPlayerBySocketId}
   */
  describe("getPlayerBySocketId()", () => {
    /** @type {import('../../src/game/state').GameState} */
    let mockGameState;

    beforeEach(() => {
      mockGameState = {
        players: {
          [PLAYER_ROLES[0]]: { id: "p1", name: "South", socketId: "socket-s" },
          [PLAYER_ROLES[1]]: { id: "p2", name: "West", socketId: "socket-w" },
          [PLAYER_ROLES[2]]: { id: "p3", name: "North", socketId: "socket-n" },
          [PLAYER_ROLES[3]]: { id: "p4", name: "East", socketId: "socket-e" },
        },
      };
    });

    it("should return the player object for a valid socket ID", () => {
      const player = playersUtils.getPlayerBySocketId(
        mockGameState,
        "socket-w"
      );
      assert.deepStrictEqual(player, mockGameState.players[PLAYER_ROLES[1]]);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 0);
    });

    it("should return null for a socket ID that does not exist", () => {
      const player = playersUtils.getPlayerBySocketId(
        mockGameState,
        "socket-invalid"
      );
      assert.strictEqual(player, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 0);
    });

    it("should return null for null gameState and log a warning", () => {
      const result = playersUtils.getPlayerBySocketId(null, "socket-s");
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid arguments for getPlayerBySocketId"));
      assert.strictEqual(context.gameStateExists, false);
      assert.strictEqual(context.socketId, "socket-s");
    });

    it("should return null for null socketId and log a warning", () => {
      const result = playersUtils.getPlayerBySocketId(mockGameState, null);
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid arguments for getPlayerBySocketId"));
      assert.strictEqual(context.gameStateExists, true);
      assert.strictEqual(context.socketId, null);
    });

    it("should return null for empty gameState and log a warning", () => {
      const result = playersUtils.getPlayerBySocketId({}, "socket-s");
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid arguments for getPlayerBySocketId"));
      assert.strictEqual(context.gameStateExists, true);
      assert.strictEqual(context.socketId, "socket-s");
    });

    it("should return null for null players object in gameState and log a warning", () => {
      const result = playersUtils.getPlayerBySocketId(
        { players: null },
        "socket-123"
      );
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid arguments for getPlayerBySocketId"));
      assert.strictEqual(context.gameStateExists, true);
      assert.strictEqual(context.socketId, "socket-123");
    });
  });

  /**
   * Test suite for getRoleBySocketId() function
   * @see {@link module:src/utils/players.getRoleBySocketId}
   */
  describe("getRoleBySocketId()", () => {
    /** @type {import('../../src/game/state').GameState} */
    let mockGameState;

    beforeEach(() => {
      mockGameState = {
        players: {
          [PLAYER_ROLES[0]]: { id: "p1", name: "South", socketId: "socket-s" },
          [PLAYER_ROLES[1]]: { id: "p2", name: "West", socketId: "socket-w" },
          [PLAYER_ROLES[2]]: { id: "p3", name: "North", socketId: "socket-n" },
          [PLAYER_ROLES[3]]: { id: "p4", name: "East", socketId: "socket-e" },
        },
      };
    });

    it("should return the correct role for a valid socket ID", () => {
      const result = playersUtils.getRoleBySocketId(mockGameState, "socket-w");
      assert.strictEqual(result, PLAYER_ROLES[1]);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 0);
    });

    it("should return null for a non-existent socket ID", () => {
      const result = playersUtils.getRoleBySocketId(
        mockGameState,
        "nonexistent-socket"
      );
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 0);
    });

    it("should return null for null gameState and log a warning", () => {
      const result = playersUtils.getRoleBySocketId(null, "socket-s");
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid arguments for getRoleBySocketId"));
    });

    it("should return null for null socketId and log a warning", () => {
      const result = playersUtils.getRoleBySocketId(mockGameState, null);
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid arguments for getRoleBySocketId"));
    });

    it("should return null for empty players object in gameState without logging a warning", () => {
      const result = playersUtils.getRoleBySocketId(
        { players: {} },
        "socket-123"
      );
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 0);
    });

    it("should return null for null players object in gameState and log a warning", () => {
      const result = playersUtils.getRoleBySocketId(
        { players: null },
        "socket-123"
      );
      assert.strictEqual(result, null);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid arguments for getRoleBySocketId"));
    });
  });

  /**
   * Test suite for getNextPlayer() function
   * @see {@link module:src/utils/players.getNextPlayer}
   */
  describe("getNextPlayer()", () => {
    /** @type {string[]} */
    let playerSlots;

    beforeEach(() => {
      playerSlots = [...PLAYER_ROLES];
    });

    it("should return the next player in the standard order", () => {
      assert.strictEqual(
        playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots),
        PLAYER_ROLES[1]
      ); // South -> West
      assert.strictEqual(
        playersUtils.getNextPlayer(PLAYER_ROLES[1], playerSlots),
        PLAYER_ROLES[2]
      ); // West -> North
      assert.strictEqual(
        playersUtils.getNextPlayer(PLAYER_ROLES[2], playerSlots),
        PLAYER_ROLES[3]
      ); // North -> East
      assert.strictEqual(
        playersUtils.getNextPlayer(PLAYER_ROLES[3], playerSlots),
        PLAYER_ROLES[0]
      ); // East -> South (wraps around)
    });

    it("should skip the partner if going alone", () => {
      // If South (P0) is going alone, North (P2) sits out.
      // Next player after South (P0) should be West (P1).
      assert.strictEqual(
        playersUtils.getNextPlayer(
          PLAYER_ROLES[0],
          playerSlots,
          true,
          PLAYER_ROLES[2]
        ),
        PLAYER_ROLES[1]
      );

      // If West (P1) is going alone, East (P3) sits out.
      // Next player after West (P1) should be North (P2).
      assert.strictEqual(
        playersUtils.getNextPlayer(
          PLAYER_ROLES[1],
          playerSlots,
          true,
          PLAYER_ROLES[3]
        ),
        PLAYER_ROLES[2]
      );

      // If North (P2) is going alone, South (P0) sits out.
      // Next player after North (P2) should be East (P3).
      assert.strictEqual(
        playersUtils.getNextPlayer(
          PLAYER_ROLES[2],
          playerSlots,
          true,
          PLAYER_ROLES[0]
        ),
        PLAYER_ROLES[3]
      );

      // If East (P3) is going alone, West (P1) sits out.
      // Next player after East (P3) should be South (P0) (wraps around).
      assert.strictEqual(
        playersUtils.getNextPlayer(
          PLAYER_ROLES[3],
          playerSlots,
          true,
          PLAYER_ROLES[1]
        ),
        PLAYER_ROLES[0]
      );
    });

    it("should handle wrapping around when skipping the partner", () => {
      // If East (P3) is going alone, West (P1) sits out.
      // Next player after East (P3) is South (P0). South is not sitting out.
      assert.strictEqual(
        playersUtils.getNextPlayer(
          PLAYER_ROLES[3],
          playerSlots,
          true,
          PLAYER_ROLES[1]
        ),
        PLAYER_ROLES[0]
      );
    });

    it("should return undefined for invalid currentPlayerRole string and log a warning", () => {
      const result = playersUtils.getNextPlayer("invalidRole", playerSlots);
      assert.strictEqual(result, undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

      const [context, message] = loggerWarnMock.mock.calls[0].arguments;

      assert.ok(
        message.includes(
          "Current player role invalidRole not found in provided player slots"
        )
      );
      assert.strictEqual(context.currentPlayerRole, "invalidRole");
      assert.ok(context.playerSlots);
    });

    it("should return undefined for null currentPlayerRole and log a warning", () => {
      const result = playersUtils.getNextPlayer(null, playerSlots);
      assert.strictEqual(result, undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid parameters for getNextPlayer"));
      assert.strictEqual(context.currentPlayerRole, null);
      assert.ok(context.playerSlots);
    });

    it("should return undefined for undefined currentPlayerRole and log a warning", () => {
      const result = playersUtils.getNextPlayer(undefined, playerSlots);
      assert.strictEqual(result, undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid parameters for getNextPlayer"));
      assert.strictEqual(context.currentPlayerRole, undefined);
      assert.ok(context.playerSlots);
    });

    it("should return undefined if currentPlayerRole is not found in playerSlots and log a warning", () => {
      const customPlayerSlots = ["playerA", "playerB", "playerC", "playerD"];
      const currentRole = PLAYER_ROLES[0]; // This is 'PLAYER_SOUTH'

      const result = playersUtils.getNextPlayer(currentRole, customPlayerSlots);

      assert.strictEqual(result, undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      // Corrected assertion to use the actual variable value
      assert.ok(
        message.includes(
          `Current player role ${currentRole} not found in provided player slots`
        )
      );
      assert.strictEqual(context.currentPlayerRole, currentRole);
      assert.ok(context.playerSlots);
      assert.ok(Array.isArray(context.playerSlots));
    });

    it("should return undefined for null playerSlots and log a warning", () => {
      const currentRole = PLAYER_ROLES[0]; // 'PLAYER_SOUTH'

      const result = playersUtils.getNextPlayer(currentRole, null);

      assert.strictEqual(result, undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid parameters for getNextPlayer"));
      assert.strictEqual(context.currentPlayerRole, currentRole);
      assert.strictEqual(context.playerSlots, null);
    });

    it("should return undefined for empty playerSlots array and log a warning", () => {
      const currentRole = PLAYER_ROLES[0]; // 'PLAYER_SOUTH'

      const result = playersUtils.getNextPlayer(currentRole, []);

      assert.strictEqual(result, undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid parameters for getNextPlayer"));
      assert.strictEqual(context.currentPlayerRole, currentRole);
      assert.ok(Array.isArray(context.playerSlots));
      assert.strictEqual(context.playerSlots.length, 0);
    });

    it("should return undefined for playerSlots array with incorrect length and log a warning", () => {
      const currentRole = PLAYER_ROLES[0]; // 'PLAYER_SOUTH'
      const invalidPlayerSlots = ["south", "west"];

      const result = playersUtils.getNextPlayer(
        currentRole,
        invalidPlayerSlots
      );

      assert.strictEqual(result, undefined);
      assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

      const [context, message] = loggerWarnMock.mock.calls[0].arguments;
      assert.ok(message.includes("Invalid parameters for getNextPlayer"));
      assert.strictEqual(context.currentPlayerRole, currentRole);
      assert.ok(context.playerSlots);
      assert.ok(Array.isArray(context.playerSlots));
      assert.strictEqual(context.playerSlots.length, 2);
    });

    it("should not skip if not going alone, even if partnerSittingOut is provided", () => {
      // If South (P0) is NOT going alone, North (P2) should NOT be skipped.
      assert.strictEqual(
        playersUtils.getNextPlayer(
          PLAYER_ROLES[0],
          playerSlots,
          false,
          PLAYER_ROLES[2]
        ),
        PLAYER_ROLES[1]
      ); // Should still go to West
    });

    it("should not skip if going alone is true but partnerSittingOut is null/undefined", () => {
      assert.strictEqual(
        playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots, true, null),
        PLAYER_ROLES[1]
      );
      assert.strictEqual(
        playersUtils.getNextPlayer(
          PLAYER_ROLES[0],
          playerSlots,
          true,
          undefined
        ),
        PLAYER_ROLES[1]
      );
    });

    /**
     * Test cases for handling duplicate player roles in the playerSlots array
     * @see {@link module:src/utils/players.getNextPlayer}
     */
    describe("with duplicate player roles", () => {
      it("should return undefined and log a warning for duplicate roles in playerSlots", () => {
        const duplicateSlots = [...PLAYER_ROLES, PLAYER_ROLES[0]]; // Has duplicate 'PLAYER_SOUTH'
        const result = playersUtils.getNextPlayer(
          PLAYER_ROLES[0],
          duplicateSlots
        );

        assert.strictEqual(result, undefined);

        assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

        const [context, message] = loggerWarnMock.mock.calls[0].arguments;
        assert.ok(message.includes("Invalid parameters for getNextPlayer"));
        assert.strictEqual(context.currentPlayerRole, PLAYER_ROLES[0]);
        assert.ok(Array.isArray(context.playerSlots));
      });
    });

    /**
     * Test cases for handling invalid playerSlots parameter types
     * @see {@link module:src/utils/players.getNextPlayer}
     */
    describe("with non-array playerSlots", () => {
      it("should handle non-array playerSlots", () => {
        const result = playersUtils.getNextPlayer(PLAYER_ROLES[0], {});
        assert.strictEqual(result, undefined);
        assert.strictEqual(loggerWarnMock.mock.calls.length, 1);

        const [context, message] = loggerWarnMock.mock.calls[0].arguments;
        assert.ok(message.includes("Invalid parameters for getNextPlayer"));
        assert.strictEqual(context.currentPlayerRole, PLAYER_ROLES[0]);
        assert.ok(context.playerSlots);
      });
    });
  });
});
