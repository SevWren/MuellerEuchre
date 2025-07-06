// test/aliasResolver.js
import { resolve as resolvePath, dirname } from 'path';
import { fileURLToPath } from 'url';
import { toPosixPath } from './utils/path-utils.js';

/**
 * @file Custom ESM resolver hook for path aliases
 * @module test/aliasResolver
 * @description Handles path aliases defined in jsconfig.json for test execution.
 * Maps aliases (@/*, @test/*, @public/*, @fixtures/*, @mocks/*) to their
 * respective directories, ensuring compatibility with esmock and Mocha.
 *
 * @example
 * // Run Mocha with this resolver:
 * // mocha --loader=./test/aliasResolver.js test/config/database.unit.test.js
 *
 * @see {@link https://nodejs.org/api/esm.html#customizing-esm-specifier-resolution-algorithm Node.js ESM Resolution}
 * @see {@link module:test/utils/path-utils} Path handling utilities
 */

// Base directory for resolving relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolvePath(__dirname, '..');

/**
 * @constant {Object.<string, string>} aliasMap
 * @description Maps path aliases to their absolute paths
 * @readonly
 */
const aliasMap = Object.freeze({
  '@': resolvePath(PROJECT_ROOT, 'src'),
  '@test': resolvePath(PROJECT_ROOT, 'test'),
  '@public': resolvePath(PROJECT_ROOT, 'public'),
  '@fixtures': resolvePath(PROJECT_ROOT, 'test/__fixtures__'),
  '@mocks': resolvePath(PROJECT_ROOT, 'test/__mocks__')
});

/**
 * ESM resolve hook to map path aliases to absolute file paths.
 * @async
 * @param {string} specifier - The module specifier (e.g., '@/config/database.js')
 * @param {Object} context - Resolution context from Node.js
 * @param {Function} nextResolve - Next resolver in the chain
 * @returns {Promise<{url: string, shortCircuit?: boolean, format?: string}>}
 * @throws {Error} When resolution fails or invalid alias encountered
 * @see {@link https://nodejs.org/api/esm.html#resolvespecifier-context-defaultresolve Node.js ESM Resolve Hook}
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    // Convert specifier to POSIX format for consistent matching
    const posixSpecifier = toPosixPath(specifier);

    // Check if the specifier starts with a defined alias
    for (const [alias, basePath] of Object.entries(aliasMap)) {
      const aliasPrefix = `${alias}/`;
      if (posixSpecifier.startsWith(aliasPrefix)) {
        // Replace alias with resolved base path
        const relativePath = posixSpecifier.slice(aliasPrefix.length);
        const resolvedPath = resolvePath(basePath, relativePath);
        
        // Verify the resolved path exists
        try {
          await import('fs').then(fs => fs.promises.access(resolvedPath, fs.constants.R_OK));
        } catch (accessError) {
          console.warn(`[aliasResolver] Path does not exist: ${resolvedPath}`);
          // Continue to next alias or fall through to default resolver
          continue;
        }

        return {
          url: `file://${toPosixPath(resolvedPath)}`,
          shortCircuit: true,
          format: 'module',
        };
      }
    }

    // Fallback to Node.js's default resolver for non-aliased specifiers
    return await nextResolve(specifier);
  } catch (error) {
    // Provide detailed error information while maintaining security
    const errorMessage = error.code === 'ENOENT'
      ? `Module not found: ${specifier}`
      : `Failed to resolve "${specifier}": ${error.message}`;
      
    throw new Error(errorMessage, { cause: error });
  }
}