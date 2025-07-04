// filepath: src/utils/i18n.js

import messages from "../config/locales/en.json" with { type: "json" };
import { logger } from "./logger.js"; // Assuming logger utility exists here

/**
 * Translates a given key using the loaded messages and optional replacements.
 * Handles nested keys and placeholder substitution.
 *
 * @param {string} key - The translation key (e.g., 'game.messages.playerJoined').
 * @param {object} [replacements={}] - An object containing key-value pairs for placeholder substitution.
 * @returns {string} The translated string with placeholders replaced, or the key itself if not found.
 */
export function t(key, replacements = {}) {
  if (typeof key !== "string" || key.trim() === "") {
    logger.warn(`Invalid translation key provided: ${key}`);
    return "";
  }

  const keys = key.split(".");
  let message = messages;

  for (const k of keys) {
    if (message && typeof message === "object" && message.hasOwnProperty(k)) {
      message = message[k];
    } else {
      logger.warn(`Translation key not found: ${key}`);
      return key; // Return the key if not found
    }
  }

  if (typeof message !== "string") {
    logger.warn(`Translation found for key "${key}" is not a string.`);
    return key; // Return the key if the found value is not a string
  }

  let translatedString = message;

  // Handle replacements
  if (typeof replacements === "object" && replacements !== null) {
    for (const placeholder in replacements) {
      const regex = new RegExp(`{${placeholder}}`, "g");
      translatedString = translatedString.replace(
        regex,
        replacements[placeholder],
      );
    }
  } else {
    logger.warn(
      `Invalid replacements object provided for key "${key}": ${replacements}`,
    );
    // Proceed without replacements if invalid object is provided
  }

  return translatedString;
}
