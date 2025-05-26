const Mocha = require('mocha');
const path = require('path');
const fs = require('fs');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'test_output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Create a writable stream to a file
const logFile = path.join(outputDir, `test_execution_${Date.now()}.log`);
const logStream = fs.createWriteStream(logFile);

// Override console methods to log to both console and file
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

function logToFile(level, ...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  logStream.write(logEntry);
  
  // Also log to original console
  const originalMethod = originalConsole[level] || originalConsole.log;
  originalMethod.apply(console, args);
}

// Override console methods
console.log = (...args) => logToFile('log', ...args);
console.error = (...args) => logToFile('error', ...args);
console.warn = (...args) => logToFile('warn', ...args);
console.info = (...args) => logToFile('info', ...args);

// Log environment info
console.log('=== Test Execution Debug Log ===');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`__dirname: ${__dirname}`);
console.log('Environment variables:', Object.keys(process.env).sort());

// Create a new Mocha instance
const mocha = new Mocha({
  timeout: 60000, // 60 seconds timeout
  reporter: 'spec',
  fullTrace: true,
  color: true
});

// Add test file
const testFile = path.join(__dirname, 'test', 'startNewHand.unit.test.js');
console.log(`\nAdding test file: ${testFile}`);

if (!fs.existsSync(testFile)) {
  console.error(`Error: Test file not found: ${testFile}`);
  process.exit(1);
}

mocha.addFile(testFile);

// Run the tests
console.log('\n=== Starting Test Execution ===');
const startTime = Date.now();

mocha.run(failures => {
  const duration = Date.now() - startTime;
  console.log(`\n=== Test Execution Complete ===`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Failures: ${failures}`);
  
  // Close the log file
  logStream.end(() => {
    console.log(`\nDebug log saved to: ${logFile}`);
    process.exit(failures > 0 ? 1 : 0);
  });
}).on('test', test => {
  console.log(`\nTest started: ${test.fullTitle()}`);
}).on('pass', test => {
  console.log(`Test passed: ${test.fullTitle()} (${test.duration}ms)`);
}).on('fail', (test, err) => {
  console.error(`Test failed: ${test.fullTitle()}`);
  console.error(err);
});
