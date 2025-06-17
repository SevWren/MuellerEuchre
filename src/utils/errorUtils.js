/**
 * Utilities for creating standardized error payloads.
 * @module errorUtils
 */

/**
 * Creates a standardized error payload object.
 *
 * @param {string} action - The original action or event name that caused the error.
 * @param {string} message - A user-friendly message describing the error.
 * @param {string|object|null} [details=null] - Optional additional details about the error.
 * @returns {{action: string, message: string, details: string|object|null}} The standardized error payload.
 */
export function createErrorPayload(action, message, details = null) {
  return {
    action,
    message,
    details,
  };
}
