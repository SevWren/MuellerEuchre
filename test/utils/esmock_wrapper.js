// filepath: test/utils/esmockWrapper.js
import esmock from 'esmock';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sinon from 'sinon';

// --- Configuration ---
const IS_DEBUG = process.env.ESMOCK_DEBUG === 'true';
const projectRoot = path.resolve(fileURLToPath(import.meta.url), '../../../');
const jsconfigPath = path.join(projectRoot, 'jsconfig.json');

/**
 * Logs messages to the console only if ESMOCK_DEBUG is enabled.
 * @param {...any} args - The messages or objects to log.
 */
const logDebug = (...args) => {
  if (IS_DEBUG) {
    console.log('[esmockWrapper]', ...args);
  }
};

/**
 * Parses jsconfig.json to extract path aliases.
 * Caches the result to avoid repeated file reads.
 * @returns {Map<string, string>} A map of aliases to their resolved paths.
 */
const getPathAliases = (() => {
  let aliases = null;
  return () => {
    if (aliases) {
      return aliases;
    }
    aliases = new Map();
    try {
      if (fs.existsSync(jsconfigPath)) {
        // Read and parse jsconfig.json with better error handling
        const jsconfigRaw = fs.readFileSync(jsconfigPath, 'utf-8');
        
        // Remove all comments from the JSON string
        let jsonStr = jsconfigRaw;
        // Remove single-line comments (//...)
        jsonStr = jsonStr.replace(/\/\/[^\n]*\n/g, '\n');
        // Remove multi-line comments (/* ... */)
        jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
        // Remove trailing commas before closing brackets and braces
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        
        // Parse the cleaned JSON
        const jsconfig = JSON.parse(jsonStr);
        const paths = jsconfig?.compilerOptions?.paths || {};
        
        for (const [alias, pathArray] of Object.entries(paths)) {
          if (!Array.isArray(pathArray) || pathArray.length === 0) continue;
          const cleanAlias = alias.replace(/[\/*]+$/, '');
          const cleanTargetPath = pathArray[0].replace(/[\/*]+$/, '');
          if (cleanAlias && cleanTargetPath) {
            aliases.set(cleanAlias, path.join(projectRoot, cleanTargetPath));
          }
        }
      }
    } catch (error) {
      console.error('[esmockWrapper] Error parsing jsconfig.json:', error);
      console.error('Make sure jsconfig.json contains valid JSON without trailing commas in objects/arrays');
    }
    logDebug('Resolved Path Aliases:', aliases);
    return aliases;
  };
})();

/**
 * Resolves an import string using path aliases if applicable.
 * @param {string} importString - The import string from the mock object key.
 * @returns {string} The resolved path or the original string if no alias matches.
 */
const resolveAlias = (importString) => {
  const aliases = getPathAliases();
  for (const [alias, basePath] of aliases.entries()) {
    if (importString.startsWith(alias + '/')) {
      const resolvedPath = path.join(basePath, importString.substring(alias.length + 1));
      return resolvedPath.replace(/\\/g, '/');
    }
  }
  return importString;
};

/**
 * A robust, cross-platform wrapper for esmock that simplifies mocking of ES modules.
 * It supports relative paths, path aliases from jsconfig.json, and global mocks.
 *
 * @async
 * @param {string} testFileUrl - The URL of the test file, i.e., `import.meta.url`.
 * @param {string} modulePathRelativeToTestFile - The relative path from the test file to the module under test.
 * @param {object} [userMocks={}] - An object where keys are module import strings (or aliases) and values are the mock implementations.
 * @param {object} [globalMocks={}] - An object for mocking global variables (e.g., { Date, fetch }).
 * @returns {Promise<any>} A promise that resolves to the mocked module instance.
 * @example
 * const { handlePlayCard } = await esmockWithPaths(
 *   import.meta.url,
 *   '../../../src/game/phases/playingPhase.js',
 *   {
 *     '@/utils/logger.js': mockLogger,
 *     '../../logic/validation.js': mockValidation,
 *     'nanoid': { nanoid: () => 'mock-id' }
 *   },
 *   { Date: MockDate }
 * );
 */
export async function esmockWithPaths(
  testFileUrl,
  modulePathRelativeToTestFile,
  userMocks = {},
  globalMocks = {}
) {
  if (!testFileUrl) {
    throw new Error('[esmockWrapper] `testFileUrl` (import.meta.url) is required.');
  }
  if (!modulePathRelativeToTestFile) {
    throw new Error('[esmockWrapper] `modulePathRelativeToTestFile` is required.');
  }

  const testFileDir = path.dirname(fileURLToPath(testFileUrl));
  const absoluteModulePath = path.resolve(testFileDir, modulePathRelativeToTestFile);
  // Use forward slashes for consistent module resolution across platforms
  const moduleUrl = absoluteModulePath.replace(/\\/g, '/');
  logDebug(`Module under test resolved to URL: ${moduleUrl}`);

  const sourceModuleDir = path.dirname(absoluteModulePath);
  const resolvedMocks = {};

  for (const [importStringKey, mockValue] of Object.entries(userMocks)) {
    const aliasedPath = resolveAlias(importStringKey);
    let mockKey;
  
    if (path.isAbsolute(aliasedPath)) {
      // Convert to forward slashes for Windows compatibility
      mockKey = aliasedPath.replace(/\\/g, '/');
    } else if (aliasedPath.startsWith('./') || aliasedPath.startsWith('../')) {
      const absoluteMockPath = path.resolve(sourceModuleDir, aliasedPath);
      mockKey = absoluteMockPath.replace(/\\/g, '/');
    } else {
      // For node_modules or built-in modules
      mockKey = aliasedPath;
    }
  
    // Ensure the key is in a consistent format
    resolvedMocks[mockKey] = mockValue;
  }

  try {
    logDebug(`Loading module: ${moduleUrl}`);
    logDebug('With mocks:', Object.keys(resolvedMocks));
    return await esmock(moduleUrl, resolvedMocks, globalMocks);
  } catch (error) {
    console.error('[esmockWrapper] Error loading module:', error);
    console.error('Module URL:', moduleUrl);
    console.error('Resolved mocks:', Object.keys(resolvedMocks));
    throw error;
  }
}

/**
 * Creates a mocked module with common dependencies automatically stubbed.
 * This is a higher-level factory function to reduce boilerplate in tests.
 *
 * @async
 * @param {string} testFileUrl - The URL of the test file, i.e., `import.meta.url`.
 * @param {string} modulePathRelativeToTestFile - The relative path to the module under test.
 * @param {object} [overrideMocks={}] - Mocks to override the common defaults.
 * @returns {Promise<{module: any, mocks: object}>} An object containing the mocked module and the stubs used.
 * @example
 * // In a test file:
 * let mockedPhase, mocks;
 * beforeEach(async () => {
 *   ({ module: mockedPhase, mocks } = await createMockedModule(
 *     import.meta.url,
 *     '../../../src/game/phases/somePhase.js',
 *     {  // Only override what's necessary for the test
 *       '@/utils/players.js': { getNextPlayer: () => 'player2' }
 *     }
 *   ));
 * });
 */
export async function createMockedModule(testFileUrl, modulePathRelativeToTestFile, overrideMocks = {}) {
  const mocks = {
    logger: {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    },
    // Add other common mocks here if needed
  };

  const finalMocks = {
    '@/utils/logger.js': mocks.logger,
    ...overrideMocks,
  };

  const module = await esmockWithPaths(testFileUrl, modulePathRelativeToTestFile, finalMocks);

  return { module, mocks };
}

/**
 * Purges all modules from the esmock cache. Call this in an `afterEach` block
 * to ensure test isolation.
 */
export const purgeAllEsmock = () => {
  logDebug('Purging all modules from esmock cache.');
  // Use the correct method to clear esmock cache
  if (typeof esmock.purge === 'function') {
    esmock.purge();
  } else if (typeof esmock.clearCache === 'function') {
    esmock.clearCache();
  } else {
    console.warn('[esmockWrapper] No purge method found on esmock');
  }
};