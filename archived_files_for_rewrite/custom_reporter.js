/**
// @file custom_reporter.js - Custom Mocha test reporter that outputs results to a file
// @module CustomFileReporter
// @description Provides a custom reporter for Mocha that writes test results to a file in a readable format.
// The reporter captures test events and generates a detailed log file with test results, including
// pass/fail status, test duration, and error details for failed tests.
// 
// @example
// o use this reporter, run mocha with the --reporter flag:
// mocha --reporter ./custom_reporter.js test/**/*.test.js
// 
//* @see {@link https://mochajs.org/api/tutorial-custom-reporter.html|Mocha Custom Reporter Documentation}
//* @requires fs - Node.js File System module
//* @requires path - Node.js Path module
//* @since 1.0.0
//

const fs = require('fs');
const path = require('path');

// Custom Mocha reporter that writes to a file
class FileReporter {
  constructor(runner) {
    this.outputFile = path.join(__dirname, 'mocha_results.txt');
    this.output = [];
    
    // Write header
    this.log(`=== Mocha Test Results - ${new Date().toISOString()} ===\n`);
    
    // Handle test events
    runner.on('start', () => {
      this.log('Test run started\n');
    });
    
    runner.on('suite', (suite) => {
      if (suite.root) return;
      this.log(`\n${suite.title}`);
    });
    
    runner.on('test', (test) => {
      this.log(`  - ${test.title}`);
    });
    
    runner.on('pass', (test) => {
      this.log(`    ✓ PASSED: ${test.title} (${test.duration}ms)`);
    });
    
    runner.on('fail', (test, err) => {
      this.log(`    ✖ FAILED: ${test.title}`);
      this.log(`      ${err.message}`);
      if (err.stack) {
        this.log(err.stack.split('\n').slice(1).join('\n'));
      }
    });
    
    runner.on('end', () => {
      const stats = runner.stats;
      this.log('\n=== Test Summary ===');
      this.log(`Total: ${stats.tests}`);
      this.log(`Passed: ${stats.passes}`);
      this.log(`Failed: ${stats.failures}`);
      this.log(`Duration: ${stats.duration}ms`);
      
      // Write output to file
      fs.writeFileSync(this.outputFile, this.output.join('\n'));
      console.log(`\nTest results saved to: ${this.outputFile}`);
    });
  }
  
  log(message) {
    this.output.push(message);
    console.log(message);
  }
}

module.exports = FileReporter;
