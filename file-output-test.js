const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'test-output.txt');
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(outputFile, logMessage, 'utf8');
};

// Start test
log('Starting file output test...');
log(`Node.js Version: ${process.version}`);
log(`Current Directory: ${process.cwd()}`);

// Test basic operations
log('Testing basic operations...');
log(`1 + 1 = ${1 + 1}`);

// Test file system access
try {
  const files = fs.readdirSync('.');
  log(`Found ${files.length} files in current directory`);
  files.slice(0, 5).forEach((file, i) => log(`  ${i + 1}. ${file}`));
  if (files.length > 5) log(`  ...and ${files.length - 5} more`);
} catch (error) {
  log(`Error reading directory: ${error.message}`);
}

// Test completion
log('Test completed successfully');
