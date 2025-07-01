// filepath: .mocharc.js
'use strict';

// This configuration file tells Mocha where to find tests and how to run them.
// It's essential for VS Code's Test Explorer to discover and run your ESM tests correctly.
// We use `export default` because the project uses ES modules.
const config = {
  'allow-uncaught': false,
  'async-only': false,
  'bail': false,
  'check-leaks': false,
  'color': true,
  'delay': false,
  'diff': true,
  'exit': false, // Important for watch mode
  'extension': ['js', 'jsx'],
  'fail-zero': true,
  'forbid-only': false,
  'forbid-pending': false,
  'full-trace': true,
  'jobs': 1,
  'package': './package.json',
  'parallel': false,
  'recursive': true,
  'reporter': 'spec',
  'retries': 0,
  'slow': '75',
  'sort': false,
  'spec': ['test/**/*.unit.test.js'], // This glob pattern correctly finds all your unit tests.
  'timeout': '10000', // Reverted to 10s to match your npm script, can be lowered later.
  'ui': 'bdd',
  'watch': false,
  'watch-files': ['src/**/*.js', 'test/**/*.js'],
};

module.exports = config;