// filepath: src/utils/historyUtils.js

import { logger } from "./logger.js"; // Assuming a logger utility exists here

/**
 * Creates a structured, language-agnostic history event object.
 * This function's sole purpose is to create a structured data object.
 * The client is responsible for formatting human-readable messages from this data.
 *
 * @param {string} actionType - The type of action (e.g., 'PLAY_CARD', 'ORDER_UP', 'PASS').
 * @param {object} detailsObject - An object containing details relevant to the action.
 * @returns {object} A structured history entry.
 */
export function createHistoryEntry(actionType, detailsObject = {}) {
  const timestamp = new Date().toISOString();
  let action = actionType;
  let details = { ...detailsObject };

  if (typeof actionType !== "string" || actionType.trim() === "") {
    logger.warn(
      `Invalid actionType provided to createHistoryEntry: ${actionType}`,
    );
    action = "UNKNOWN_ACTION";
  }

  if (typeof detailsObject !== "object" || detailsObject === null) {
    logger.warn(
      `Invalid detailsObject provided for actionType "${actionType}": ${detailsObject}`,
    );
    details = { originalDetails: detailsObject };
  }

  // Specific handling for malformed details, e.g., cardId
  if (
    details.card &&
    (typeof details.card !== "object" ||
      details.card === null ||
      !details.card.id)
  ) {
    logger.warn(
      `Malformed card object in details for actionType "${actionType}": ${JSON.stringify(details.card)}`,
    );
    details.cardId = "INVALID_CARD";
    delete details.card; // Remove the malformed card object
  } else if (details.card && details.card.id) {
    details.cardId = details.card.id;
    delete details.card;
  }

  // Example switch for different action types (can be expanded as needed)
  switch (actionType) {
    case "PLAY_CARD":
      // Ensure playerRole and cardId are present if expected for this action
      if (!details.playerRole) {
        logger.warn(
          `Missing playerRole for PLAY_CARD action: ${JSON.stringify(detailsObject)}`,
        );
      }
      if (!details.cardId) {
        logger.warn(
          `Missing cardId for PLAY_CARD action: ${JSON.stringify(detailsObject)}`,
        );
      }
      break;
    case "ORDER_UP":
    case "PASS":
    case "CALL_TRUMP":
      // Add specific validation/restructuring for these actions if needed
      break;
    default:
      // For unknown actions, just return the generic structure
      break;
  }

  return {
    timestamp,
    action,
    details,
  };
}
