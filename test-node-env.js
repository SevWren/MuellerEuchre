// Simple Node.js environment test
console.log('=== Node.js Environment Test ===');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Current directory: ${process.cwd()}`);
console.log('\nEnvironment Variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- PATH: ${process.env.PATH?.split(';').join('\n  ')}`);

// Test file system access
const fs = require('fs');
const path = require('path');

try {
  const testFile = path.join(__dirname, 'test-env-output.txt');
  fs.writeFileSync(testFile, 'Test write operation at ' + new Date().toISOString());
  console.log('\n✅ Successfully wrote to test file:', testFile);
  
  const files = fs.readdirSync('.');
  console.log('\nFirst 5 files in current directory:');
  files.slice(0, 5).forEach((file, i) => {
    const stats = fs.statSync(file);
    console.log(`- ${file} (${stats.isDirectory() ? 'dir' : 'file'})`);
  });
  
  console.log('\n✅ Environment test completed successfully!');
} catch (error) {
  console.error('\n❌ Error during environment test:', error.message);
  process.exit(1);
}
