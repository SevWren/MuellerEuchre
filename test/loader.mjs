/**
 * This file is an ES Module loader for Mocha. It is used to load the
 * 'proxyquire' and 'sinon' modules, which are used by some tests, but are
 * not compatible with ES Modules. The loader is used to load these
 * modules as CommonJS modules, which can then be imported into the
 * tests.
 *
 * To run this file, you need to specify the --loader flag when running
 * Mocha. For example:
 *
 * npx mocha --loader test/loader.mjs
 *
 * This flag tells Mocha to use the specified file as the loader.
 *
 * Note that this file is not needed when running the tests with the NPM
 * script, as the script is configured to use the --loader flag.
 */

// ES Module loader for Mocha
export async function resolve(specifier, context, nextResolve) {
  const { parentURL = null } = context;
  
  // Handle proxyquire and sinon
  if (specifier === 'proxyquire' || specifier === 'sinon') {
    return {
      url: new URL(`../../node_modules/${specifier}/lib/${specifier}.js`, import.meta.url).href,
      format: 'commonjs'
    };
  }
  
  // Default resolution
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  // Handle CommonJS modules
  if (context.format === 'commonjs') {
    return {
      format: 'commonjs',
      shortCircuit: true,
      source: `const m = require('${url.replace(/\\/g, '\\\\')}'); module.exports = m;`
    };
  }
  
  // Default loading
  return nextLoad(url, context);
}
