/**
 * @file test/game/phases/scoringPhase.unit.test.js
 * @module test/game/phases/scoringPhase.unit
 * @description
 *   Comprehensive unit tests for the scoring phase logic of the Euchre Multiplayer game.
 *   These tests validate all aspects of the scoring system, including standard scoring,
 *   special cases, and edge conditions.
 *
 * @test {calculateAndApplyScore} Tests for the main scoring function
 * @test {gameState} Tests for game state transitions during scoring
 * @test {scoringRules} Tests for all scoring rules and edge cases
*   - 7-23 100% Passing
 *
 * @see {@link module:src/game/phases/scoringPhase.js} The implementation under test
 * @see {@link docs/Rules of Euchre.md} Comprehensive game rules documentation
 * @see {@link docs/Scoring Rules.md} Detailed scoring rules and examples
 * @see {@link module:src/config/constants} Game constants and enums
 * @see {@link module:src/game/logic/validation-errors} Error types used in validation
 * @see {@link module:src/utils/players} Player and team utilities
 * @see {@link module:src/utils/logger} Logging utilities
 *
 * @example
 * // Run all scoring phase tests
 * node --test test/game/phases/scoringPhase.unit.test.js
 *
 * @example
 * // Run a specific test by name pattern
 * node --test --test-name-pattern="should correctly score when makers win 3 tricks" test/game/phases/scoringPhase.unit.test.js
 *
 * @example
 * // Debug a specific test
 * node --inspect-brk --test --test-name-pattern="should handle game over condition" test/game/phases/scoringPhase.unit.test.js
 */

// Node.js built-in modules
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Project modules
import {
  GAME_PHASES,
  TEAMS,
  PLAYER_ROLES,
  WINNING_SCORE,
} from "../../../src/config/constants.js";
import {
  InvalidPhaseError,
  PhaseLogicError,
} from "../../../src/game/logic/validation-errors.js";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the module under test - use pathToFileURL for Windows compatibility
const modulePath = pathToFileURL(
  join(__dirname, "../../../src/game/phases/scoringPhase.js")
);

// Module under test
let calculateAndApplyScore;

// Store the original console methods
const originalConsole = {
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  log: console.log,
};

// Mock logger that will be used in tests
const mockLogger = {
  info: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
  debug: mock.fn(),
  log: mock.fn(),
};

/**
 * Represents a standard playing card in the game.
 * @typedef {object} Card
 * @property {string} suit - The suit of the card (e.g., 'hearts', 'diamonds').
 * @property {string} value - The face value of the card (e.g., '9', 'J', 'Q', 'K', 'A').
 * @property {string} [id] - Optional unique identifier for the card.
 * @property {string} [name] - Optional human-readable name of the card.
 *
 * @example
 * const aceOfSpades = {
 *   suit: 'spades',
 *   value: 'A',
 *   id: 'AS',
 *   name: 'Ace of Spades'
 * };
 *
 * @see {@link module:src/config/constants.CARD_VALUES} for valid card values
 * @see {@link module:src/config/constants.CARD_SUITS} for valid card suits
 */

/**
 * Represents a player in the Euchre game.
 * @typedef {object} Player
 * @property {string} id - Unique identifier for the player's session or account.
 * @property {string} name - The player's display name.
 * @property {keyof typeof PLAYER_ROLES} role - The player's assigned role (e.g., 'PLAYER_SOUTH').
 * @property {keyof typeof TEAMS} teamId - The ID of the team the player belongs to (e.g., 'TEAM_NS').
 * @property {Card[]} hand - Array of card objects in the player's hand.
 * @property {boolean} isConnected - Whether the player is currently connected.
 * @property {number} [score] - The player's current score (or team's score if tracking by team).
 * @property {number} [tricksWonThisHand] - Number of tricks won by this player in the current hand.
 *
 * @example
 * const player = {
 *   id: 'player-123',
 *   name: 'Alice',
 *   role: 'PLAYER_SOUTH',
 *   teamId: 'TEAM_NS',
 *   hand: [
 *     { suit: 'hearts', value: 'A', id: 'AH' },
 *     { suit: 'spades', value: '9', id: '9S' }
 *   ],
 *   isConnected: true,
 *   score: 3,
 *   tricksWonThisHand: 2
 * };
 *
 * @see {@link module:src/config/constants.PLAYER_ROLES} for valid player roles
 * @see {@link module:src/config/constants.TEAMS} for valid team identifiers
 */

/**
 * @typedef {object} TestGameState
 * @description
 *   Simplified game state structure for scoring phase unit tests.
 *   Mirrors the structure of the actual GameState object with only the properties
 *   relevant to scoring phase testing.
 *
 * @property {string} gameId - Unique identifier for the game.
 * @property {keyof typeof GAME_PHASES} gamePhase - The current phase of the game (e.g., GAME_PHASES.GAME_PHASE_SCORING).
 * @property {keyof typeof TEAMS} makerTeam - The team that made trump (e.g., TEAMS.TEAM_NS).
 * @property {Object.<keyof typeof TEAMS, number>} tricksTaken - Number of tricks taken by each team.
 * @property {Object.<keyof typeof TEAMS, number>} teamScores - Current scores for each team.
 * @property {boolean} goingAlone - True if a player is going alone.
 * @property {keyof typeof PLAYER_ROLES} dealer - The ID of the current dealer (e.g., PLAYER_ROLES[0]).
 * @property {Object.<keyof typeof PLAYER_ROLES, Player>} players - Player data keyed by role.
 * @property {Array<string>} gameMessages - List of game messages.
 * @property {keyof typeof CARD_SUITS|null} trumpSuit - The current trump suit.
 * @property {keyof typeof PLAYER_ROLES|null} playerWhoOrderedUp - ID of player who ordered up.
 * @property {keyof typeof PLAYER_ROLES|null} playerWhoCalledTrump - ID of player who called trump.
 * @property {keyof typeof PLAYER_ROLES|null} playerGoingAlone - ID of player going alone.
 * @property {keyof typeof PLAYER_ROLES|null} partnerSittingOut - ID of partner sitting out.
 * @property {Array<object>} bids - List of bids made.
 * @property {keyof typeof PLAYER_ROLES|null} orderUpTurn - ID of player whose turn it is to order up.
 * @property {Array<Card>} kitty - Cards in the kitty.
 * @property {Card|null} turnCard - The turn-up card.
 * @property {keyof typeof CARD_SUITS|null} leadSuit - The lead suit for the current trick.
 * @property {{card: Card, playedBy: keyof typeof PLAYER_ROLES}[]} currentTrick - Cards in the current trick.
 * @property {object} settings - Game settings.
 * @property {number} settings.winningScore - The score required to win the game.
 * @property {Object.<keyof typeof TEAMS, number>} [previousTricksTaken] - (Optional) Tricks taken in the previous hand.
 * @property {keyof typeof TEAMS} [winningTeam] - (Optional) The ID of the winning team if the game is over.
 * @property {string} [message] - (Optional) A message string describing the outcome of the phase.
 *
 * @example
 * // Example of a test game state
 * const testState = {
 *   gameId: 'test-game-123',
 *   gamePhase: GAME_PHASES.GAME_PHASE_SCORING,
 *   makerTeam: TEAMS.TEAM_NS,
 *   tricksTaken: { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 },
 *   teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
 *   goingAlone: false,
 *   // ... other properties
 * };
 */

/**
 * Creates a base game state object for scoring phase unit tests.
 *
 * @function createScoringGameState
 * @description
 *   Initializes a complete game state with default values suitable for testing
 *   the scoring phase logic. The returned object includes all necessary properties
 *   with sensible defaults that can be overridden in individual tests.
 *
 * @returns {TestGameState} A new game state object with the following defaults:
 *   - `gamePhase`: `GAME_PHASES.GAME_PHASE_SCORING`
 *   - `tricksTaken`: `{ [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }`
 *   - `teamScores`: `{ [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }`
 *   - `goingAlone`: `false`
 *   - `settings.winningScore`: `WINNING_SCORE` (from constants)
 *
 * @example
 * // Basic usage
 * const gameState = createScoringGameState();
 * gameState.makerTeam = TEAMS.TEAM_NS;
 * gameState.tricksTaken = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 };
 *
 * @example
 * // Using object spread to override defaults
 * const customState = {
 *   ...createScoringGameState(),
 *   makerTeam: TEAMS.TEAM_EW,
 *   tricksTaken: { [TEAMS.TEAM_NS]: 1, [TEAMS.TEAM_EW]: 4 },
 *   goingAlone: true
 * };
 *
 * @see {@link TestGameState} for the complete structure of the returned object
 * @see {@link module:src/game/phases/scoringPhase.calculateAndApplyScore} for the main function that uses this state
 */
const createScoringGameState = () => ({
  gameId: "scoringTestGame",
  gamePhase: GAME_PHASES.GAME_PHASE_SCORING,
  makerTeam: TEAMS.TEAM_NS,
  tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  goingAlone: false,
  dealer: PLAYER_ROLES[0],
  players: {
    [PLAYER_ROLES[0]]: {
      id: PLAYER_ROLES[0],
      name: "South",
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[1]]: {
      id: PLAYER_ROLES[1],
      name: "West",
      teamId: TEAMS.TEAM_EW,
    },
    [PLAYER_ROLES[2]]: {
      id: PLAYER_ROLES[2],
      name: "North",
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[3]]: {
      id: PLAYER_ROLES[3],
      name: "East",
      teamId: TEAMS.TEAM_EW,
    },
  },
  gameMessages: [],
  trumpSuit: null,
  playerWhoOrderedUp: null,
  playerWhoCalledTrump: null,
  playerGoingAlone: null,
  partnerSittingOut: null,
  bids: [],
  orderUpTurn: null,
  kitty: [],
  turnCard: null,
  leadSuit: null,
  currentTrick: [],
  settings: { winningScore: WINNING_SCORE }, // Default winning score for tests
});

/**
 * Test suite for the scoring phase logic.
 *
 * @test {calculateAndApplyScore} Core scoring functionality
 * @test {gameState} State transitions during scoring
 * @test {scoringRules} Validation of scoring rules
 *
 * @description
 * This test suite verifies the behavior of the scoring phase in the Euchre game.
 * It covers various scenarios including:
 * - Normal scoring for makers and defenders
 * - March (all 5 tricks) scoring
 * - Euchre (defenders win) scoring
 * - Going alone bonuses
 * - Game over detection and state transitions
 * - Edge cases and error conditions
 *
 * @see {@link module:src/game/phases/scoringPhase} Implementation being tested
 * @see {@link docs/Scoring Rules.md} Detailed scoring rules
 *
 * @example
 * // Example test case structure
 * describe('ScoringPhase Logic', () => {
 *   it('should score 1 point when makers win 3-4 tricks', () => {
 *     // Test implementation
 *   });
 * });
 */

/**
 * @test {calculateAndApplyScore} Core scoring functionality
 * @test {gameState} State transitions during scoring
 * @test {scoringRules} Validation of scoring rules
 *
 * @description
 * This suite tests the core functionality of the scoring phase, including:
 * - Basic score calculation for makers and defenders
 * - Special scoring cases (marches, euchres)
 * - Going alone bonuses
 * - Game over detection and state transitions
 * - Error handling and validation
 *
 * @see {@link module:src/game/phases/scoringPhase.js} for the implementation under test
 * @see {@link TestGameState} for the test data structure
 * @see {@link createScoringGameState} for the test helper function
 * @see {@link module:src/config/constants} for game constants
 * @see {@link module:src/game/logic/validation-errors} for error types
 *
 * @example
 * // Example of a test case structure
 * it('should handle basic scoring', async () => {
 *   const gameState = createScoringGameState();
 *   gameState.makerTeam = TEAMS.TEAM_NS;
 *   gameState.tricksTaken = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 };
 *   
 *   const result = await calculateAndApplyScore(gameState);
 *   
 *   assert.strictEqual(result.teamScores[TEAMS.TEAM_NS], 1);
 *   assert.strictEqual(result.teamScores[TEAMS.TEAM_EW], 0);
 * });
 */
describe("ScoringPhase Logic", () => {
  /**
   * Setup hook that runs before each test case.
   *
   * @function
   * @async
   * @description
   * Performs the following setup steps:
   * 1. Mocks all console methods to prevent test output pollution
   * 2. Dynamically imports the module under test
   * 3. Makes the `calculateAndApplyScore` function available to tests
   *
   * @see {@link mockLogger} for the mock implementation of console methods
   */
  beforeEach(async () => {
    // Replace console methods with mocks
    console.info = mockLogger.info;
    console.warn = mockLogger.warn;
    console.error = mockLogger.error;
    console.debug = mockLogger.debug;
    console.log = mockLogger.log;

    // Import the module under test
    const module = await import(modulePath);
    calculateAndApplyScore = module.calculateAndApplyScore;
  });

  /**
   * Teardown hook that runs after each test case.
   *
   * @function
   * @description
   * Performs the following cleanup steps:
   * 1. Resets all mock function calls
   * 2. Restores the original console methods
   * 3. Cleans up any test state
   *
   * This ensures test isolation by preventing state leakage between tests.
   */
  afterEach(() => {
    // Reset all mocks
    mock.reset();

    // Restore original console methods
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    console.log = originalConsole.log;

    // Reset mock function calls
    Object.values(mockLogger).forEach((fn) => {
      if (typeof fn.mock === "object") {
        fn.mock.resetCalls();
      }
    });
  });

  /**
   * @test {calculateAndApplyScore} should validate game phase
   * @description
   *   Verifies that the function throws an `InvalidPhaseError` when called
   *   outside of the `SCORING` phase. This is a critical validation to ensure
   *   the scoring logic only runs during the appropriate game phase.
   *
   * @async
   * @function
   * @param {import('../../../src/game/phases/scoringPhase.js').GameState} gameState - The game state for the test.
   * @returns {Promise<void>}
   *
   * @example
   * // Test case example
   * const gameState = createScoringGameState();
   * gameState.gamePhase = GAME_PHASES.PLAYING; // Wrong phase
   * await assert.rejects(
   *   () => calculateAndApplyScore(gameState),
   *   {
   *     name: 'InvalidPhaseError',
   *     message: /called inappropriately during GAME_PHASE_PLAYING/i
   *   }
   * );
   *
   * @see {@link module:src/game/logic/validation-errors.InvalidPhaseError} for error details
   * @see {@link module:src/config/constants.GAME_PHASES} for valid game phases
   * @see {@link createScoringGameState} for creating test game states
   *
   * @testcaseid SCOR-001
   * @testtype unit
   * @testcategory validation
   * @testpriority high
   */
  it("should throw InvalidPhaseError if not in SCORING phase", async () => {
    const gameState = {
      ...createScoringGameState(),
      gamePhase: GAME_PHASES.PLAYING,
    };

    await assert.rejects(
      async () => calculateAndApplyScore(gameState),
      (err) => {
        assert.ok(err instanceof InvalidPhaseError);
        assert.match(
          err.message,
          /calculateAndApplyScore called inappropriately during GAME_PHASE_PLAYING/i
        );
        return true;
      }
    );
  });

  /**
   * @test {calculateAndApplyScore} should validate makerTeam
   * @description
   *   Ensures that the function throws a `PhaseLogicError` when the `makerTeam`
   *   property is not defined in the game state. This validation is crucial
   *   as scoring cannot be calculated without knowing which team made trump.
   *
   * @async
   * @function
   * @param {import('../../../src/game/phases/scoringPhase.js').GameState} gameState - The game state for the test.
   * @returns {Promise<void>}
   *
   * @example
   * // Test case example
   * const gameState = createScoringGameState();
   * gameState.makerTeam = null; // Invalid state
   * await assert.rejects(
   *   () => calculateAndApplyScore(gameState),
   *   {
   *     name: 'PhaseLogicError',
   *     message: /makerTeam is not defined/i
   *   }
   * );
   */
  it("should throw PhaseLogicError if makerTeam is not defined", async () => {
    const gameState = { ...createScoringGameState(), makerTeam: null };

    await assert.rejects(
      async () => calculateAndApplyScore(gameState),
      (err) => {
        assert.ok(err instanceof PhaseLogicError);
        assert.match(
          err.message,
          /Cannot calculate score: makerTeam is not defined/i
        );
        return true;
      }
    );
  });

  /**
   * Test scenarios for scoring phase validation.
   *
   * @type {Array<object>}
   * @property {string} name - Descriptive name of the test scenario
   * @property {Object} setup - Configuration for the test scenario
   * @property {number} setup.makerTricks - Number of tricks won by the maker team
   * @property {number} setup.defenderTricks - Number of tricks won by the defender team
   * @property {boolean} [setup.goingAlone] - Whether a player is going alone
   * @property {Object} expected - Expected results
   * @property {Object} expected.scores - Expected scores after the hand
   * @property {number} expected.scores.maker - Expected score for the maker team
   * @property {number} expected.scores.defender - Expected score for the defender team
   * @property {string} [expected.message] - Expected game message
   * @property {boolean} [expected.gameOver] - Whether the game should be over
   * @property {string} [expected.winner] - The winning team if the game is over
   *
   * @see {@link module:src/game/phases/scoringPhase} for implementation details
   * @see {@link createScoringGameState} for creating test game states
   *
   * @example
   * {
   *   name: 'makers win 3 tricks',
   *   setup: { makerTricks: 3, defenderTricks: 2 },
   *   expected: {
   *     scores: { maker: 1, defender: 0 },
   *     message: 'Makers score 1 point',
   *     gameOver: false
   *   }
   * }
   * @property {Object.<keyof typeof TEAMS, number>} tricksByTeam - Object mapping team IDs to number of tricks taken
   * @property {keyof typeof TEAMS} makerTeam - The team that made the trump
   * @property {boolean} alone - Whether the maker is going alone
   * @property {number} expectedScoreNS - Expected score for North-South team after scoring
   * @property {number} expectedScoreEW - Expected score for East-West team after scoring
   * @property {RegExp} expectedMsg - Expected message pattern in the game state after scoring
   * @property {number} [tricksNS] - Tricks taken by North/South team (alternative to tricksByTeam)
   * @property {number} [tricksEW] - Tricks taken by East/West team (alternative to tricksByTeam)
   *
   * @description
   * This array defines various test cases for the scoring phase, covering:
   * - Normal scoring (3-4 tricks)
   * - March (all 5 tricks)
   * - Euchre (defenders win)
   * - Going alone variations
   * - Different team combinations (NS vs EW as makers)
   */
  const scenarios = [
    {
      name: "Makers get 3 tricks",
      tricksByTeam: { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 },
      makerTeam: TEAMS.TEAM_NS,
      alone: false,
      expectedScoreNS: 1,
      expectedScoreEW: 0,
      expectedMsg: /Team TEAM_NS made their bid. 1 point/,
    },
    {
      name: "Makers get 4 tricks",
      tricksByTeam: { [TEAMS.TEAM_NS]: 4, [TEAMS.TEAM_EW]: 1 },
      makerTeam: TEAMS.TEAM_NS,
      alone: false,
      expectedScoreNS: 1,
      expectedScoreEW: 0,
      expectedMsg: /Team TEAM_NS made their bid. 1 point/,
    },
    {
      name: "Makers get 5 tricks (march)",
      tricksByTeam: { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 0 },
      makerTeam: TEAMS.TEAM_NS,
      alone: false,
      expectedScoreNS: 2,
      expectedScoreEW: 0,
      expectedMsg: /Team TEAM_NS achieved a march! 2 points/,
    },
    {
      name: "Makers euchred (NS maker, EW wins)",
      tricksByTeam: { [TEAMS.TEAM_NS]: 2, [TEAMS.TEAM_EW]: 3 },
      makerTeam: TEAMS.TEAM_NS,
      alone: false,
      expectedScoreNS: 0,
      expectedScoreEW: 2,
      expectedMsg: /Team TEAM_NS was euchred! Team TEAM_EW gets 2 points./,
    },
    {
      name: "Makers get 3 tricks alone",
      tricksByTeam: { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 },
      makerTeam: TEAMS.TEAM_NS,
      alone: true,
      expectedScoreNS: 1,
      expectedScoreEW: 0,
      expectedMsg: /Team TEAM_NS made their bid \(alone\). 1 point./,
    },
    {
      name: "Makers get 5 tricks alone (march)",
      tricksByTeam: { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 0 },
      makerTeam: TEAMS.TEAM_NS,
      alone: true,
      expectedScoreNS: 4,
      expectedScoreEW: 0,
      expectedMsg: /Team TEAM_NS achieved a march \(alone\)! 4 points./,
    },
    {
      name: "EW Makers get 3 tricks",
      tricksByTeam: { [TEAMS.TEAM_NS]: 2, [TEAMS.TEAM_EW]: 3 },
      makerTeam: TEAMS.TEAM_EW,
      alone: false,
      expectedScoreNS: 0,
      expectedScoreEW: 1,
      expectedMsg: /Team TEAM_EW made their bid. 1 point./,
    },
    {
      name: "EW Makers euchred (EW maker, NS wins)",
      tricksByTeam: { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 },
      makerTeam: TEAMS.TEAM_EW,
      alone: false,
      expectedScoreNS: 2,
      expectedScoreEW: 0,
      expectedMsg: /Team TEAM_EW was euchred! Team TEAM_NS gets 2 points./,
    },
  ];

  /**
   * Executes a parameterized test for each scenario in the scenarios array.
   *
   * @function
   * @param {object} scenario - The test scenario to execute
   * @param {string} scenario.name - Descriptive name of the test case
   * @param {Object.<keyof typeof TEAMS, number>} scenario.tricksByTeam - Tricks taken by each team
   * @param {keyof typeof TEAMS} scenario.makerTeam - The team that made the trump
   * @param {boolean} scenario.alone - Whether the maker is going alone
   * @param {number} scenario.expectedScoreNS - Expected NS team score
   * @param {number} scenario.expectedScoreEW - Expected EW team score
   * @param {RegExp} scenario.expectedMsg - Expected message pattern
   * @param {number} [scenario.tricksNS] - Tricks taken by North/South team (alternative to tricksByTeam)
   * @param {number} [scenario.tricksEW] - Tricks taken by East/West team (alternative to tricksByTeam)
   *
   * @description
   * This test verifies that the scoring logic correctly calculates and applies
   * scores based on the number of tricks taken by each team, with special
   * handling for marches, euchres, and going alone bonuses.
   */
  for (const scenario of scenarios) {
    it(`should correctly score when ${scenario.name}`, async () => {
      let gameState = createScoringGameState();
      // Use makerTeam consistently
      gameState.makerTeam =
        scenario.makerTeam || scenario.maker || TEAMS.TEAM_NS;

      // Handle both tricksByTeam and individual tricksNS/tricksEW formats
      if (scenario.tricksByTeam) {
        gameState.tricksTaken = { ...scenario.tricksByTeam };
      } else if (
        scenario.tricksNS !== undefined &&
        scenario.tricksEW !== undefined
      ) {
        gameState.tricksTaken = {
          [TEAMS.TEAM_NS]: scenario.tricksNS,
          [TEAMS.TEAM_EW]: scenario.tricksEW,
        };
      } else {
        throw new Error(
          "Test scenario must define either tricksByTeam or both tricksNS and tricksEW"
        );
      }

      gameState.goingAlone = !!scenario.alone;
      gameState.teamScores[TEAMS.TEAM_NS] = 0;
      gameState.teamScores[TEAMS.TEAM_EW] = 0;

      const finalState = await calculateAndApplyScore(gameState);

      // Verify scores
      assert.strictEqual(
        finalState.teamScores[TEAMS.TEAM_NS],
        scenario.expectedScoreNS
      );
      assert.strictEqual(
        finalState.teamScores[TEAMS.TEAM_EW],
        scenario.expectedScoreEW
      );

      // Verify message content
      assert.match(finalState.message, scenario.expectedMsg);
      assert.match(
        finalState.message,
        new RegExp(
          `Current scores: Team NS ${scenario.expectedScoreNS}, Team EW ${scenario.expectedScoreEW}.`
        )
      );

      // Verify tricks are reset
      assert.strictEqual(finalState.tricksTaken[TEAMS.TEAM_NS], 0);
      assert.strictEqual(finalState.tricksTaken[TEAMS.TEAM_EW], 0);

      // Verify previousTricksTaken is set correctly
      if (scenario.tricksByTeam) {
        assert.deepStrictEqual(
          finalState.previousTricksTaken,
          scenario.tricksByTeam
        );
      }

      // Check game phase transition
      const WINNING_SCORE_VALUE = WINNING_SCORE; // Use the imported constant
      if (
        scenario.expectedScoreNS < WINNING_SCORE_VALUE &&
        scenario.expectedScoreEW < WINNING_SCORE_VALUE
      ) {
        assert.strictEqual(finalState.gamePhase, GAME_PHASES.DEALING);
      }
    });
  }

  /**
   * @test {calculateAndApplyScore} should update scores and transition phase
   * @description
   *   Verifies that the function correctly updates team scores and transitions
   *   to the next game phase (DEALING) when the game is not yet over.
   *   This test ensures that the scoring logic integrates properly with the
   *   game phase management system.
   *
   * @async
   * @function
   * @param {import('../../../src/game/phases/scoringPhase.js').GameState} gameState - The game state for the test.
   * @returns {Promise<void>}
   *
   * @example
   * // Test case example
   * const gameState = createScoringGameState();
   * gameState.makerTeam = TEAMS.TEAM_NS;
   * gameState.tricksTaken = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 2 };
   * gameState.teamScores = { [TEAMS.TEAM_NS]: 8, [TEAMS.TEAM_EW]: 5 };
   *
   * const result = await calculateAndApplyScore(gameState);
   * assert.strictEqual(result.teamScores[TEAMS.TEAM_NS], 9);
   * assert.strictEqual(result.gamePhase, GAME_PHASES.DEALING);
   */
  it("should correctly update scores and transition phase via checkGameOver", async () => {
    let gameState = createScoringGameState();
    gameState.makerTeam = TEAMS.TEAM_NS;
    gameState.tricksTaken[TEAMS.TEAM_NS] = 3;
    gameState.tricksTaken[TEAMS.TEAM_EW] = 2;
    gameState.teamScores[TEAMS.TEAM_NS] = 8;
    gameState.teamScores[TEAMS.TEAM_EW] = 5;

    const finalState = await calculateAndApplyScore(gameState);

    assert.strictEqual(finalState.teamScores[TEAMS.TEAM_NS], 9);
    assert.strictEqual(finalState.teamScores[TEAMS.TEAM_EW], 5);
    assert.strictEqual(finalState.gamePhase, GAME_PHASES.DEALING);
    assert.match(finalState.message, /Team TEAM_NS made their bid. 1 point/);
    assert.match(finalState.message, /Current scores: Team NS 9, Team EW 5./);
    assert.match(finalState.message, /New dealer:/); // This message is added by checkGameOver/startNewHand
  });

  /**
   * @test {calculateAndApplyScore} should handle game over condition
   * @description
   *   Verifies that the function correctly detects when a team has reached
   *   the winning score and transitions the game to the GAME_OVER phase.
   *   This test ensures that the scoring logic properly handles the end-of-game
   *   condition and sets the appropriate game state.
   *
   * @async
   * @function
   * @param {import('../../../src/game/phases/scoringPhase.js').GameState} gameState - The game state for the test.
   * @returns {Promise<void>}
   *
   * @example
   * // Test case example
   * const gameState = createScoringGameState();
   * gameState.makerTeam = TEAMS.TEAM_NS;
   * gameState.tricksTaken = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 0 };
   * gameState.teamScores = { [TEAMS.TEAM_NS]: 9, [TEAMS.TEAM_EW]: 5 };
   * gameState.settings = { winningScore: 10 };
   *
   * const result = await calculateAndApplyScore(gameState);
   * assert.strictEqual(result.teamScores[TEAMS.TEAM_NS], 11);
   * assert.strictEqual(result.gamePhase, GAME_PHASES.GAME_OVER);
   * assert.strictEqual(result.winningTeam, TEAMS.TEAM_NS);
   */
  it("should correctly handle game over via checkGameOver", async () => {
    let gameState = createScoringGameState();
    gameState.makerTeam = TEAMS.TEAM_NS;
    gameState.tricksTaken[TEAMS.TEAM_NS] = 5;
    gameState.teamScores[TEAMS.TEAM_NS] = 9;
    gameState.teamScores[TEAMS.TEAM_EW] = 5;
    gameState.settings = { winningScore: 10 }; // Ensure winning score is set

    const finalState = await calculateAndApplyScore(gameState);

    assert.strictEqual(finalState.teamScores[TEAMS.TEAM_NS], 11);
    assert.strictEqual(finalState.teamScores[TEAMS.TEAM_EW], 5);
    assert.strictEqual(finalState.gamePhase, GAME_PHASES.GAME_OVER);
    assert.strictEqual(finalState.winningTeam, TEAMS.TEAM_NS);
    assert.match(finalState.message, /Team TEAM_NS achieved a march! 2 points/);
    assert.match(
      finalState.message,
      /Game Over! Team TEAM_NS wins with 11 points/
    );
  });
});
