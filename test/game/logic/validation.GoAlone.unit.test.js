/**
 * @file Unit tests for the isValidGoAlone validation function
 * @module test/game/logic/isValidGoAlone.unit.test
 * @description Tests for validating go-alone declarations in Euchre.
 *
 * This test suite verifies the following validation logic:
 * - Valid go-alone declarations
 * - Invalid player roles
 * - Incorrect game phases
 * - Turn order enforcement
 * - Winning bidder validation
 * - Player data validation
 * - Edge cases and error conditions
 *
 * @see {@link module:src/game/logic/validation.isValidGoAlone} Implementation being tested
 * @see {@link module:src/config/constants} Game constants and enums
 * @see {@link module:src/game/logic/errors} Custom error types
 */

import { expect } from "chai";
import sinon from "sinon";
import { esmockWithPaths } from "../../utils/esmock_wrapper.js";
import { GAME_PHASES, PLAYER_ROLES } from "../../../src/config/constants.js";
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  InvalidGoAloneError
} from "../../../src/game/logic/errors.js";

describe("Validation Logic - isValidGoAlone", () => {
  let sandbox;
  let loggerMock;
  let isValidGoAlone;
  let baseGameState;
  // Constants and errors are now imported directly at the top of the file

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    loggerMock = {
      error: sandbox.stub(),
      debug: sandbox.stub(),
    };

    // Base game state for go-alone validation
    baseGameState = {
      gamePhase: GAME_PHASES.GOING_ALONE,
      currentPlayer: PLAYER_ROLES[0], // south
      winningBidder: PLAYER_ROLES[0], // south
      players: {
        [PLAYER_ROLES[0]]: { name: "Player 1" },
        [PLAYER_ROLES[1]]: { name: "Player 2" },
        [PLAYER_ROLES[2]]: { name: "Player 3" },
        [PLAYER_ROLES[3]]: { name: "Player 4" },
      },
      // Other required fields
      round: 1,
      turn: 1,
      dealer: PLAYER_ROLES[3], // west
      currentTrick: { cards: [] },
      trickHistory: [],
      scores: { team1: 0, team2: 0 },
    };

    const validationModule = await esmockWithPaths(
      import.meta.url,
      "../../../src/game/logic/validation.js",
      {
        "../../../src/utils/logger.js": loggerMock,
      },
    );

    isValidGoAlone = validationModule.isValidGoAlone;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return true for a valid go-alone declaration", () => {
    const result = isValidGoAlone(baseGameState, PLAYER_ROLES[0]);
    expect(result).to.be.true;
  });

  it("should throw ValidationError for invalid player role", () => {
    expect(() => isValidGoAlone(baseGameState, "invalid_role")).to.throw(
      ValidationError,
      "Invalid arguments for go-alone validation",
    );
  });

  it("should throw ValidationError for missing game state", () => {
    expect(() => isValidGoAlone(null, PLAYER_ROLES[0])).to.throw(
      ValidationError,
      "Invalid arguments for go-alone validation",
    );
  });

  it("should throw InvalidPhaseError when not in GO_ALONE_DECISION phase", () => {
    const invalidPhaseState = { ...baseGameState, gamePhase: GAME_PHASES.PLAYING };
    expect(() => isValidGoAlone(invalidPhaseState, PLAYER_ROLES[0])).to.throw(
      InvalidPhaseError,
      "Cannot go alone in the current phase",
    );
  });

  it("should throw NotPlayersTurnError when not the current player's turn", () => {
    const notPlayersTurnState = { ...baseGameState, currentPlayer: PLAYER_ROLES[1] };
    expect(() => isValidGoAlone(notPlayersTurnState, PLAYER_ROLES[0])).to.throw(
      NotPlayersTurnError,
      `Not ${PLAYER_ROLES[0]}'s turn. It is ${PLAYER_ROLES[1]}'s turn.`,
    );
  });

  it("should throw InvalidGoAloneError when player is not the winning bidder", () => {
    const notBidderState = { ...baseGameState, winningBidder: PLAYER_ROLES[1] };
    expect(() => isValidGoAlone(notBidderState, PLAYER_ROLES[0])).to.throw(
      InvalidGoAloneError,
      "Only the winning bidder can declare to go alone",
    );
  });

  it("should throw InvalidGoAloneError when player data is missing", () => {
    const missingPlayerState = {
      ...baseGameState,
      players: { ...baseGameState.players, [PLAYER_ROLES[0]]: undefined },
    };
    expect(() => isValidGoAlone(missingPlayerState, PLAYER_ROLES[0])).to.throw(
      InvalidGoAloneError,
      `Player ${PLAYER_ROLES[0]} not found in game state`,
    );
  });

  it("should throw InvalidGoAloneError when go-alone decision was already made", () => {
    const alreadyDecidedState = {
      ...baseGameState,
      players: {
        ...baseGameState.players,
        [PLAYER_ROLES[0]]: { ...baseGameState.players[PLAYER_ROLES[0]], isGoingAlone: true },
      },
    };
    expect(() => isValidGoAlone(alreadyDecidedState, PLAYER_ROLES[0])).to.throw(
      InvalidGoAloneError,
      `Player ${PLAYER_ROLES[0]} has already made their go-alone decision`,
    );
  });

  it("should handle edge case with minimal valid game state", () => {
    const minimalState = {
      gamePhase: GAME_PHASES.GOING_ALONE,
      currentPlayer: PLAYER_ROLES[2],
      winningBidder: PLAYER_ROLES[2],
      players: {
        [PLAYER_ROLES[2]]: { name: "Minimal Player" },
      },
    };
    const result = isValidGoAlone(minimalState, PLAYER_ROLES[2]);
    expect(result).to.be.true;
  });

  it("should log debug information for successful validation", () => {
    isValidGoAlone(baseGameState, PLAYER_ROLES[0]);
    expect(loggerMock.debug.calledOnce).to.be.true;
    expect(loggerMock.debug.firstCall.args[0]).to.equal('Go-alone validation successful');
    expect(loggerMock.debug.firstCall.args[1]).to.deep.include({
      playerRole: PLAYER_ROLES[0],
      gamePhase: GAME_PHASES.GOING_ALONE,
    });
  });

  it("should log error when validation fails", () => {
    const invalidState = { ...baseGameState, gamePhase: GAME_PHASES.PLAYING };
    
    try {
      isValidGoAlone(invalidState, PLAYER_ROLES[0]);
      expect.fail("Expected validation to throw an error");
    } catch (error) {
      // Expected error
    }
    
    expect(loggerMock.error.calledOnce).to.be.true;
    expect(loggerMock.error.firstCall.args[0]).to.equal('Invalid phase for go-alone');
    expect(loggerMock.error.firstCall.args[1]).to.deep.include({
      playerRole: PLAYER_ROLES[0],
      gamePhase: GAME_PHASES.PLAYING,
      expectedPhase: 'GO_ALONE_DECISION'  // This is the actual value from the implementation
    });
  });
});
