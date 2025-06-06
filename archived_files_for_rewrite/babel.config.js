// This file is used by @babel/register for test files
// Note: Using .js extension for ESM compatibility

const isTest = process.env.NODE_ENV === 'test';

export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      // Use ES modules in test environment for better compatibility
      modules: isTest ? 'auto' : false,
      // Enable modern JavaScript features
      shippedProposals: true,
      // Use the minimal necessary transformations
      bugfixes: true
    }]
  ],
  plugins: [
    // Add any necessary Babel plugins here
    '@babel/plugin-transform-runtime',
    // Support for dynamic imports in tests
    '@babel/plugin-syntax-dynamic-import',
    // Support for class properties
    '@babel/plugin-proposal-class-properties',
    // Support for private methods
    '@babel/plugin-proposal-private-methods',
    // Support for private property in object
    '@babel/plugin-proposal-private-property-in-object'
  ],
  // Enable source maps for better test error messages
  sourceMaps: 'both',
  // Preserve comments for better debugging
  comments: true,
  // Ignore node_modules by default (except for potential ESM packages)
  ignore: [
    'node_modules',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ]
};
