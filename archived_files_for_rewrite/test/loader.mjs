/**
 * @module loader
 * @description ES Module loader hooks for Node.js, designed to enhance module interoperability,
 * particularly in test environments like Mocha. This loader provides custom resolution for
 * specific CommonJS dependencies and a custom loading mechanism for CommonJS modules,
 * attempting to convert them into a synthetic ES module format.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
// import { dirname, resolve as pathResolve } from 'path'; // Unused imports
import { builtinModules } from 'module';

/**
 * @private
 * @description Creates a CommonJS `require` function scoped to the current module's directory.
 * This is utilized internally by the `load` hook to import CommonJS modules.
 * @type {function(string): any}
 */
const require = createRequire(import.meta.url);

/**
 * Custom ES module resolver hook for Node.js.
 * This function intercepts module resolution requests. It provides special handling
 * for built-in Node.js modules and for specific CommonJS modules like 'proxyquire',
 * 'sinon', and 'chai', ensuring they are resolved with the 'commonjs' format.
 * For all other specifiers, it delegates resolution to the next resolver in the chain.
 *
 * @async
 * @function resolve
 * @param {string} specifier - The module specifier to resolve (e.g., 'lodash', './myModule.js', 'fs').
 * @param {object} context - The context object provided by the Node.js module loader.
 * @param {string[]} context.conditions - An array of import conditions, e.g. `['node', 'import']`.
 * @param {string} [context.parentURL] - The URL of the module that imported the current module, or undefined for the main entry point.
 * @param {object} [context.importAssertions] - The import assertions associated with the import statement.
 * @param {(specifier: string, context?: object) => Promise<{url: string, format?: (string | null), shortCircuit?: boolean}>} nextResolve - The next resolver function in the Node.js loader chain.
 * @returns {Promise<{url: string, shortCircuit?: boolean, format?: string}>}
 * A promise that resolves to an object defining how the module should be loaded.
 * - `url` (string): The resolved URL of the module.
 * - `shortCircuit` (boolean, optional): If true, signals that this loader has definitively handled the resolution and no further `resolve` hooks should run.
 * - `format` (string, optional): A hint to the `load` hook about the module's format (e.g., 'commonjs', 'module').
 */
export async function resolve(specifier, context, nextResolve) {
  const { parentURL = null } = context;

  // Handle built-in modules
  if (builtinModules.includes(specifier)) {
    return nextResolve(specifier, context);
  }

  // Handle CommonJS modules that need special treatment
  if (specifier === 'proxyquire' || specifier === 'sinon' || specifier === 'chai') {
    return {
      // Resolve path using the custom require, then convert to file URL
      url: new URL(`file://${require.resolve(specifier)}`, parentURL || import.meta.url).href,
      shortCircuit: true,
      format: 'commonjs'
    };
  }

  // Default resolution
  return nextResolve(specifier, context);
}

/**
 * Custom ES module loader hook for Node.js.
 * This function handles the loading of modules based on their resolved URL and format.
 * If the `context.format` is 'commonjs' (typically set by the `resolve` hook for specific
 * dependencies), this function attempts to load the CommonJS module and convert its
 * exports into a synthetic ES module.
 *
 * @warning The CommonJS to ES module conversion has significant limitations:
 * It uses `JSON.stringify` on the `module.exports` of the CJS module. This means:
 * 1. Only JSON-serializable data (strings, numbers, booleans, plain objects, arrays)
 *    will be part of the default export and available for named exports.
 * 2. Functions, Classes, Symbols, `undefined` properties, or complex objects with methods
 *    will likely be lost or incorrectly represented in the synthetic module.
 * 3. If `module.exports` itself is a function or class, the default export will be `undefined`,
 *    and attempting to access named exports (if any were on the function/class object)
 *    could lead to runtime errors.
 * This CJS loading mechanism is therefore only suitable for CJS modules that export
 * simple, JSON-compatible data.
 *
 * For other module formats, or if `context.format` is not 'commonjs', it delegates
 * to the next loader in the chain.
 *
 * @async
 * @function load
 * @param {string} url - The URL of the module to load, as determined by a `resolve` hook.
 * @param {object} context - The context object provided by the Node.js module loader.
 * @param {string} [context.format] - The format hint for the module (e.g., 'commonjs', 'module'), possibly provided by a `resolve` hook.
 * @param {object} [context.importAssertions] - The import assertions associated with the import statement.
 * @param {(url: string, context?: object) => Promise<{format: string, source: (string | ArrayBuffer | Uint8Array), shortCircuit?: boolean}>} nextLoad - The next loader function in the Node.js loader chain.
 * @returns {Promise<{format: string, shortCircuit?: boolean, source: string | ArrayBuffer | Uint8Array}>}
 * A promise that resolves to an object defining the loaded module.
 * - `format` (string): The final determined format of the module (e.g., 'module').
 * - `shortCircuit` (boolean, optional): If true, signals that this loader has definitively handled loading and no further `load` hooks should run.
 * - `source` (string | ArrayBuffer | Uint8Array): The source code or content of the module.
 */
export async function load(url, context, nextLoad) {
  // Handle CommonJS modules identified by the resolve hook
  if (context.format === 'commonjs') {
    const filePath = fileURLToPath(url);
    let exportsValue;

    try {
      exportsValue = require(filePath);
    } catch (e) {
      // Fallback: If direct require fails (e.g. path is deep within node_modules),
      // try to require by what might be the module name. This is a naive fallback.
      const moduleName = url.substring(url.lastIndexOf('node_modules/') + 'node_modules/'.length).split('/')[0];
      try {
        exportsValue = require(moduleName);
      } catch (fallbackError) {
        console.error(`Failed to load CommonJS module ${filePath} (and fallback ${moduleName})`, e, fallbackError);
        throw fallbackError; // Re-throw error if both attempts fail
      }
    }

    // Dynamically generate named exports for all enumerable properties that are valid identifiers
    const namedExports = Object.keys(exportsValue || {})
      .filter(key => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key))
      .map(key => `export const ${key} = __cjsExports['${key}'];`)
      .join('\n');

    return {
      format: 'module',
      shortCircuit: true,
      source: `
        import { createRequire as __createRequire } from 'module';
        const __require = __createRequire(import.meta.url);
        const __cjsExports = __require(${JSON.stringify(filePath)});
        export default __cjsExports;
        ${namedExports}
      `
    };
  }

  // Default loading for ES modules or other formats
  return nextLoad(url, context);
}
