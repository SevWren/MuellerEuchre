import { logger as defaultLogger } from "./logger.js";

function createHistoryEntryFactory({ logger }) {
  return function createHistoryEntry(actionType, detailsObject = {}) {
    const timestamp = new Date().toISOString();
    let action = actionType;
    let details = { ...detailsObject };

    if (typeof actionType !== "string" || actionType.trim() === "") {
      logger.warn(
        `Invalid actionType provided to createHistoryEntry: ${actionType}`
      );
      action = "UNKNOWN_ACTION";
    }

    if (typeof detailsObject !== "object" || detailsObject === null) {
      logger.warn(
        `Invalid detailsObject provided for actionType "${actionType}": ${detailsObject}`
      );
      details = { originalDetails: detailsObject };
    }

    if (details.hasOwnProperty("card")) {
      if (details.card && details.card.id) {
        details.cardId = details.card.id;
      } else {
        logger.warn(
          `Malformed card object in details for actionType "${actionType}": ${JSON.stringify(
            details.card
          )}`
        );
        details.cardId = "INVALID_CARD";
      }
      delete details.card;
    }

    switch (actionType) {
      case "PLAY_CARD":
        if (!details.playerRole) {
          logger.warn(
            `Missing playerRole for PLAY_CARD action: ${JSON.stringify(
              detailsObject
            )}`
          );
        }
        if (!details.cardId) {
          logger.warn(
            `Missing cardId for PLAY_CARD action: ${JSON.stringify(
              detailsObject
            )}`
          );
        }
        break;

      case "ORDER_UP":
      case "PASS":
      case "CALL_TRUMP":
        break;

      default:
        break;
    }

    return {
      timestamp,
      action,
      details,
    };
  };
}

const createHistoryEntry = createHistoryEntryFactory({ logger: defaultLogger });

export { createHistoryEntry, createHistoryEntryFactory };