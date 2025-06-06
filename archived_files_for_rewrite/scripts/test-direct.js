// Test basic Node.js functionality
console.log('=== Basic Node.js Test ===');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test basic JavaScript
const arr = [1, 2, 3];
console.log('Array test:', [...arr, 4].join(','));

// Test file system access
import { readFile } from 'fs/promises';
try {
  const pkg = await readFile('package.json', 'utf8');
  console.log('Package.json exists:', pkg ? '✅' : '❌');
} catch (e) {
  console.error('Error reading package.json:', e.message);
}

console.log('=== Test Complete ===');
