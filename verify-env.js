console.log('=== Environment Verification ===');
console.log('1. Checking Node.js environment...');
console.log(`   Node.js version: ${process.version}`);
console.log(`   Platform: ${process.platform} ${process.arch}`);
console.log(`   Current directory: ${process.cwd()}`);

console.log('\n2. Checking file system access...');
try {
  const fs = require('fs');
  const files = fs.readdirSync('.');
  console.log('   Current directory contents:', files.join(', '));
  
  const testFiles = fs.readdirSync('./test').filter(f => f.endsWith('.js'));
  console.log('   Test files found:', testFiles.length > 0 ? testFiles.join(', ') : 'None');
  
  console.log('   package.json exists:', fs.existsSync('package.json') ? '✅' : '❌');
  console.log('   node_modules exists:', fs.existsSync('node_modules') ? '✅' : '❌');
} catch (error) {
  console.error('   Error accessing file system:', error.message);
}

console.log('\n3. Checking module system...');
try {
  // Test CommonJS
  const path = require('path');
  console.log('   CommonJS require works');
  
  // Test ES Modules
  import('chai')
    .then(() => console.log('   ES Module import works'))
    .catch(e => console.error('   ES Module import failed:', e.message));
} catch (error) {
  console.error('   Module system check failed:', error.message);
}

console.log('\n4. Running a simple test...');
const assert = require('assert');
try {
  assert.strictEqual(1 + 1, 2);
  console.log('   Basic assertion passed');
} catch (error) {
  console.error('   Basic assertion failed:', error.message);
}

console.log('\n=== Verification Complete ===');
