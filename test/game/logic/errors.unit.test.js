// filepath: test/game/logic/errors.unit.test.js
import { expect } from "chai";
import {
  ValidationError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
  PhaseLogicError,
} from "../../../src/game/logic/errors.js";

describe("Error Classes", () => {
  describe("ValidationError", () => {
    it("should be an instance of Error", () => {
      const error = new ValidationError("Test message");
      expect(error).to.be.an.instanceOf(Error);
    });

    it("should have the correct name", () => {
      const error = new ValidationError("Test message");
      expect(error.name).to.equal("ValidationError");
    });

    it("should have the correct message", () => {
      const message = "This is a validation error";
      const error = new ValidationError(message);
      expect(error.message).to.equal(message);
    });
  });

  describe("NotPlayersTurnError", () => {
    it("should be an instance of ValidationError", () => {
      const error = new NotPlayersTurnError("PLAYER_1", "PLAYER_2");
      expect(error).to.be.an.instanceOf(ValidationError);
    });

    it("should have the correct name", () => {
      const error = new NotPlayersTurnError("PLAYER_1", "PLAYER_2");
      expect(error.name).to.equal("NotPlayersTurnError");
    });

    it("should have a default message including player roles", () => {
      const error = new NotPlayersTurnError("PLAYER_1", "PLAYER_2");
      expect(error.message).to.include(
        "Not PLAYER_1's turn. It is PLAYER_2's turn.",
      );
    });

    it("should store playerRole and currentPlayer properties", () => {
      const error = new NotPlayersTurnError("PLAYER_1", "PLAYER_2");
      expect(error.playerRole).to.equal("PLAYER_1");
      expect(error.currentPlayer).to.equal("PLAYER_2");
    });
  });

  describe("InvalidPhaseError", () => {
    it("should be an instance of ValidationError", () => {
      const error = new InvalidPhaseError("Invalid phase");
      expect(error).to.be.an.instanceOf(ValidationError);
    });

    it("should have the correct name", () => {
      const error = new InvalidPhaseError("Invalid phase");
      expect(error.name).to.equal("InvalidPhaseError");
    });

    it("should have the correct message", () => {
      const message = "Cannot perform action in this phase";
      const error = new InvalidPhaseError(message);
      expect(error.message).to.equal(message);
    });
  });

  describe("CardNotInHandError", () => {
    it("should be an instance of ValidationError", () => {
      const error = new CardNotInHandError("Card not found");
      expect(error).to.be.an.instanceOf(ValidationError);
    });

    it("should have the correct name", () => {
      const error = new CardNotInHandError("Card not found");
      expect(error.name).to.equal("CardNotInHandError");
    });

    it("should have the correct message", () => {
      const message = "The card is not in the hand";
      const error = new CardNotInHandError(message);
      expect(error.message).to.equal(message);
    });
  });

  describe("MustFollowSuitError", () => {
    it("should be an instance of ValidationError", () => {
      const error = new MustFollowSuitError("Must follow suit");
      expect(error).to.be.an.instanceOf(ValidationError);
    });

    it("should have the correct name", () => {
      const error = new MustFollowSuitError("Must follow suit");
      expect(error.name).to.equal("MustFollowSuitError");
    });

    it("should have the correct message", () => {
      const message = "You must play a card of the led suit";
      const error = new MustFollowSuitError(message);
      expect(error.message).to.equal(message);
    });
  });

  describe("InvalidBidError", () => {
    it("should be an instance of ValidationError", () => {
      const error = new InvalidBidError("Invalid bid");
      expect(error).to.be.an.instanceOf(ValidationError);
    });

    it("should have the correct name", () => {
      const error = new InvalidBidError("Invalid bid");
      expect(error.name).to.equal("InvalidBidError");
    });

    it("should have the correct message", () => {
      const message = "The bid is not allowed";
      const error = new InvalidBidError(message);
      expect(error.message).to.equal(message);
    });
  });

  describe("InvalidDiscardError", () => {
    it("should be an instance of ValidationError", () => {
      const error = new InvalidDiscardError("Invalid discard");
      expect(error).to.be.an.instanceOf(ValidationError);
    });

    it("should have the correct name", () => {
      const error = new InvalidDiscardError("Invalid discard");
      expect(error.name).to.equal("InvalidDiscardError");
    });

    it("should have the correct message", () => {
      const message = "The discard is not allowed";
      const error = new InvalidDiscardError(message);
      expect(error.message).to.equal(message);
    });
  });

  describe("PhaseLogicError", () => {
    it("should be an instance of ValidationError", () => {
      // Or Error, based on implementation
      const error = new PhaseLogicError("Phase logic error");
      // Check against both ValidationError and Error as per src/game/logic/errors.js line 81 comment
      expect(error).to.be.an.instanceOf(ValidationError);
      expect(error).to.be.an.instanceOf(Error);
    });

    it("should have the correct name", () => {
      const error = new PhaseLogicError("Phase logic error");
      expect(error.name).to.equal("PhaseLogicError");
    });

    it("should have the correct message", () => {
      const message = "An error occurred during phase logic execution";
      const error = new PhaseLogicError(message);
      expect(error.message).to.equal(message);
    });
  });
});
