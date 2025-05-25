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
