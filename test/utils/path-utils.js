/**
 * @file Path utility functions for test files
 * @module test/utils/path-utils
 * @description Provides cross-platform path handling utilities for test files.
 * These utilities help manage file paths consistently across different operating systems
 * and provide common path resolution functionality for test files.
 * 
 * @example
 * import { toPosixPath, fromProjectRoot, PATHS } from '@test/utils/path-utils';
 * 
 * // Convert a relative path to POSIX format
 * const absPath = toPosixPath('../../src/utils');
 * 
 * // Get a path relative to project root
 * const configPath = fromProjectRoot('config/test.json');
 * 
 * // Use predefined paths
 * const testUtilsPath = PATHS.TEST_UTILS;
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Converts a relative path to an absolute path in POSIX format
 * @param {string} relativePath - Path relative to the test file
 * @returns {string} Absolute path in POSIX format
 */
export function toPosixPath(relativePath) {
  return path.resolve(relativePath).replace(/\\/g, '/');
}

/**
 * Converts a file path to a file URL, handling Windows paths correctly
 * @param {string} filePath - The file path to convert
 * @returns {string} File URL string
 */
export function toFileUrl(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (normalizedPath.startsWith('file://')) {
    return normalizedPath;
  }
  return new URL(`file://${path.resolve(filePath)}`).href;
}

/**
 * Resolves a path relative to the project root
 * @param {string} relativePath - Path relative to project root
 * @returns {string} Absolute path in POSIX format
 */
export function fromProjectRoot(relativePath) {
  return toPosixPath(path.join(PROJECT_ROOT, relativePath));
}

/**
 * Common paths used in tests
 */
export const PATHS = Object.freeze({
  // Source files
  SRC: fromProjectRoot('src'),
  GAME_LOGIC: fromProjectRoot('src/game/logic'),
  UTILS: fromProjectRoot('src/utils'),
  CONFIG: fromProjectRoot('src/config'),
  
  // Test files
  TEST: fromProjectRoot('test'),
  TEST_UTILS: fromProjectRoot('test/utils'),
  
  // Specific files
  CONSTANTS: fromProjectRoot('src/config/constants.js'),
  DECK_UTILS: fromProjectRoot('src/utils/deck.js'),
  LOGGER: fromProjectRoot('src/utils/logger.js'),
  ERRORS: fromProjectRoot('src/game/logic/errors.js'),
  VALIDATION: fromProjectRoot('src/game/logic/validation.js'),
  
  // File URLs for dynamic imports
  FILE_URLS: Object.freeze({
    CONSTANTS: toFileUrl(fromProjectRoot('src/config/constants.js')),
    ERRORS: toFileUrl(fromProjectRoot('src/game/logic/errors.js')),
  }),
});

export default {
  toPosixPath,
  toFileUrl,
  fromProjectRoot,
  PATHS,
};
