const fs = require('fs');
const path = require('path');

console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());
console.log('\nDirectory contents:');

try {
  const files = fs.readdirSync('.');
  files.forEach(file => {
    const stats = fs.statSync(file);
    console.log(`${file.padEnd(30)} ${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${stats.size} bytes`);
  });
} catch (err) {
  console.error('Error reading directory:', err);
}
