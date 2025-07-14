
//run with
//node Scripts/run-deck-dependent-tests.js
//TESTS EVERYTHING that references deck.js

/**
 * @file Scripts/run-deck-dependent-tests.js
 * @description Runs all unit tests for modules that have a dependency on 'src/utils/deck.js'.
 *
 * This script is designed for regression testing. Whenever 'deck.js' is modified,
 * running this script ensures that all dependent modules continue to function as expected.
 * It executes a predefined list of test files sequentially using the native `node --test` runner.
 *
 * To run from the project root: `node Scripts/run-deck-dependent-tests.js`
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Configuration ---

// List of test files that depend on or are related to 'src/utils/deck.js'.
// This list is derived from a dependency analysis.
const deckDependentTestFiles = [
  'test/utils/deck.unit.test.js',
  'test/game/logic/aiLogic.unit.test.js',
  'test/game/logic/validation.unit.test.js',
  'test/game/logic/validatePlay.unit.test.js',
  'test/game/logic/validatePlay.edge.unit.test.js',
  'test/game/phases/startNewHandPhase.unit.test.js',
  'test/game/phases/biddingPhase.unit.test.js',
  'test/game/phases/playingPhase.unit.test.js',
];

// --- Helper Functions ---

/**
 * Executes a shell command and streams its output to the console.
 * Returns a promise that resolves on success or rejects on failure.
 * @param {string} command - The command to execute (e.g., 'node').
 * @param {string[]} args - An array of arguments for the command.
 * @returns {Promise<void>}
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n> Executing: ${command} ${args.join(' ')}`);

    // Use shell:true for cross-platform compatibility, especially with 'npx' or complex commands.
    const child = spawn(command, args, { stdio: 'inherit', shell: true });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`--- Finished successfully: ${command} ${args.join(' ')} ---`);
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
 * Runs the sequence of tests for deck-dependent modules.
 */
async function runDeckDependentTests() {
  console.log('--- Starting Deck-Dependent Test Suite ---');
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  for (const relativeTestFile of deckDependentTestFiles) {
    const absoluteTestFile = path.join(projectRoot, relativeTestFile);
    const args = ['--test', '--test-reporter', 'spec', `"${absoluteTestFile}"`];

    try {
      await runCommand('node', args);
    } catch (error) {
      console.error(`\n--- Test suite failed for: ${relativeTestFile} ---`);
      console.error(error.message);
      // Exit with a failure code to stop any CI/CD pipelines.
      process.exit(1);
    }
  }

  console.log('\n--- All Deck-Dependent Tests Passed Successfully! ---');
}

// Start the script
runDeckDependentTests();
