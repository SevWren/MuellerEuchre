/**
 * @file src/utils/path-resolver.js
 * @module utils/path-resolver
 * @description
 *   Provides robust path resolution utilities for the MuellerEuchre-Windsurf project,
 *   supporting ES Modules, Node.js path aliases (from `jsconfig.json`), and cross-platform
 *   compatibility (especially for Windows). This module is crucial for ensuring that
 *   imports resolve correctly across different environments and for enforcing project
 *   structure boundaries.
 *
 *   It handles absolute, relative, and aliased paths, with special considerations for
 *   the test environment and security (preventing path traversal).
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping}
 * @see {@link module:src/config/constants}
 * @see {@link module:src/utils/logger}
 * @see {@link test/utils/path-resolver.unit.test.js}
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import { promises as fsPromises } from "node:fs";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import logger from "./logger.js";

/**
 * Internal debug logger for path-resolver operations.
 * Logs messages only when `DEBUG_PATH_RESOLVER` environment variable is 'true'
 * or when `NODE_ENV` is 'test'.
 * @private
 * @type {function(...any): void}
 */
const debug = (() => {
  const isDebug =
    process.env.DEBUG_PATH_RESOLVER === "true" ||
    process.env.NODE_ENV === "test";
  return (...args) => {
    if (isDebug) {
      logger.debug({ component: "PathResolver" }, ...args);
    }
  };
})();

/**
 * The absolute path to the current file.
 * @private
 * @type {string}
 */
const __filename = fileURLToPath(import.meta.url);
/**
 * The directory name of the current file.
 * @private
 * @type {string}
 */
const __dirname = path.dirname(__filename);
/**
 * The absolute path to the project root directory.
 * Derived by going up two levels from `src/utils/path-resolver.js`.
 * @private
 * @type {string}
 */
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

/**
 * Cache for the parsed `jsconfig.json` content.
 * @private
 * @type {object | null}
 */
let jsConfigCache = null;

/**
 * Normalizes a file path to use forward slashes, making it consistent across
 * different operating systems (e.g., Windows vs. Linux).
 * @private
 * @param {string} p - The path string to normalize.
 * @returns {string} The normalized path with forward slashes.
 */
const normalizePath = (p) => {
  if (!p) return p;
  return String(p).replace(/\\/g, '/');
};

/**
 * Checks if a given file path is located within the project's root directory.
 * This is a security measure to prevent path traversal vulnerabilities.
 * @private
 * @param {string} filePath - The absolute path to check.
 * @returns {boolean} `true` if the path is within the project root, `false` otherwise.
 */
const isPathInProjectRoot = (filePath) => {
  const relative = path.relative(PROJECT_ROOT, filePath);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
};

/**
 * Cache for resolved path aliases.
 * @private
 * @type {Map<string, string> | null}
 */
let aliasCache = null;

/**
 * Determines if the current environment is a test environment.
 * Checks `NODE_ENV` or common test runner environment variables.
 * @private
 * @returns {boolean} `true` if in a test environment, `false` otherwise.
 */
function isTestEnvironment() {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.VITEST_WORKER_ID !== undefined ||
    process.env.MOCHA_WORKER !== undefined
  );
}

/**
 * Resolves a relative import path to a project-root-relative path, specifically for test mocks.
 * This function is used in test files to correctly resolve paths when mocking ES Modules.
 * @param {string} testFileUrl - The `import.meta.url` of the test file.
 * @param {string} importPath - The relative import path (e.g., `../src/module.js`).
 * @returns {string} The resolved path relative to the project root, or the original `importPath` if not in a test environment.
 */
export function getTestMockPath(testFileUrl, importPath) {
  if (!isTestEnvironment()) {
    return importPath;
  }

  const testDir = path.dirname(fileURLToPath(testFileUrl));
  const projectRoot = findProjectRoot(__dirname);

  if (importPath.startsWith(".")) {
    const resolvedPath = path.resolve(testDir, importPath);
    const relativeToRoot = path.relative(projectRoot, resolvedPath);
    debug(`Resolved test mock path: ${importPath} -> ${relativeToRoot}`);
    return relativeToRoot.replace(/\\/g, "/");
  }

  return importPath;
}

/**
 * Recursively searches for the project root directory by looking for `package.json`.
 * @private
 * @param {string} startDir - The directory to start the search from.
 * @returns {string} The absolute path to the project root, or `process.cwd()` if not found.
 */
function findProjectRoot(startDir) {
  let current = path.resolve(startDir);

  while (current !== path.dirname(current)) {
    const packagePath = path.join(current, "package.json");
    if (fs.existsSync(packagePath)) {
      return current;
    }
    current = path.dirname(current);
  }

  return process.cwd();
}

/**
 * Clears the internal alias cache, forcing `initAliasCache` to reload `jsconfig.json` on the next call.
 * This is primarily used in test environments to ensure test isolation.
 */
export function clearAliasCache() {
  aliasCache = null;
}

/**
 * Custom error class for path resolution failures.
 * @class
 * @augments {Error}
 * @property {string} name - The name of the error, always 'PathResolutionError'.
 * @property {string} specifier - The original path specifier that caused the error.
 * @property {Error | null} cause - The underlying error that caused this resolution failure.
 */
export class PathResolutionError extends Error {
  /**
   * Creates an instance of PathResolutionError.
   * @param {string} message - A human-readable error message.
   * @param {string} [specifier=''] - The path specifier that failed to resolve.
   * @param {Error | null} [cause=null] - The original error that caused this resolution failure.
   */
  constructor(message, specifier = "", cause = null) {
    super(message);
    this.name = "PathResolutionError";
    this.specifier = specifier;
    this.cause = cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PathResolutionError);
    }

    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Loads and parses the `jsconfig.json` file from the project root.
 * Caches the result for subsequent calls. In a test environment with `global.MOCK_FS`,
 * it reads from the mock file system instead of the actual file system.
 * @private
 * @returns {Promise<object>} A promise that resolves to the parsed `jsconfig.json` content.
 * @throws {PathResolutionError} If the file cannot be found, read, or is malformed.
 */
async function loadJsConfig() {
  const jsconfigPath = path.join(PROJECT_ROOT, "jsconfig.json");
  const normalizedJsconfigPath = normalizePath(jsconfigPath);

  try {
    let content;

    if (isTestEnvironment() && global.MOCK_FS) {
      content = global.MOCK_FS[normalizedJsconfigPath];
      if (content === undefined) {
        throw new Error(`File not found in mock FS: ${normalizedJsconfigPath}`);
      }
    } else {
      content = await fsPromises.readFile(jsconfigPath, "utf-8");
    }

    const config = typeof content === "string" ? JSON.parse(content) : content;
    return config;
  } catch (error) {
    logger.error(
      { err: error, path: normalizedJsconfigPath },
      `[PATH-RESOLVER] Failed to load/parse jsconfig.json`
    );
    throw new PathResolutionError(
      `Failed to load or parse jsconfig.json: ${error.message}`,
      normalizedJsconfigPath,
      error
    );
  }
}

/**
 * Validates the structure and content of the loaded `jsconfig.json` object.
 * @private
 * @param {object} config - The parsed `jsconfig.json` object.
 * @throws {PathResolutionError} If the `jsconfig.json` structure is invalid or missing required properties.
 */
function validateJsConfig(config) {
  if (!config || typeof config !== "object") {
    throw new PathResolutionError("jsconfig.json must be an object");
  }

  const { compilerOptions } = config;
  if (!compilerOptions || typeof compilerOptions !== "object") {
    throw new PathResolutionError(
      "Missing or invalid compilerOptions in jsconfig.json"
    );
  }

  const { baseUrl, paths } = compilerOptions;

  if (baseUrl && typeof baseUrl !== "string") {
    throw new PathResolutionError(
      "baseUrl in compilerOptions must be a string"
    );
  }

  if (paths && typeof paths !== "object") {
    throw new PathResolutionError("paths in compilerOptions must be an object");
  }
}

/**
 * Initializes and populates the alias cache by reading `jsconfig.json`.
 * This function is idempotent and will only load the config once unless `clearAliasCache` is called.
 * It resolves aliased paths to their absolute file system paths.
 * @private
 * @returns {Promise<Map<string, string>>} A promise that resolves to a Map of aliases to their resolved paths.
 * @throws {PathResolutionError} If `jsconfig.json` cannot be loaded, parsed, or is invalid.
 */
async function initAliasCache() {
  if (aliasCache) {
    return aliasCache;
  }

  aliasCache = new Map();

  try {
    const config = await loadJsConfig();
    validateJsConfig(config);

    const { baseUrl = ".", paths = {} } = config.compilerOptions;
    const basePath = path.resolve(PROJECT_ROOT, baseUrl);

    for (const [alias, pathArray] of Object.entries(paths)) {
      try {
        if (!Array.isArray(pathArray) || pathArray.length === 0) {
          continue;
        }

        const cleanAlias = alias.replace(/[\/*]+$/, "");
        const cleanTargetPath = pathArray[0].replace(/[\/*]+$/, "");

        if (!cleanAlias || !cleanTargetPath) {
          continue;
        }

        const resolvedPath = path.resolve(basePath, cleanTargetPath);

        try {
          if (process.env.NODE_ENV === "test" && global.MOCK_FS) {
            const normalizedPath = normalizePath(resolvedPath);
            if (!(normalizedPath in global.MOCK_FS)) {
              throw new Error(`Path not found in mock FS: ${normalizedPath}`);
            }
          } else {
            await fsPromises.access(resolvedPath, fs.constants.R_OK);
          }

          aliasCache.set(cleanAlias, resolvedPath);
        } catch (accessError) {
          logger.warn(
            { path: resolvedPath, alias: cleanAlias },
            `[path-resolver] Path does not exist`
          );
        }
      } catch (error) {
        logger.warn(
          { alias, err: error },
          `[path-resolver] Error processing alias`
        );
      }
    }

    return aliasCache;
  } catch (error) {
    aliasCache = null;
    throw new PathResolutionError(
      `Failed to initialize alias cache: ${error.message}`,
      'jsconfig.json',
      error
    );
  }
}

/**
 * Resolves a given path specifier (absolute, relative, or aliased) to its absolute file system path.
 * This is the primary public API for path resolution in the project.
 * @param {string} specifier - The path string to resolve (e.g., `'/src/file.js'`, `./relative/path`, `@/aliased/path`).
 * @param {string} [basePath=process.cwd()] - The base directory for resolving relative paths.
 * @returns {Promise<string>} A promise that resolves to the absolute, normalized file system path.
 * @throws {PathResolutionError} If the specifier is invalid, cannot be resolved, or attempts to escape the project root.
 */
export async function resolvePath(specifier, basePath = process.cwd()) {
  debug(`Resolving path: ${specifier} (base: ${basePath})`);

  if (typeof specifier !== "string" || !specifier.trim()) {
    const error = new PathResolutionError("Invalid path specifier", specifier);
    debug(`Path resolution error: ${error.message}`);
    throw error;
  }

  if (path.isAbsolute(specifier)) {
    const resolvedPath = path.resolve(specifier);
    if (!isPathInProjectRoot(resolvedPath)) {
      throw new PathResolutionError(
        `Resolved path is outside project root: ${resolvedPath}`,
        specifier
      );
    }
    return resolvedPath;
  }

  if (specifier.startsWith(".")) {
    const resolvedPath = path.resolve(basePath, specifier);
    debug(`Resolved relative path: ${specifier} -> ${resolvedPath}`);

    if (!isPathInProjectRoot(resolvedPath)) {
      const error = new PathResolutionError(
        `Resolved path is outside project root: ${resolvedPath}`,
        specifier
      );
      debug(`Security violation: ${error.message}`);
      throw error;
    }

    if (isTestEnvironment()) {
      const normalizedPath = path.normalize(resolvedPath).replace(/\\/g, "/");
      debug(`Normalized path for test environment: ${normalizedPath}`);
      return normalizedPath;
    }

    return resolvedPath;
  }

  if (!specifier.startsWith("@")) {
    debug(`Returning non-aliased specifier as-is: ${specifier}`);
    return specifier;
  }

  const aliases = await initAliasCache();

  let bestMatch = "";

  for (const [alias] of aliases) {
    const aliasPrefix = `${alias}/`;
    const isMatch = specifier.startsWith(aliasPrefix) || specifier === alias;

    if (
      (specifier.startsWith(aliasPrefix) || specifier === alias) &&
      alias.length > bestMatch.length
    ) {
      bestMatch = alias;
    }
  }

  if (!bestMatch) {
    throw new PathResolutionError(
      `No matching alias found for: ${specifier}`,
      specifier
    );
  }

  const aliasMapping = aliases.get(bestMatch);
  const aliasPrefix = `${bestMatch}/`;
  const relativePath = specifier
    .slice(aliasPrefix.length)
    .replace(/^\.?\//, "");

  const aliasBasePath = aliasMapping.replace(/\*$/, "");

  let fullPath = normalizePath(path.join(aliasBasePath, relativePath));

  if (!path.isAbsolute(fullPath)) {
    fullPath = normalizePath(path.join(PROJECT_ROOT, fullPath));
  }

  if (!fullPath.endsWith(".js")) {
    const jsPath = `${fullPath}.js`;
    if (
      isTestEnvironment() ||
      (typeof global !== "undefined" && global.MOCK_FS)
    ) {
      const mockFs = global.MOCK_FS || {};
      const normalizedJsPath = jsPath.replace(/\\/g, "/");
      if (mockFs[normalizedJsPath] !== undefined) {
        fullPath = jsPath;
      }
    } else {
      try {
        await fsPromises.access(jsPath);
        fullPath = jsPath;
      } catch (e) {}
    }
  }

  const normalizedPath = path.normalize(fullPath).replace(/\\/g, "/");

  if (!isPathInProjectRoot(normalizedPath)) {
    throw new PathResolutionError(
      `Resolved path is outside project root: ${normalizedPath}`,
      specifier
    );
  }

  return normalizedPath;
}

/**
 * The main path resolver instance, providing all public path resolution utilities.
 * @type {{
 *   resolvePath: (specifier: string, basePath?: string) => Promise<string>,
 *   getTestMockPath: (testFileUrl: string, importPath: string) => string,
 *   clearAliasCache: () => void,
 *   PathResolutionError: typeof PathResolutionError,
 *   isTestEnvironment: () => boolean
 * }}
 */
const pathResolver = {
  resolvePath,
  getTestMockPath,
  clearAliasCache,
  PathResolutionError,
  isTestEnvironment,
};

export default pathResolver;