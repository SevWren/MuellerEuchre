import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = path.join(__dirname, 'test');

// Process each test file
fs.readdirSync(testDir).forEach(file => {
  if ((file.endsWith('.test.js') || file.endsWith('.spec.js')) && file !== 'setup.js') {
    const filePath = path.join(testDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update relative imports to include .js extension
    content = content.replace(
      /from\s+['"](\..*?)(?:\.js)?['"]/g,
      (match, p1) => `from '${p1}.js'`
    );
    
    // Update src/ imports
    content = content.replace(
      /from\s+['"]src\/(.*?)(?:\.js)?['"]/g,
      (match, p1) => `from '../src/${p1}.js'`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${file}`);
  }
});

console.log('All test file imports have been updated');
