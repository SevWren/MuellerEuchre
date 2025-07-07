import { execSync } from 'child_process';
import path from 'path';

// This script makes it easy to run coverage on a single test file
// and intelligently include ONLY the corresponding source file.
//
// Usage: node run-coverage-on-file.js test/utils/deck.unit.test.js
//
// It will automatically derive 'src/utils/deck.js' as the file to include.

const testFile = process.argv[2];

if (!testFile) {
  console.error('ERROR: Please provide a path to a test file.');
  console.error('Usage: node run-coverage-on-file.js <path/to/test.js>');
  process.exit(1);
}

// --- Logic to derive the source file from the test file ---
// This assumes a 'test/path/to/file.unit.test.js' -> 'src/path/to/file.js' structure.
const sourceFile = testFile
  .replace(/^test/, 'src') // Replace 'test' with 'src'
  .replace(/\.unit\.test\.js$/, '.js') // Replace the test suffix with .js
  .replace(/\.test\.js$/, '.js'); // Also handle cases without '.unit'

console.log(`[Coverage] Running test: ${testFile}`);
console.log(`[Coverage] Targeting source file for report: ${sourceFile}`);

// --- Construct and run the final c8 command ---
// Use cross-platform path normalization
const includeFlag = path.normalize(sourceFile).replace(/\\/g, '/');
const testFileFlag = path.normalize(testFile).replace(/\\/g, '/');

// Use npx to ensure the local c8 is used.
const command = `npx c8 --clean --include "${includeFlag}" --reporter=text --reporter=html node --test "${testFileFlag}"`;

console.log(`[Coverage] Executing: ${command}\n`);

try {
  // Execute the command and pipe its output to our console in real-time.
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  // execSync throws an error if the command returns a non-zero exit code (e.g., if tests fail).
  // We don't need to log the error here because the command's output is already piped.
  // We exit with an error code to signal failure to CI/CD systems.
  console.error(`\n[Coverage] Command failed. Exit code: ${error.status}`);
  process.exit(1);
}