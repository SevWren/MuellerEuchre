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
  extension: ["js", "jsx"],  // Keep jobs at 1; parallel execution can be complex with ESM loaders like esmock.
  
  // Set fail-zero to true to force Mocha to exit with a non-zero status code
  // when no tests are found, which is useful for CI/CD pipelines.
  "fail-zero": false,
  // Prevents Mocha from running tests marked as "only"
  // See https://mochajs.org/#-forbid-only
  "forbid-only": false,
  "forbid-pending": false,
  // When true, Mocha will display the full stack trace for each error, rather
  // than just the message.
  "full-trace": true,
  jobs: 1,
  // Specify the path to the package.json file to help Mocha find the
  // entry point for the project. This is essential for ESM support.
  package: "./package.json",
  // When true, Mocha will use a worker pool to run tests in parallel. Do not use as it is flaky.
  parallel: false,
  recursive: false, // Set to false by default for better control
  
  // Changes the test reporter from the default "dot" to "spec" which
  // provides more detailed test results in the console.
  reporter: "spec",
  // The number of times to retry a failed test. Set to 0 by default to avoid
  // running tests multiple times when debugging.
  retries: 0,
  // Number of milliseconds to wait before considering a test slow. Tests
  // exceeding this will be highlighted in the terminal.
  slow: "100",
  // Sorts test files. When set to true, Mocha will sort all test files. When
  // set to a function, the sort-function is used to sort the tests.
  sort: false,
  // Specifies the test timeout in milliseconds. If a test takes longer than
  // this, it will be considered failed.
  timeout: "10000",
  // Changes the test interface to use BDD syntax. Possible values are:
  // - BDD: Suite, Test, Before, After, BeforeEach, AfterEach
  // - TDD: Suite, Test, Before, After, BeforeEach, AfterEach
  // - QUnit: Test, Module, Before, BeforeEach, After, AfterEach
  // - exports: exports a test object, rather than using a global.
  ui: "bdd",
  ignore: [
    "node_modules/",
    "coverage/",
    "dist/",
    "build/",
    "docs/",
    "archived_for_later_development/",
    "**/*.log",
    "**/*.txt",
    "**/*.md"
  ],
  watch: false,
  "watch-files": ["src/**/*.js", "test/**/*.js"],
  require: ["sinon-chai"],   //    'sinon-chai' enables assertions like `expect(spy).to.have.been.called`.
};

// Only set default spec pattern if not specified in command line
if (!process.argv.some((arg) => arg.endsWith(".js") || arg.endsWith(".jsx"))) {
  config.spec = ["test/**/*.unit.test.js"];
}

module.exports = config;
