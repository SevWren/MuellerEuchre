// Debug script to understand the environment
const fs = require('fs');
const path = require('path');

// Log basic environment info
console.error('=== Environment Debug ===');
console.error(`Node.js Version: ${process.version}`);
console.error(`Platform: ${process.platform} ${process.arch}`);
console.error(`Current Directory: ${process.cwd()}`);
console.error(`__dirname: ${__dirname}`);
console.error(`__filename: ${__filename}`);

// Check if we can write to a file
try {
  const testFile = path.join(__dirname, 'test-write.txt');
  fs.writeFileSync(testFile, 'Test write operation');
  console.error('✅ Successfully wrote to test file');
  fs.unlinkSync(testFile);
} catch (error) {
  console.error('❌ Failed to write test file:', error.message);
}

// List directory contents
try {
  const files = fs.readdirSync('.');
  console.error('\nCurrent directory contents:');
  files.forEach(file => {
    const stats = fs.statSync(file);
    console.error(`- ${file} (${stats.isDirectory() ? 'dir' : 'file'}, ${stats.size} bytes)`);
  });
} catch (error) {
  console.error('❌ Error reading directory:', error.message);
}

// Check if we can load Mocha
try {
  console.error('\n=== Checking Mocha ===');
  const mochaPath = require.resolve('mocha');
  console.error(`Mocha found at: ${mochaPath}`);
  
  // Try to create a simple Mocha instance
  const Mocha = require('mocha');
  const mocha = new Mocha();
  console.error('✅ Successfully created Mocha instance');
  
  // Try to add a test file
  const testFile = path.join(__dirname, 'test', 'sanity.test.js');
  if (fs.existsSync(testFile)) {
    mocha.addFile(testFile);
    console.error(`✅ Successfully added test file: ${testFile}`);
  } else {
    console.error(`❌ Test file not found: ${testFile}`);
  }
} catch (error) {
  console.error('❌ Mocha check failed:', error.message);
}

console.error('\n=== Debug Complete ===');
