//THIS IS NOW DEPRECIATED
//USE test\utils\esmock_wrapper.js INSTEAD

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts a relative path to an absolute path in POSIX format
 * @param {string} relativePath - Path relative to the test file
 * @returns {string} Absolute path in POSIX format
 */
export function toPosixPath(relativePath) {
  return path.resolve(__dirname, relativePath).replace(/\\/g, "/");
}

/**
 * Converts a file path to a file URL, handling Windows paths correctly
 * @param {string} filePath - The file path to convert
 * @returns {string} File URL string
 */
function toFileUrl(filePath) {
  // Convert Windows path separators to forward slashes
  const normalizedPath = filePath.replace(/\\/g, "/");
  // If the path is already a file URL, return it as is
  if (normalizedPath.startsWith("file://")) {
    return normalizedPath;
  }
  // Convert to file URL
  return pathToFileURL(normalizedPath).href;
}

// Define paths relative to this test file
const PATHS = {
  // Source files (as POSIX paths for esmock)
  VALIDATION_MODULE: toPosixPath("../../../src/game/logic/validation.js"),
  CONSTANTS: toPosixPath("../../../src/config/constants.js"),
  DECK_UTILS: toPosixPath("../../../src/utils/deck.js"),
  LOGGER: toPosixPath("../../../src/utils/logger.js"),
  ERRORS: toPosixPath("../../../src/game/logic/errors.js"),

  // Test files
  TEST_UTILS: toPosixPath("./test-utils.js"),

  // File URLs for dynamic imports (needed on Windows)
  FILE_URLS: {
    CONSTANTS: toFileUrl(
      path.resolve(__dirname, "../../../src/config/constants.js"),
    ),
    ERRORS: toFileUrl(
      path.resolve(__dirname, "../../../src/game/logic/errors.js"),
    ),
  },
};

/**
 * Creates a basic game state object for testing
 * @returns {object} A game state object with default values
 */
export function createBaseGameState() {
  return {
    gamePhase: "ORDER_UP_ROUND1",
    currentPlayer: "PLAYER_1",
    dealer: "PLAYER_1",
    turnCard: { suit: "SPADES", value: "ACE" },
    trumpSuit: null,
    currentTrick: [],
    gameId: "test-game",
    players: {
      PLAYER_1: { role: "PLAYER_1" },
      PLAYER_2: { role: "PLAYER_2" },
      PLAYER_3: { role: "PLAYER_3" },
      PLAYER_4: { role: "PLAYER_4" },
    },
  };
}

export { PATHS };
