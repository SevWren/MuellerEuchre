// Scripts/run-coverage-all.js

import { spawn } from 'node:child_process';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..'); // Assumes script is in 'Scripts/'

const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const TEST_DIR = path.join(PROJECT_ROOT, 'test');

const LOG_FILE_PATH = path.join(PROJECT_ROOT, 'coverage-report.log');

// --- Helper Functions ---

/**
 * Recursively finds files matching a pattern within a directory.
 * @param {string} startPath - The directory to start searching from.
 * @param {function(string): boolean} fileFilter - A function that returns true if a file should be included.
 * @returns {Promise<string[]>} A promise that resolves to an array of relative file paths.
 */
async function findFiles(startPath, fileFilter) {
    let filesFound = [];
    const entries = await fsPromises.readdir(startPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(startPath, entry.name);
        const relativePath = path.relative(PROJECT_ROOT, fullPath);

        if (entry.isDirectory()) {
            // Recursively search subdirectories, but exclude node_modules
            if (entry.name === 'node_modules') {
                continue;
            }
            filesFound = filesFound.concat(await findFiles(fullPath, fileFilter));
        } else if (entry.isFile() && fileFilter(entry.name)) {
            filesFound.push(relativePath);
        }
    }
    return filesFound;
}

/**
 * Executes a shell command and streams its output.
 * @param {string} command - The command to execute (e.g., 'npx').
 * @param {string[]} args - An array of arguments for the command.
 * @returns {Promise<number>} A promise that resolves with the exit code.
 */
function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        console.log(`\n> Executing: ${command} ${args.join(' ')}`);

        const child = spawn(command, args, { stdio: 'pipe', shell: true }); // Use 'pipe' to capture output

        let stdoutBuffer = '';
        let stderrBuffer = '';

        child.stdout.on('data', (data) => {
            process.stdout.write(data); // Stream to console
            stdoutBuffer += data.toString();
        });

        child.stderr.on('data', (data) => {
            process.stderr.write(data); // Stream to console
            stderrBuffer += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`--- Command finished successfully: ${command} ${args.join(' ')} ---`);
                resolve(code);
            } else {
                console.error(`--- Command FAILED with exit code ${code}: ${command} ${args.join(' ')} ---`);
                // Append full output to log file on failure
                fsPromises.appendFile(LOG_FILE_PATH, `\n\n--- FAILED COMMAND: ${command} ${args.join(' ')} ---\n`);
                fsPromises.appendFile(LOG_FILE_PATH, `\nSTDOUT:\n${stdoutBuffer}\n`);
                fsPromises.appendFile(LOG_FILE_PATH, `\nSTDERR:\n${stderrBuffer}\n`);
                reject(code); // Reject with the exit code
            }
        });

        child.on('error', (err) => {
            console.error(`Failed to start command: ${err.message}`);
            reject(1); // Indicate failure
        });
    });
}

// --- Main Execution Logic ---

async function runCoverageAll() {
    console.log('--- Starting Comprehensive Test Coverage ---');
    console.log(`Report will cover files in: ${SRC_DIR}`);
    console.log(`Tests will be run from: ${TEST_DIR}`);
    console.log(`Full log of failures (if any) will be in: ${LOG_FILE_PATH}`);

    try {
        // Clear previous log file
        await fsPromises.writeFile(LOG_FILE_PATH, '', 'utf8');

        // 1. Find all relevant test files
        const testFiles = await findFiles(TEST_DIR, (filename) =>
            filename.includes('unit') && filename.endsWith('.js')
        );
        console.log(`\nFound ${testFiles.length} unit test files.`);
        // console.log(testFiles.map(f => `  - ${f}`).join('\n')); // Uncomment for detailed list

        if (testFiles.length === 0) {
            console.warn('No unit test files found. Exiting.');
            return;
        }

        // 2. Construct the `node --test` arguments
        // Node's test runner can take multiple file paths as arguments
        const nodeTestArgs = testFiles.map(f => path.join(PROJECT_ROOT, f)); // Convert to absolute paths for node --test

        // 3. Construct the `c8` command
        // `npx c8` will automatically pick up the `c8` config from `package.json`
        // which already defines `--include "src/**/*.js"` and `--exclude "**/test/**"`.
        // So we just need to tell `c8` to run `node --test` with our discovered test files.
        const c8CommandArgs = [
            'c8',
            '--clean', // Clean previous coverage data
            '--reporter=text',
            '--reporter=html',
            '--reporter=lcov',
            'node',
            '--test',
            ...nodeTestArgs // Pass all discovered test files to node --test
        ];

        // 4. Run the command
        const exitCode = await runCommand('npx', c8CommandArgs);

        if (exitCode === 0) {
            console.log('\n--- All Tests Passed and Coverage Report Generated Successfully! ---');
        } else {
            console.error('\n--- Test Coverage Run FAILED. See log for details. ---');
            process.exit(exitCode);
        }

    } catch (error) {
        console.error('\n--- An unexpected error occurred during the coverage run: ---');
        console.error(error);
        process.exit(1);
    }
}

// Execute the main function
runCoverageAll();