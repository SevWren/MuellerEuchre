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

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Mock document object
global.document = {
  createElement: () => ({
    classList: {
      add: () => {},
      remove: () => {}
    },
    style: {},
    appendChild: () => {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

// Mock window object
global.window = {
  localStorage: localStorageMock,
  document: global.document,
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Make localStorage available globally
global.localStorage = localStorageMock;

// Import test helpers
import './test-helper.js';

// Configure Mocha to handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
