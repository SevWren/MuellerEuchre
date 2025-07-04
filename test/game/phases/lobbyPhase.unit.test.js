/**
 * Unit tests for the lobby phase logic of the Euchre Multiplayer game.
 * @module test/game/phases/lobbyPhase.unit
 * @description
 *   Tests validate the logic for starting a game from the lobby,
 *   including player count checks, phase validation, and concurrency handling.
 *
 *   Tests use esmock to mock state management and logger dependencies.
 *   All validation and error scenarios for starting a game are covered.
 *   The file is focused on pure logic, not on network or persistence.
 */

import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import path from "path";
import { fileURLToPath } from "url";

// =============================================
// PATH CONSTANTS (Pattern from esmock_fix_and_prevention_plan.md)
// =============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts a relative path to an absolute path with POSIX separators
 * @param {string} relativePath - Path relative to the test file
 * @returns {string} Absolute path with POSIX separators
 */
const toPosixPath = (relativePath) => {
  return path.resolve(__dirname, relativePath).replace(/\\/g, "/");
};

// Define all module paths as constants at the top of the file
const PATHS = {
  // Source files - use relative paths from the test file
  LOBBY_PHASE: toPosixPath("../../../src/game/phases/lobbyPhase.js"),
  CONSTANTS: toPosixPath("../../../src/config/constants.js"),
  ERRORS: toPosixPath("../../../src/game/logic/errors.js"),
  LOGGER: toPosixPath("../../../src/utils/logger.js"),
  PLAYERS: toPosixPath("../../../src/utils/players.js"),

  // Test utilities
  TEST_UTILS: toPosixPath("../../testUtils.js"),
};

// Import using path constants to ensure consistency
import { GAME_PHASES, PLAYER_ROLES } from "../../../src/config/constants.js";

import {
  ValidationError,
  InvalidPhaseError,
  PhaseLogicError,
} from "../../../src/game/logic/errors.js";

// Default logger mock
const defaultLoggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
  log: sinon.stub(), // Add log method to match the logger interface
};

// Helper to create a base game state for lobby phase tests
/**
 * Creates a mock lobby game state object for testing purposes.
 *
 * @param {string} [phase=GAME_PHASES.LOBBY] - The current phase of the game.
 * @param {number} [connectedPlayerCount=4] - The number of players that are marked as connected.
 * @returns {Object} The generated lobby game state, including players, phase, messages, and dealer.
 */
const createLobbyGameState = (
  phase = GAME_PHASES.LOBBY,
  connectedPlayerCount = 4,
) => {
  const gameState = {
    gameId: "lobbyTestGame",
    gamePhase: phase,
    players: {},
    gameMessages: [],
    dealer: PLAYER_ROLES[0], // Default dealer
  };

  for (let i = 0; i < PLAYER_ROLES.length; i++) {
    const role = PLAYER_ROLES[i];
    gameState.players[role] = {
      id: role,
      name: `Player ${i + 1}`,
      isConnected: i < connectedPlayerCount, // Only first 'connectedPlayerCount' are connected
      teamId: i % 2 === 0 ? "NS" : "EW", // Example team assignment
    };
  }
  return gameState;
};

describe("LobbyPhase Logic", () => {
  let attemptToStartGame;
  let sandbox;

  beforeEach(async () => {
    // Create a fresh sandbox for each test
    sandbox = sinon.createSandbox();

    // Reset the logger mocks
    Object.values(defaultLoggerMock).forEach((mock) => {
      if (typeof mock.resetHistory === "function") {
        mock.resetHistory();
      }
    });

    // Import the module with the mocked dependencies using path constants
    const lobbyPhaseModule = await esmock(
      PATHS.LOBBY_PHASE,
      {
        [PATHS.LOGGER]: defaultLoggerMock,
        // Errors are imported by the test file for assertions
      },
      {
        // Additional options for esmock if needed
      },
    );

    attemptToStartGame = lobbyPhaseModule.attemptToStartGame;
  });

  afterEach(() => {
    // Restore the sandbox after each test
    sandbox.restore();
  });

  afterEach(() => {
    sinon.restore();
  });

  // Argument Validation Tests
  it("should throw ValidationError if currentGameState is null", () => {
    expect(() => attemptToStartGame(null, PLAYER_ROLES[0])).to.throw(
      ValidationError,
      "Internal error: Missing currentGameState or requestingPlayerRole to start game.",
    );
  });

  it("should throw ValidationError if requestingPlayerRole is missing", () => {
    const gameState = createLobbyGameState();
    expect(() => attemptToStartGame(gameState, null)).to.throw(
      ValidationError,
      "Internal error: Missing currentGameState or requestingPlayerRole to start game.",
    );
  });

  // Phase and Player Count Validation
  it("should throw InvalidPhaseError if game is not in LOBBY phase", () => {
    const gameState = createLobbyGameState(GAME_PHASES.PLAYING);
    expect(() => attemptToStartGame(gameState, PLAYER_ROLES[0])).to.throw(
      InvalidPhaseError,
      `Game cannot be started from ${GAME_PHASES.PLAYING} phase. Must be in LOBBY phase.`,
    );
  });

  it("should throw PhaseLogicError if not enough players are connected", () => {
    const gameState = createLobbyGameState(GAME_PHASES.LOBBY, 3); // Only 3 players connected
    expect(() => attemptToStartGame(gameState, PLAYER_ROLES[0])).to.throw(
      PhaseLogicError,
      `Not enough players to start. Need 4, have 3.`,
    );
  });

  // Concurrency Check (phase changed before update)
  it("should throw InvalidPhaseError if game phase changes from LOBBY before calling attemptToStartGame", () => {
    const initialGameState = createLobbyGameState(GAME_PHASES.LOBBY, 4);
    // Simulate a scenario where the game phase changes *before* attemptToStartGame is called
    // This test case is now redundant as attemptToStartGame is pure and doesn't use an updater.
    // The previous test was designed for a scenario where updateGameState was called.
    // Since attemptToStartGame is pure, it only acts on the state it receives.
    // If the state passed to it is already not LOBBY, the first check handles it.
    // If the state is LOBBY, it will proceed and return a new state.
    // This specific concurrency scenario (phase changing *during* an update call)
    // is now handled at the Layer 3 (socket handler) level, where updateGameState is actually used.
    // For Layer 1, we only test the pure function's behavior based on its direct inputs.
    const changedGameState = {
      ...initialGameState,
      gamePhase: GAME_PHASES.PLAYING,
    };
    expect(() =>
      attemptToStartGame(changedGameState, PLAYER_ROLES[0]),
    ).to.throw(
      InvalidPhaseError,
      `Game cannot be started from ${GAME_PHASES.PLAYING} phase. Must be in LOBBY phase.`,
    );
  });

  // Success Path Test
  it("should return a success object with updated game state if conditions are met", () => {
    const gameState = createLobbyGameState(GAME_PHASES.LOBBY, 4);
    const requestingPlayer = PLAYER_ROLES[0];

    /**
     * The result object after attempting to start the game.
     * @type {{success: boolean, updatedGameState: GameState, message: string}}
     */
    const result = attemptToStartGame(gameState, requestingPlayer);

    // The result should indicate success
    expect(result.success).to.be.true;

    // The updated game state should be present
    expect(result.updatedGameState).to.exist;

    // The game phase should have transitioned to DEALING
    expect(result.updatedGameState.gamePhase).to.equal(GAME_PHASES.DEALING);

    // There should be exactly one new game message
    expect(result.updatedGameState.gameMessages.length).to.equal(1);

    // The game message should indicate which player started the game
    expect(result.updatedGameState.gameMessages[0].text).to.include(
      `Game started by ${gameState.players[requestingPlayer].name}`,
    );

    // The message type should be 'system'
    expect(result.updatedGameState.gameMessages[0].type).to.equal("system");

    // The result message should confirm the phase transition
    expect(result.message).to.equal(
      "Game successfully transitioned to DEALING phase.",
    );
  });
});
