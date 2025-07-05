/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please use the following alternatives:
 * - For mocking: @/test/utils/esmock_wrapper.js
 * - For path utilities: @/test/utils/path-utils.js
 * - For test helpers: @/test/utils/test-helpers.js
 * 
 * Migration Guide:
 * 1. Replace imports from this file with the appropriate utility
 * 2. Update tests to use the new utilities
 * 3. Remove this file once all references are updated
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @deprecated Use @/test/utils/path-utils.js instead
 * Converts a relative path to an absolute path in POSIX format
 * @param {string} relativePath - Path relative to the test file
 * @returns {string} Absolute path in POSIX format
 */
export function toPosixPath(relativePath) {
  console.warn('toPosixPath is deprecated. Use @/test/utils/path-utils.js instead');
  return path.resolve(__dirname, relativePath).replace(/\\/g, '/');
}

/**
 * @deprecated Use @/test/utils/path-utils.js instead
 * Converts a file path to a file URL, handling Windows paths correctly
 * @param {string} filePath - The file path to convert
 * @returns {string} File URL string
 * @private
 */
function toFileUrl(filePath) {
  console.warn('toFileUrl is deprecated. Use @/test/utils/path-utils.js instead');
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (normalizedPath.startsWith('file://')) {
    return normalizedPath;
  }
  return new URL(`file://${path.resolve(filePath)}`).href;
}

/**
 * @deprecated Use @/test/utils/path-utils.js instead
 * Path constants for test files
 */
const PATHS = {
  // Source files (as POSIX paths for esmock)
  VALIDATION_MODULE: toPosixPath('../../../src/game/logic/validation.js'),
  CONSTANTS: toPosixPath('../../../src/config/constants.js'),
  DECK_UTILS: toPosixPath('../../../src/utils/deck.js'),
  LOGGER: toPosixPath('../../../src/utils/logger.js'),
  ERRORS: toPosixPath('../../../src/game/logic/errors.js'),
  TEST_UTILS: toPosixPath('./test-utils.js'),
  FILE_URLS: {
    CONSTANTS: toFileUrl(path.resolve(__dirname, '../../../src/config/constants.js')),
    ERRORS: toFileUrl(path.resolve(__dirname, '../../../src/game/logic/errors.js')),
  },
};

/**
 * Creates a basic game state object for testing
 * @deprecated Use @/test/utils/test-helpers.js instead
 * @returns {import('@/src/types').GameState} A game state object with default values
 */
export function createBaseGameState() {
  console.warn('createBaseGameState is deprecated. Use @/test/utils/test-helpers.js instead');
  return {
    gamePhase: 'ORDER_UP_ROUND1',
    currentPlayer: 'PLAYER_1',
    dealer: 'PLAYER_1',
    turnCard: { suit: 'SPADES', value: 'ACE' },
    trumpSuit: null,
    currentTrick: [],
    gameId: 'test-game',
    players: {
      PLAYER_1: { role: 'PLAYER_1' },
      PLAYER_2: { role: 'PLAYER_2' },
      PLAYER_3: { role: 'PLAYER_3' },
      PLAYER_4: { role: 'PLAYER_4' },
    },
  };
}

// Export PATHS with deprecation notice
const deprecatedPATHS = new Proxy(PATHS, {
  get(target, prop) {
    console.warn('PATHS constant is deprecated. Use @/test/utils/path-utils.js instead');
    return target[prop];
  },
});

export { deprecatedPATHS as PATHS };

// Export a warning when this module is imported
console.warn(
  'test-utils.js is deprecated. Please migrate to the new utilities:\n' +
  '- @/test/utils/esmock_wrapper.js for module mocking\n' +
  '- @/test/utils/path-utils.js for path utilities\n' +
  '- @/test/utils/test-helpers.js for test helpers'
);
