const fs = require('fs');
const path = require('path');

// Create a timestamp for the log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const logFile = path.join(__dirname, 'terminal_output_' + timestamp + '.log');

// Create a write stream to the log file
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

// Override console methods to write to both console and file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
    const message = args.join(' ') + '\n';
    originalConsoleLog.apply(console, args);
    logStream.write(`[LOG] ${message}`);};

console.error = function(...args) {
    const message = args.join(' ') + '\n';
    originalConsoleError.apply(console, args);
    logStream.write(`[ERROR] ${message}`);
};

// Test messages
console.log('This is a test of the external terminal');
console.error('This is an error message');
process.stdout.write('Standard output test\n');
process.stderr.write('Standard error test\n');

// Add a small delay to see the output
setTimeout(() => {
    console.log('Test completed successfully');
    console.log(`Log file created at: ${logFile}`);
    logStream.end();
    process.exit(0);
}, 1000);
