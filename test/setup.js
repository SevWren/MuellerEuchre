// Test environment setup
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure environment variables for testing
process.env.NODE_ENV = 'test';

// Add global test utilities
global.__basedir = join(__dirname, '..');

// Import test files
import './test-helper.js';

// Set test timeout (in milliseconds)
const TEST_TIMEOUT = 10000; // 10 seconds
global.TEST_TIMEOUT = TEST_TIMEOUT;

// Configure mocha options
if (mocha.setup) {
  mocha.setup({
    timeout: TEST_TIMEOUT,
    slow: 2000,
    bail: true
  });
}

// Import test helpers
import './test-helper.js';
