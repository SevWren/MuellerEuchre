// Simple Mocha test runner
console.log('Starting Mocha test runner...');

const Mocha = require('mocha');
const path = require('path');

// Create a new Mocha instance
const mocha = new Mocha({
  timeout: 10000,      // 10 second timeout
  reporter: 'spec',   // Use spec reporter
  color: true,        // Enable colors
  fullTrace: true     // Show full stack traces
});

// Add test file
const testFile = path.join(__dirname, 'test', 'sanity.test.js');
console.log(`Adding test file: ${testFile}`);

if (require('fs').existsSync(testFile)) {
  mocha.addFile(testFile);
  
  // Run the tests
  console.log('Running tests...');
  mocha.run(failures => {
    console.log(`Tests completed with ${failures} failures`);
    process.exitCode = failures ? 1 : 0;
  });
} else {
  console.error(`Test file not found: ${testFile}`);
  process.exit(1);
}
