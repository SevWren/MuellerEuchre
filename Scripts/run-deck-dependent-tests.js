//run with
//node Scripts/run-deck-dependent-tests.js
//TESTS EVERYTHING that references deck.js

/**
 * @file Scripts/run-deck-dependent-tests.js
 * @description Runs all unit tests for modules that have a dependency on 'src/utils/deck.js'.
 *
 * This script is designed for regression testing. Whenever 'deck.js' is modified,
 * running this script ensures that all dependent modules continue to function as expected.
 * It executes all test files sequentially, logs the full output of any failures
 * to a log file, and provides a final aggregated summary of all test results.
 *
 * To run from the project root: `node Scripts/run-deck-dependent-tests.js`
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// --- Configuration ---

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE_PATH = path.join(SCRIPT_DIR, 'run-deck-dependent-tests.errors.log');

// List of test files that depend on or are related to 'src/utils/deck.js'.
const deckDependentTestFiles = [
  'test/utils/deck.unit.test.js',
  'test/game/logic/aiLogic.unit.test.js',
  'test/game/logic/validation.unit.test.js',
  'test/game/logic/validatePlay.unit.test.js',
  'test/game/logic/validatePlay.edge.unit.test.js',
  'test/game/phases/startNewHandPhase.unit.test.js',
  'test/game/phases/biddingPhase.unit.test.js',
  'test/game/phases/playingPhase.unit.test.js',
  'test/server/dealerDiscard.unit.test.js',
];


// --- Helper Functions ---

/**
 * Executes a shell command and captures its output.
 * Returns a promise that resolves with the output on success or rejects with the output on failure.
 * @param {string} command - The command to execute (e.g., 'node').
 * @param {string[]} args - An array of arguments for the command.
 * @returns {Promise<string>}
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n> Executing: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, { shell: true });

    let output = '';

    child.stdout.on('data', (data) => {
      const dataStr = data.toString();
      process.stdout.write(dataStr);
      output += dataStr;
    });

    child.stderr.on('data', (data) => {
      const dataStr = data.toString();
      process.stderr.write(dataStr);
      output += dataStr;
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`--- Finished successfully: ${command} ${args.join(' ')} ---`);
        resolve(output);
      } else {
        reject(output); // Reject with the full output on failure
      }
    });

    child.on('error', (err) => {
      reject(err.toString());
    });
  });
}

/**
 * Parses the output from the node:test runner to extract result counts.
 * @param {string} output - The string output from the test runner.
 * @returns {Object} An object containing the counts for each metric.
 */
function parseTestOutput(output) {
  const results = {
      tests: 0, suites: 0, pass: 0, fail: 0,
      cancelled: 0, skipped: 0, todo: 0
  };
  // Regex to find lines like "ℹ tests 123" or "✖ fail 2"
  const regex = /(?:ℹ|✖)\s(tests|suites|pass|fail|cancelled|skipped|todo)\s+(\d+)/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
      const key = match[1];
      const value = parseInt(match[2], 10);
      if (key in results) {
          results[key] = value;
      }
  }
  return results;
}


// --- Main Execution Logic ---

/**
 * Runs the sequence of tests for deck-dependent modules.
 * It will run all test files, log failures, and provide an aggregated summary.
 */
async function runDeckDependentTests() {
  console.log('--- Starting Deck-Dependent Test Suite ---');
  
  if (fs.existsSync(LOG_FILE_PATH)) {
    fs.unlinkSync(LOG_FILE_PATH);
  }
  
  const projectRoot = path.resolve(SCRIPT_DIR, '..');
  const failedTestFiles = [];
  const totalResults = {
    tests: 0, suites: 0, pass: 0, fail: 0,
    cancelled: 0, skipped: 0, todo: 0
  };

  for (const relativeTestFile of deckDependentTestFiles) {
    const absoluteTestFile = path.join(projectRoot, relativeTestFile);
    const args = ['--test', '--test-reporter', 'spec', `"${absoluteTestFile}"`];
    let fileOutput = '';

    try {
      fileOutput = await runCommand('node', args);
    } catch (errorOutput) {
      console.error(`\n--- Test suite FAILED for: ${relativeTestFile} ---`);
      failedTestFiles.push(relativeTestFile);
      fileOutput = errorOutput;
      
      const logHeader = `\n\n====================[ FAILED: ${relativeTestFile} ]====================\n\n`;
      fs.appendFileSync(LOG_FILE_PATH, logHeader + fileOutput, 'utf8');
    } finally {
      // Always parse output to aggregate results
      const fileResults = parseTestOutput(fileOutput);
      for(const key in totalResults) {
        totalResults[key] += fileResults[key] || 0;
      }
    }
  }

  // --- FINAL SUMMARY ---
  console.log('\n\n=================================================');
  console.log('--- AGGREGATED TEST SUMMARY ---');
  console.log(`  Tests:     ${totalResults.tests}`);
  console.log(`  Suites:    ${totalResults.suites}`);
  console.log(`  Passed:    ${totalResults.pass}`);
  console.log(`  Failed:    ${totalResults.fail}`);
  console.log(`  Cancelled: ${totalResults.cancelled}`);
  console.log(`  Skipped:   ${totalResults.skipped}`);
  console.log(`  Todo:      ${totalResults.todo}`);
  console.log('=================================================');

  if (failedTestFiles.length > 0) {
    console.error('\n--- OVERALL TEST RUN FAILED ---');
    console.error('The following test suites had errors:');
    for (const failedFile of failedTestFiles) {
      console.error(`  ✖ ${failedFile}`);
    }
    console.error(`\nSee full error details in: ${LOG_FILE_PATH}`);
    console.error('=================================================');
    process.exit(1);
  } else {
    console.log('\n--- All Deck-Dependent Tests Passed Successfully! ---');
  }
}

// Start the script
runDeckDependentTests();