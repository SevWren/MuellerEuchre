/**
 * Utilities for creating standardized error payloads.
 * @module errorUtils
 */

/**
 * Creates a standardized error payload object, often used for sending error information
 * via APIs or socket events.
 *
 * @param {string} action - The original action, event name, or operation type that caused the error
 *                          (e.g., 'GAME_EVENTS.PLAY_CARD', 'user_login').
 * @param {string} message - A user-friendly message describing the error.
 * @param {string|object|null} [details=null] - Optional. Additional details about the error.
 *                                              This could be a string with more technical info, an error code,
 *                                              or an object containing structured error data.
 * @returns {{action: string, message: string, details: (string|object|null)}} The structured error payload.
 */
export function createErrorPayload(action, message, details = null) {
  return {
    action,
    message,
    details,
  };
}
