const fs = require('fs');
const path = require('path');

// Test file creation
const testFilePath = path.join(__dirname, 'test_output.txt');
fs.writeFileSync(testFilePath, 'Test file created successfully!');

// Verify file exists
if (fs.existsSync(testFilePath)) {
  const content = fs.readFileSync(testFilePath, 'utf8');
  console.log('File content:', content);
} else {
  console.error('Test file was not created');
}

// Simple package test
try {
  console.log('Attempting to require chai...');
  const chai = require('chai');
  console.log('Chai version:', chai.version);
} catch (error) {
  console.error('Error requiring chai:', error.message);
}

// List current directory files
try {
  console.log('\nCurrent directory files:');
  const files = fs.readdirSync('.');
  files.forEach(file => {
    console.log(`- ${file}`);
  });
} catch (error) {
  console.error('Error reading directory:', error.message);
}
