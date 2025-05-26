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
