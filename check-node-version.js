// Simple script to check Node.js version and basic functionality
console.log('=== Node.js Environment Check ===');
console.log(`Node.js Version: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Current Directory: ${process.cwd()}`);

// Test basic file system access
const fs = require('fs');
console.log('\n=== File System Check ===');
try {
  const files = fs.readdirSync('.');
  console.log(`Found ${files.length} items in current directory`);
  console.log('Directory contents:', files.join(', '));
} catch (error) {
  console.error('Error reading directory:', error.message);
}

// Test module resolution
console.log('\n=== Module Resolution ===');
try {
  const path = require('path');
  console.log('Path module loaded successfully');
  console.log('Current file path:', __filename);
} catch (error) {
  console.error('Error loading path module:', error.message);
}

// Test ES Module support
console.log('\n=== ES Module Support ===');
import('fs/promises')
  .then(() => console.log('ES Module import successful'))
  .catch(e => console.error('ES Module import failed:', e.message));

console.log('\n=== Check Complete ===');
