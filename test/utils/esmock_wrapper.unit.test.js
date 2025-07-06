/**
 * @file Test suite for esmock_wrapper utility
 * @module test/utils/esmock_wrapper.unit.test
 * @description Tests for the esmock_wrapper utility functions including
 * path alias resolution and module mocking.
 * @requires chai
 * @requires path
 * @requires url
 * @requires sinon
 */

import { expect } from 'chai';
import path from 'path';
import { fileURLToPath } from 'url';
import sinon from 'sinon';

// Import the module as a namespace to avoid potential export conflicts
import * as esmockWrapper from './esmock_wrapper.js';

// Set up test file path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test constants for path resolution
 * @namespace
 * @property {string} TEST_ALIAS - Test alias with @/ prefix
 * @property {string} TEST_ALIAS_2 - Test alias with @test/ prefix
 * @property {string} RELATIVE_PATH - Test relative path
 * @property {string} ABSOLUTE_PATH - Test absolute path
 */
const TEST_ALIAS = '@/utils/logger.js';
const TEST_ALIAS_2 = '@test/utils/test-utils.js';
const RELATIVE_PATH = './relative/path.js';
const ABSOLUTE_PATH = path.resolve('/absolute/path.js');

/**
 * Test suite for the esmock_wrapper module
 * @description Tests cover the core functionality including path resolution,
 * module mocking, and cross-platform compatibility.
 */
describe('esmock_wrapper', function() {
  // Increase timeout for async tests
  this.timeout(5000);

  // Test setup and teardown
  beforeEach(function() {
    // Reset any module state before each test
  });

  afterEach(function() {
    // Clean up any mocks or state after each test
    sinon.restore();
  });

  /**
   * Test suite for the resolveAlias function
   * @description Verifies path alias resolution functionality
   */
  describe('resolveAlias', function() {
    it('should be a function', function() {
      expect(esmockWrapper.resolveAlias).to.be.a('function');
    });

    it('should resolve @/ alias to src/', function() {
      const result = esmockWrapper.resolveAlias(TEST_ALIAS);
      expect(result).to.equal('src/utils/logger.js');
    });

    it('should resolve @test/ alias to test/', function() {
      const result = esmockWrapper.resolveAlias(TEST_ALIAS_2);
      expect(result).to.equal('test/utils/test-utils.js');
    });

    it('should not modify relative paths', function() {
      const result = esmockWrapper.resolveAlias(RELATIVE_PATH);
      expect(result).to.equal(RELATIVE_PATH);
    });

    it('should not modify absolute paths', function() {
      const result = esmockWrapper.resolveAlias(ABSOLUTE_PATH);
      expect(result).to.equal(ABSOLUTE_PATH);
    });
  });

  /**
   * Test suite for the esmockWithPaths function
   * @description Verifies the main mocking function's basic functionality
   */
  describe('esmockWithPaths', function() {
    it('should be a function', function() {
      expect(esmockWrapper.esmockWithPaths).to.be.a('function');
    });
  });

  /**
   * Test suite for the createMockedModule function
   * @description Verifies the helper function for creating mocked modules
   */
  describe('createMockedModule', function() {
    it('should be a function', function() {
      expect(esmockWrapper.createMockedModule).to.be.a('function');
    });
  });
});
