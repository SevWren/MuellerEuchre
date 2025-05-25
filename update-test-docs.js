/**
 * @file update-test-docs.js - Automated Test Documentation Updater
 * @description 
 * This script automates the process of updating JSDoc headers in test files to maintain
 * consistent and comprehensive documentation across the test suite.
 * 
 * ===== WHEN TO USE =====
 * 1. After adding new test files
 * 2. When modifying test file structure
 * 3. When updating test documentation standards
 * 4. As part of major version updates
 * 
 * ===== HOW TO USE =====
 * 1. Run from the project root directory:
 *    ```bash
 *    node update-test-docs.js
 *    ```
 * 2. The script will:
 *    - Scan the /test directory for .test.js and .test.mjs files
 *    - Generate appropriate JSDoc headers based on test type
 *    - Preserve existing test code while updating headers
 *    - Output a summary of updated files
 * 
 * 
 * ===== WHY USE THIS =====
 * - Ensures consistent documentation style across all test files
 * - Saves time on manual documentation updates
 * - Maintains up-to-date test coverage information
 * - Provides clear module and dependency documentation
 * - Helps new developers understand test structure
 * 
 * @note This is a development tool and should NOT be part of the CI/CD pipeline.
 *       Always review changes after running this script.
 * 
 * @version 1.0.0
 * @since 2024-05-25
 * @license MIT
 */

const fs = require('fs');
const path = require('path');

// Define documentation templates for different test types
const DOC_TEMPLATES = {
  validation: {
    description: 'Input validation and data sanitization tests',
    coverage: [
      'Input sanitization',
      'Game state validation',
      'Player action validation',
      'Error handling for invalid inputs'
    ]
  },
  unit: {
    description: 'Unit tests for individual components',
    coverage: [
      'Component initialization',
      'Method behavior',
      'Edge cases',
      'Error conditions'
    ]
  },
  integration: {
    description: 'Integration tests for component interactions',
    coverage: [
      'Component communication',
      'Data flow',
      'State management',
      'Error handling across components'
    ]
  },
  performance: {
    description: 'Performance and load testing',
    coverage: [
      'Response times',
      'Memory usage',
      'Load handling',
      'Concurrent user simulation'
    ]
  },
  security: {
    description: 'Security and vulnerability tests',
    coverage: [
      'Input validation',
      'Authentication',
      'Authorization',
      'Data protection'
    ]
  }
};

// Map test files to their documentation types
const TEST_FILE_TYPES = {
  'validation.test.js': 'validation',
  'unit.test.js': 'unit',
  'integration.test.js': 'integration',
  'performance.test.js': 'performance',
  'security.test.js': 'security',
  'basic.test.mjs': 'unit',
  'dealerDiscard.test.js': 'unit',
  'errorHandling.test.js': 'validation',
  'goAlone.unit.test.js': 'unit',
  'logging.unit.test.js': 'unit',
  'multiGame.test.js': 'integration',
  'orderUp.unit.test.js': 'unit',
  'persistence.test.js': 'integration',
  'playCard.additional.test.js': 'unit',
  'playCard.unit.test.js': 'unit',
  'reconnection.test.js': 'integration',
  'scoreHand.unit.test.js': 'unit',
  'socket.unit.test.js': 'unit',
  'spectator.test.js': 'integration',
  'startNewHand.test.js': 'unit',
  'validation.test.js': 'validation'
};

function generateHeader(filename) {
  const baseName = path.basename(filename);
  const moduleName = baseName.replace(/\./g, '').replace(/-/g, '');
  const testType = Object.entries(TEST_FILE_TYPES).find(([suffix]) => 
    baseName.endsWith(suffix)
  )?.[1] || 'unit';
  
  const template = DOC_TEMPLATES[testType] || DOC_TEMPLATES.unit;
  
  return `/**
 * @file ${baseName} - ${template.description}
 * @module ${moduleName}
 * @description 
 * This test suite verifies the ${template.description.toLowerCase()}.
 * 
 * Test Coverage Includes:
${template.coverage.map(item => ` * - ${item}`).join('\n')}
 * 
 * @version 1.0.0
 * @since ${new Date().toISOString().split('T')[0]}
 * @license MIT
 * @see {@link ../../README.md|Project Documentation}
 * 
 * @requires chai - Assertion library
 * @requires sinon - Test spies, stubs and mocks
 * @requires proxyquire - Module dependency injection
 */
`;
}

function updateTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Find the end of the header comment
    let headerEnd = 0;
    if (lines[0].includes('/**')) {
      while (headerEnd < lines.length && !lines[headerEnd].includes('*/')) {
        headerEnd++;
      }
      headerEnd++; // Include the '*/' line
    }
    
    // Generate new header
    const newHeader = generateHeader(filePath);
    
    // Keep imports and other code after the header
    const restOfFile = lines.slice(headerEnd).join('\n');
    
    // Write updated content
    fs.writeFileSync(filePath, newHeader + restOfFile);
    console.log(`Updated: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main function to update all test files
function updateAllTestFiles() {
  const testDir = path.join(__dirname, 'test');
  const files = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js') || file.endsWith('.test.mjs'));
  
  console.log(`Found ${files.length} test files to update...`);
  
  let successCount = 0;
  files.forEach(file => {
    const filePath = path.join(testDir, file);
    if (updateTestFile(filePath)) {
      successCount++;
    }
  });
  
  console.log(`\nUpdate complete. Successfully updated ${successCount}/${files.length} files.`);
}

// Run the updater
updateAllTestFiles();
