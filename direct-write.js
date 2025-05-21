// Use low-level file operations to write directly to a file
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'direct-output.txt');
const fd = fs.openSync(outputFile, 'w');

function log(message) {
  const data = `${new Date().toISOString()} - ${message}\n`;
  fs.writeSync(fd, data);
}

try {
  log('Starting direct write test');
  log(`Node.js version: ${process.version}`);
  log(`Current directory: ${process.cwd()}`);
  
  // Test file system access
  const files = fs.readdirSync('.');
  log(`Found ${files.length} files in current directory`);
  
  // Write first 5 files
  files.slice(0, 5).forEach((file, i) => {
    const stats = fs.statSync(file);
    log(`  ${i + 1}. ${file} (${stats.isDirectory() ? 'dir' : 'file'})`);
  });
  
  log('Test completed successfully');
} catch (error) {
  log(`Error: ${error.message}`);
} finally {
  fs.closeSync(fd);
  console.log(`Test completed. Check ${outputFile} for results.`);
}
