// This script updates all test files to use ES modules instead of CommonJS
// requires. It is only necessary to run this once, and it will not be run
// during normal development or testing. To run this script, execute `node
// update-tests.js` in the project root directory. This script will overwrite
// all test files, so make sure to back up your changes or commit them before
// running this script.



const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'test');

// Process each test file
fs.readdirSync(testDir).forEach(file => {
  if (file.endsWith('.test.js') || file.endsWith('.spec.js')) {
    const filePath = path.join(testDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace requires with imports
    content = content.replace(
      /const\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\)/g, 
      'import { $1 } from "$2"'
    );
    
    content = content.replace(
      /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g, 
      'import $1 from "$2"'
    );
    
    // Update module.exports to export
    content = content.replace(
      /module\.exports\s*=\s*{[^}]*}/, 
      '// Export if needed'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

console.log('Test files updated to use ES modules');
