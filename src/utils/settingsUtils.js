// filepath: src/utils/settingsUtils.js

/**
 * Returns the default game settings.
 * @returns {object} The default settings object.
 */
export function getDefaultSettings() {
  return { winningScore: 10 };
}

/**
 * Validates custom game settings against a defined schema.
 * @param {object} customSettings - The custom settings object to validate.
 * @returns {{isValid: boolean, errors: string[]}} An object indicating validity and a list of errors.
 */
export function validateSettings(customSettings) {
  const errors = [];

  if (typeof customSettings !== "object" || customSettings === null) {
    errors.push("Custom settings must be an object.");
    return { isValid: false, errors };
  }

  const { winningScore } = customSettings;

  if (winningScore !== undefined) {
    if (typeof winningScore !== "number" || !Number.isInteger(winningScore)) {
      errors.push("Winning score must be an integer.");
    } else if (winningScore < 5 || winningScore > 21) {
      errors.push("Winning score must be between 5 and 21.");
    }
  }

  return { isValid: errors.length === 0, errors };
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
