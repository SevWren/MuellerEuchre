// Test environment setup
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure environment variables for testing
process.env.NODE_ENV = 'test';

// Add global test utilities
global.__basedir = join(__dirname, '..');

// Set test timeout (in milliseconds)
const TEST_TIMEOUT = 10000; // 10 seconds
global.TEST_TIMEOUT = TEST_TIMEOUT;

// Import test helpers
import './test-helper.js';
