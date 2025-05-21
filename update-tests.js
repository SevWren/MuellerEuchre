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
