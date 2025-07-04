// filepath: .mocharc.cjs
"use strict";

// This configuration file tells Mocha where to find tests and how to run them.
// It's essential for VS Code's Test Explorer to discover and run your ESM tests correctly.

// Default configuration that can be overridden by command line
const config = {
  "allow-uncaught": false,
  "async-only": false,
  bail: false,
  "check-leaks": false,
  color: true,
  delay: false,
  diff: true,
  exit: false, // Important for watch mode
  extension: ["js", "jsx"],
  "fail-zero": true,
  "forbid-only": false,
  "forbid-pending": false,
  "full-trace": true,
  jobs: 1,
  package: "./package.json",
  parallel: false,
  recursive: false, // Set to false by default for better control
  reporter: "spec",
  retries: 0,
  slow: "75",
  sort: false,
  timeout: "10000",
  ui: "bdd",
  watch: false,
  "watch-files": ["src/**/*.js", "test/**/*.js"],
};

// Only set default spec pattern if not specified in command line
if (!process.argv.some((arg) => arg.endsWith(".js") || arg.endsWith(".jsx"))) {
  config.spec = ["test/**/*.unit.test.js"];
}

module.exports = config;
