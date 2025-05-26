const fs = require('fs');
const path = require('path');

// Create a test file path
const testFilePath = path.join(__dirname, 'fs_test_output.txt');

// Write to file
fs.writeFileSync(testFilePath, 'Test content at ' + new Date().toISOString());

// Verify file exists
if (fs.existsSync(testFilePath)) {
  console.log(`Successfully created file: ${testFilePath}`);
  
  // Read file content
  const content = fs.readFileSync(testFilePath, 'utf8');
  console.log('File content:', content);
  
  // Delete the file
  fs.unlinkSync(testFilePath);
  console.log('Test file deleted');
} else {
  console.error('Failed to create test file');
}
