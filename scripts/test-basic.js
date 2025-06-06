// Test basic Node.js and Mocha functionality
console.log('=== Starting Basic Test ===');

// Test basic Node.js functionality
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());

// Test Mocha
const Mocha = require('mocha');
const path = require('path');

const mocha = new Mocha({
  timeout: 10000,
  reporter: 'spec',
  color: true,
  require: [
    '@babel/register',
    path.join(__dirname, 'test', 'setup.js')
  ]
});

// Add test file
mocha.addFile(path.join(__dirname, 'test', 'sanity.test.js'));

// Run the tests
mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
  console.log('Test run completed with', failures, 'failures');
});
