const fs = require('fs');
const path = require('path');

// Get current directory
const currentDir = __dirname;

// Create a writable stream to a file
const outputFile = path.join(currentDir, 'directory_listing.txt');
const writeStream = fs.createWriteStream(outputFile);

// Write header
writeStream.write(`Directory Listing for: ${currentDir}\n`);
writeStream.write('='.repeat(50) + '\n\n');

// List all files in the current directory
try {
  const files = fs.readdirSync('.');
  files.forEach(file => {
    const filePath = path.join('.', file);
    try {
      const stats = fs.statSync(filePath);
      const type = stats.isDirectory() ? '[DIR] ' : '[FILE]';
      const size = stats.size.toString().padStart(10);
      const modified = stats.mtime.toISOString();
      writeStream.write(`${type} ${file.padEnd(40)} ${size} bytes  ${modified}\n`);
    } catch (err) {
      writeStream.write(`[ERROR] ${file}: ${err.message}\n`);
    }
  });
  
  writeStream.write('\n=== END OF LISTING ===\n');
  writeStream.end(() => {
    console.log(`Directory listing saved to: ${outputFile}`);
  });
} catch (err) {
  writeStream.write(`Error reading directory: ${err.message}\n`);
  writeStream.end();
}
