// filepath: src/utils/historyUtils.js

/**
 * @file History utility functions for tracking game events and actions.
 * @module utils/historyUtils
 * @see {@link module:utils/logger} for logging functionality used by this module.
 */

import { logger } from "./logger.js";

/**
 * @typedef {Object} HistoryEntry
 * @property {string} timestamp - ISO 8601 timestamp of when the entry was created
 * @property {string} action - The type of action that occurred (e.g., 'PLAY_CARD', 'ORDER_UP')
 * @property {Object} details - Action-specific details
 * @property {string} [details.playerRole] - The role of the player who performed the action
 * @property {string} [details.cardId] - The ID of the card involved in the action
 * @property {*} [details.originalDetails] - Original details object if it couldn't be processed
 */

/**
 * @typedef {Object} CardObject
 * @property {string} id - Unique identifier for the card
 * @property {string} [rank] - The rank of the card (optional)
 * @property {string} [suit] - The suit of the card (optional)
 */

/**
 * Creates a structured, language-agnostic history event object.
 * This function's sole purpose is to create a structured data object.
 * The client is responsible for formatting human-readable messages from this data.
 *
 * @function createHistoryEntry
 * @param {string} actionType - The type of action (e.g., 'PLAY_CARD', 'ORDER_UP', 'PASS').
 * @param {Object} [detailsObject={}] - An object containing details relevant to the action.
 * @param {string} [detailsObject.playerRole] - The role of the player performing the action.
 * @param {CardObject|string} [detailsObject.card] - The card involved in the action.
 * @returns {HistoryEntry} A structured history entry with timestamp, action, and processed details.
 * 
 * @example
 * // Create a history entry for playing a card
 * const entry = createHistoryEntry('PLAY_CARD', {
 *   playerRole: 'North',
 *   card: { id: 'AH', rank: 'Ace', suit: 'Hearts' }
 * });
 * 
 * @see {@link module:utils/logger} for logging functionality used by this function.
 * @see {@link test/utils/historyUtils.unit.test.js} for usage examples and test cases.
 */
function createHistoryEntry(actionType, detailsObject = {}) {
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

  /**
   * Action-specific validation and processing.
   * Different action types may have different required fields or transformation rules.
   */
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
      // These actions currently use the generic structure
      // Add specific validation/restructuring here if needed in the future
      break;
      
    default:
      // For unknown actions, just return the generic structure
      // No special processing needed
      break;
  }

  return {
    timestamp,
    action,
    details,
  };
}

// Export all public functions
export { createHistoryEntry };
