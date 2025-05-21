// Simple test file to verify Node.js execution
console.log('=== Simple Test ===');
console.log('This is a test message from simple-test.js');
console.log('Current working directory:', process.cwd());
console.log('Node.js version:', process.version);

// Simple calculation
const a = 5;
const b = 3;
console.log(`${a} + ${b} = ${a + b}`);

// List some files in the current directory
try {
  const fs = require('fs');
  const files = fs.readdirSync('.');
  console.log('\nFiles in current directory:');
  files.forEach(file => console.log(`- ${file}`));
} catch (error) {
  console.error('Error reading directory:', error.message);
}
