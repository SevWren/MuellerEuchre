// scripts/run-layer1-tests.js
import { spawn } from 'node:child_process';
import { glob } from 'glob'; // You may need to run: npm install glob --save-dev
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function runLayer1Tests() {
  console.log('--- Finding Layer 1 unit test files... ---');

  // Define the patterns for Layer 1 test files
  const patterns = [
    'test/config/**/*.unit.test.js',
    'test/game/logic/**/*.unit.test.js',
    'test/game/phases/**/*.unit.test.js',
    'test/utils/**/*.unit.test.js',
    `test/helpers/test-helpers.unit.test.js`
  ];

  // Use glob to find all matching files
  const testFiles = await glob(patterns, { cwd: projectRoot, absolute: true });

  if (testFiles.length === 0) {
    console.warn('No Layer 1 test files found. Exiting.');
    return;
  }

  console.log(`Found ${testFiles.length} test files. Running tests...`);

  // Construct the command to run
  const command = 'node';
  const args = ['--test', ...testFiles];

  // Execute the command
  const child = spawn(command, args, { stdio: 'inherit', shell: true });

  child.on('close', (code) => {
    process.exit(code);
  });
}

runLayer1Tests();