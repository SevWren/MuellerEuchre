// filepath: src/utils/settingsUtils.js
import { ValidationError } from "../game/logic/errors.js";

// Schema definition for settings validation
const SETTINGS_SCHEMA = {
  winningScore: {
    type: "number",
    integer: true,
    min: 5,
    max: 21,
    required: false,
  },
};

/**
 * Returns the default game settings.
 * @returns {object} The default settings object.
 */
export function getDefaultSettings() {
  return { winningScore: 10 };
}

/**
 * Validates custom game settings against the schema.
 * @param {object} customSettings - The custom settings object to validate.
 * @returns {{isValid: boolean, errors: string[]}} Validation result object.
 */
export function validateSettings(customSettings) {
  const result = {
    isValid: true,
    errors: []
  };

  if (typeof customSettings !== "object" || customSettings === null) {
    result.isValid = false;
    result.errors.push("Custom settings must be an object.");
    return result;
  }

  for (const [key, rule] of Object.entries(SETTINGS_SCHEMA)) {
    // Skip validation if the setting is not provided and not required
    if (customSettings[key] === undefined) {
      continue;
    }

    // Type validation
    if (rule.type && typeof customSettings[key] !== rule.type) {
      result.isValid = false;
      if (key === 'winningScore') {
        result.errors.push("Winning score must be an integer.");
      } else {
        result.errors.push(`Setting '${key}' must be of type ${rule.type}`);
      }
      continue;
    }

    // Integer validation
    if (rule.integer && !Number.isInteger(customSettings[key])) {
      result.isValid = false;
      if (key === 'winningScore') {
        result.errors.push("Winning score must be an integer.");
      } else {
        result.errors.push(`Setting '${key}' must be an integer`);
      }
      continue;
    }

    // Min value validation
    if (rule.min !== undefined && customSettings[key] < rule.min) {
      result.isValid = false;
      if (key === 'winningScore') {
        result.errors.push("Winning score must be between 5 and 21.");
      } else {
        result.errors.push(`Setting '${key}' must be at least ${rule.min}`);
      }
      continue;
    }

    // Max value validation
    if (rule.max !== undefined && customSettings[key] > rule.max) {
      result.isValid = false;
      if (key === 'winningScore') {
        result.errors.push("Winning score must be between 5 and 21.");
      } else {
        result.errors.push(`Setting '${key}' must be at most ${rule.max}`);
      }
      continue;
    }
  }

  return result;
}

/**
 * Merges custom settings with default settings, filtering out undefined values from custom settings.
 * @param {object} customSettings - The custom settings to merge.
 * @returns {object} A new object containing the merged settings.
 */
export function mergeSettings(customSettings = {}) {
  const defaults = getDefaultSettings();
  const filteredCustomSettings = {};

  if (typeof customSettings === "object" && customSettings !== null) {
    for (const key in customSettings) {
      if (customSettings[key] !== undefined) {
        filteredCustomSettings[key] = customSettings[key];
      }
    }
  }

  return { ...defaults, ...filteredCustomSettings };
}
