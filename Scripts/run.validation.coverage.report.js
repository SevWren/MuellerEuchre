/**
 * @file Scripts/run.validation.coverage.report.js
 * @description Runs a sequential test coverage report for validation-related test files.
 *
 * This script executes `c8` (a code coverage tool) for a specific set of test files,
 * ensuring that the coverage report is cumulative.
 *
 * It cleans the coverage directory only on the first run and then appends the results
 * from subsequent runs. This allows for a consolidated report covering all specified tests.
 *
 * To run: `node Scripts/run.validation.coverage.report.js`
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

// --- Configuration ---

// An array of the test files to run in sequence.
const testFiles = [
  'test/game/logic/validatePlay.unit.test.js',
  'test/game/logic/validation.GoAlone.unit.test.js',
  'test/game/logic/validation.unit.test.js'
];

// The specific file we want to generate coverage for.
const includeFile = 'src/game/logic/validation.js';

// --- Helper Functions ---

/**
 * Executes a shell command and streams its output to the console.
 * Returns a promise that resolves on success or rejects on failure.
 * @param {string} command - The command to execute (e.g., 'npx').
 * @param {string[]} args - An array of arguments for the command.
 * @returns {Promise<void>}
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n> Executing: ${command} ${args.join(' ')}`);

    // Use shell:true for cross-platform compatibility with 'npx'.
    const child = spawn(command, args, { stdio: 'inherit', shell: true });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// --- Main Execution Logic ---

/**
 * Runs the sequence of test coverage commands.
 */
async function runValidationCoverage() {
  console.log('--- Starting Validation Test Coverage ---');

  for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    const isFirstRun = i === 0;

    // Base arguments for c8
    const args = ['c8'];

    // The --clean flag should only be used on the first run to ensure
    // that subsequent runs append to the same coverage data.
    if (isFirstRun) {
      args.push('--clean');
    }

    // Add reporters and the specific file to include in the report.
    args.push(
      '--reporter=text',
      '--reporter=html',
      `--include="${includeFile}"`,
      'node',
      '--test',
      testFile
    );

    try {
      await runCommand('npx', args);
      console.log(`--- finished running command for: ${testFile} ---`);
    } catch (error) {
      console.error(`\n--- Coverage script failed for: ${testFile} ---`);
      console.error(error.message);
      // Exit with a failure code to stop any CI/CD pipelines.
      process.exit(1);
    }
  }

}

// Start the script
runValidationCoverage();