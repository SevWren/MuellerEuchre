// filepath: src/utils/idGenerator.js

import { nanoid } from "nanoid";

/**
 * Generates a cryptographically strong, unique, URL-friendly ID.
 * The ID length is set to 10 characters for brevity and sufficient uniqueness.
 * @returns {string} A unique game ID.
 */
export const generateGameId = () => nanoid(10);
