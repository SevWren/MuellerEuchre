// Test environment setup for ES Modules
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { expect } from 'chai';
import sinon from 'sinon';

// Configure environment variables for testing
process.env.NODE_ENV = 'test';

// Set up global test utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
global.__basedir = join(__dirname, '..');

// Set test timeout (in milliseconds)
const TEST_TIMEOUT = 10000; // 10 seconds
global.TEST_TIMEOUT = TEST_TIMEOUT;

// Set up global test utilities
global.expect = expect;
global.sinon = sinon;

// Import test helpers
import './test-helper.js';

// Configure Mocha to handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
