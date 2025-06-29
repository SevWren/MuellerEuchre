// filepath: test/utils/historyUtils.unit.test.js

import { expect } from "chai";
import esmock from "esmock";
import sinon from "sinon";

describe("historyUtils", () => {
  let createHistoryEntry;
  let mockLogger;

  before(async () => {
    // Mock the logger dependency
    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    createHistoryEntry = await esmock("../../src/utils/historyUtils.js", {
      "../../src/utils/logger.js": {
        logger: mockLogger,
        log: mockLogger.info,
        setDebugLevel: sinon.stub(),
      },
    });
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockLogger.info.resetHistory();
    mockLogger.warn.resetHistory();
    mockLogger.error.resetHistory();
  });

  describe("createHistoryEntry(actionType, detailsObject)", () => {
    it("should create a history entry with valid actionType and details", () => {
      const actionType = "PLAY_CARD";
      const details = {
        playerRole: "North",
        card: { id: "AH", rank: "Ace", suit: "Hearts" },
      };
      const entry = createHistoryEntry(actionType, details);

      expect(entry).to.have.keys("timestamp", "action", "details");
      expect(entry.timestamp).to.be.a("string"); // ISO date string
      expect(entry.action).to.equal(actionType);
      expect(entry.details).to.deep.equal({
        playerRole: "North",
        cardId: "AH",
      }); // card object should be replaced by cardId
      expect(mockLogger.warn.notCalled).to.be.true;
    });

    it("should include cardId in details if card object is present", () => {
      const actionType = "PLAY_CARD";
      const details = {
        playerRole: "South",
        card: { id: "TS", rank: "Ten", suit: "Spades" },
      };
      const entry = createHistoryEntry(actionType, details);

      expect(entry.details).to.have.property("cardId", "TS");
      expect(entry.details).to.not.have.property("card");
      expect(mockLogger.warn.notCalled).to.be.true;
    });

    it("should handle detailsObject being null", () => {
      const actionType = "SOME_ACTION";
      const entry = createHistoryEntry(actionType, null);

      expect(entry).to.have.keys("timestamp", "action", "details");
      expect(entry.action).to.equal(actionType);
      expect(entry.details).to.deep.equal({ originalDetails: null });
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Invalid detailsObject provided"
      );
    });

    it("should handle detailsObject not being an object", () => {
      const actionType = "ANOTHER_ACTION";
      const entry = createHistoryEntry(actionType, "invalid details");

      expect(entry).to.have.keys("timestamp", "action", "details");
      expect(entry.action).to.equal(actionType);
      expect(entry.details).to.deep.equal({
        originalDetails: "invalid details",
      });
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Invalid detailsObject provided"
      );
    });

    it("should handle invalid actionType (null)", () => {
      const details = { some: "detail" };
      const entry = createHistoryEntry(null, details);

      expect(entry).to.have.keys("timestamp", "action", "details");
      expect(entry.action).to.equal("UNKNOWN_ACTION");
      expect(entry.details).to.deep.equal(details);
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Invalid actionType provided"
      );
    });

    it("should handle invalid actionType (empty string)", () => {
      const details = { some: "detail" };
      const entry = createHistoryEntry("", details);

      expect(entry).to.have.keys("timestamp", "action", "details");
      expect(entry.action).to.equal("UNKNOWN_ACTION");
      expect(entry.details).to.deep.equal(details);
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Invalid actionType provided"
      );
    });

    it("should handle malformed card object in details (missing id)", () => {
      const actionType = "PLAY_CARD";
      const details = {
        playerRole: "East",
        card: { rank: "King", suit: "Clubs" },
      };
      const entry = createHistoryEntry(actionType, details);

      expect(entry.details).to.not.have.property("card");
      expect(entry.details).to.have.property("cardId", "INVALID_CARD");
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Malformed card object in details"
      );
    });

    it("should handle malformed card object in details (null)", () => {
      const actionType = "PLAY_CARD";
      const details = { playerRole: "West", card: null };
      const entry = createHistoryEntry(actionType, details);

      expect(entry.details).to.not.have.property("card");
      expect(entry.details).to.have.property("cardId", "INVALID_CARD");
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Malformed card object in details"
      );
    });

    it("should handle malformed card object in details (not an object)", () => {
      const actionType = "PLAY_CARD";
      const details = { playerRole: "West", card: "not a card" };
      const entry = createHistoryEntry(actionType, details);

      expect(entry.details).to.not.have.property("card");
      expect(entry.details).to.have.property("cardId", "INVALID_CARD");
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Malformed card object in details"
      );
    });

    it("should handle missing playerRole for PLAY_CARD action", () => {
      const actionType = "PLAY_CARD";
      const details = { card: { id: "QH", rank: "Queen", suit: "Hearts" } };
      const entry = createHistoryEntry(actionType, details);

      expect(entry.details).to.deep.equal({ cardId: "QH" });
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Missing playerRole for PLAY_CARD action"
      );
    });

    it("should handle missing cardId for PLAY_CARD action when card object is missing", () => {
      const actionType = "PLAY_CARD";
      const details = { playerRole: "North" };
      const entry = createHistoryEntry(actionType, details);

      expect(entry.details).to.deep.equal({ playerRole: "North" });
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.getCall(0).args[0]).to.include(
        "Missing cardId for PLAY_CARD action"
      );
    });

    it("should handle extra properties in details object", () => {
      const actionType = "SOME_ACTION";
      const details = { prop1: "value1", prop2: 123 };
      const entry = createHistoryEntry(actionType, details);

      expect(entry.details).to.deep.equal(details);
      expect(mockLogger.warn.notCalled).to.be.true;
    });
  });
});
