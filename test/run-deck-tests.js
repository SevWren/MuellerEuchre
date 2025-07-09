// Test runner for deck unit tests that avoids import conflicts
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Run the test file directly with node:test
  const testFile = join(__dirname, 'utils', 'deck.unit.test.js');
  const command = `node --test ${testFile}`;
  
  console.log(`Running tests in ${testFile}...`);
  const output = execSync(command, { encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error('Error running tests:', error.message);
  process.exit(1);
}
