const fs = require('fs');
const path = require('path');

// Output file
const outputFile = path.join(__dirname, 'test_output_direct.txt');
const outputStream = fs.createWriteStream(outputFile);

// Write test results
outputStream.write('=== Direct Output Test ===\n');
outputStream.write(`Test started at: ${new Date().toISOString()}\n\n`);

// Test 1: Basic file system access
try {
  fs.writeFileSync('test_file.txt', 'test content');
  const content = fs.readFileSync('test_file.txt', 'utf8');
  fs.unlinkSync('test_file.txt');
  outputStream.write('File system test: PASSED\n');
} catch (error) {
  outputStream.write(`File system test: FAILED - ${error.message}\n`);
}

// Test 2: Require chai
try {
  const chai = require('chai');
  outputStream.write(`Chai version: ${chai.version}\n`);
  outputStream.write('Chai require test: PASSED\n');
} catch (error) {
  outputStream.write(`Chai require test: FAILED - ${error.message}\n`);
}

// Test 3: Run a simple test
const assert = require('assert');
try {
  assert.strictEqual(1 + 1, 2, '1+1 should equal 2');
  outputStream.write('Simple assertion test: PASSED\n');
} catch (error) {
  outputStream.write(`Simple assertion test: FAILED - ${error.message}\n`);
}

// List files in test directory
try {
  const testFiles = fs.readdirSync('test').filter(f => f.endsWith('.test.js'));
  outputStream.write('\n=== Test Files ===\n');
  testFiles.forEach(file => outputStream.write(`- ${file}\n`));
} catch (error) {
  outputStream.write(`Error reading test directory: ${error.message}\n`);
}

// Complete
outputStream.write('\n=== Test Complete ===\n');
outputStream.end();

console.log(`Test output written to: ${outputFile}`);
