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
 * ===== WHY USE THIS =====
 * - Ensures consistent documentation style across all test files
 * - Saves time on manual documentation updates
 * - Maintains up-to-date test coverage information
 * - Provides clear module and dependency documentation
 * 
 * @note This is a development tool and should NOT be part of the CI/CD pipeline.
 *       Always review changes after running this script.
 */

import { readFile, writeFile, readdir, unlink, access, mkdir, copyFile, stat, rmdir, constants } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, basename, extname } from 'path';

// Import JSDoc types for better IDE support
/** @typedef {import('fs').PathLike} PathLike */
/** @typedef {import('fs').Stats} Stats */

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * File system methods for better async/await support.
 * @namespace
 * @property {Function} readFile - Reads file content
 * @property {Function} writeFile - Writes content to a file
 * @property {Function} readdir - Reads directory contents
 * @property {Function} unlink - Deletes a file
 * @property {Function} access - Checks file accessibility
 * @property {Function} mkdir - Creates a directory
 * @property {Function} copyFile - Copies a file
 * @property {Function} stat - Gets file status
 * @property {Function} rmdir - Removes a directory
 */
// File system utilities with ES module compatibility
const fsPromises = {
  readFile,
  writeFile,
  readdir,
  unlink,
  access,
  mkdir,
  copyFile,
  stat,
  rmdir,
  constants,
  // Add any additional fs.promises methods you need
  exists: async (path) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }
};

/** @constant {string} BACKUP_DIR - Directory where backups will be stored */
const BACKUP_DIR = resolve(join(__dirname, '.test-docs-backup'));

/** @constant {number} MAX_BACKUPS - Maximum number of backups to keep per file */
const MAX_BACKUPS = 2;

/** @constant {string} TEST_DIR - Directory containing test files to process */
const TEST_DIR = resolve(join(__dirname, 'test'));

/**
 * Validates that a file path is within the project directory to prevent directory traversal attacks.
 * @param {string} filePath - The file path to validate
 * @returns {boolean} True if the path is safe, false otherwise
 * @private
 */
function isPathSafe(filePath) {
  const resolvedPath = resolve(filePath);
  return resolvedPath.startsWith(process.cwd()) || resolvedPath.startsWith(BACKUP_DIR);
}

/**
 * Tracks files that have been modified to enable rollback if needed.
 * @type {Array<{original: string, backup: string, backedUpAt: Date}>}
 * @private
 */
const modifiedFiles = [];

/**
 * Creates a backup of a file before modification.
 * @param {string} filePath - Absolute path to the file to back up
 * @returns {Promise<string>} Path to the created backup file
 * @throws {Error} If backup creation fails due to:
 *   - Path traversal attempt
 *   - File system errors
 *   - Permission issues
 * @private
 * @example
 * const backupPath = await createBackup('/path/to/file.test.js');
 */
async function createBackup(filePath) {
  if (!isPathSafe(filePath)) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  try {
    // Ensure backup directory exists
    await fsPromises.mkdir(BACKUP_DIR, { recursive: true });

    // Create timestamped backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = basename(filePath);
    const backupPath = join(BACKUP_DIR, `${timestamp}_${fileName}.bak`);

    // Create backup
    await fsPromises.copyFile(filePath, backupPath);

    // Verify backup was created
    await fsPromises.access(backupPath, fsPromises.constants.R_OK);

    // Track the backup
    modifiedFiles.push({
      original: filePath,
      backup: backupPath,
      backedUpAt: new Date()
    });

    // Clean up old backups
    await cleanupOldBackups(fileName);

    return backupPath;
  } catch (error) {
    const errorMsg = `Failed to create backup for ${filePath}: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
}

/**
 * Removes old backup files, keeping only the most recent ones.
 * 
 * @param {string} fileName - Base filename to clean up backups for
 * @returns {Promise<void>}
 * @throws {Error} If cleanup fails due to file system errors
 * @private
 * @example
 * await cleanupOldBackups('example.test.js');
 */
async function cleanupOldBackups(fileName) {
  try {
    // Get all backup files for this file
    const files = await fsPromises.readdir(BACKUP_DIR);
    const fileBackups = [];
    
    // Get file stats for each backup
    for (const file of files) {
      if (file.endsWith(`_${fileName}.bak`)) {
        const filePath = join(BACKUP_DIR, file);
        const stats = await fsPromises.stat(filePath);
        fileBackups.push({
          name: file,
          path: filePath,
          time: stats.mtime.getTime()
        });
      }
    }

    // Sort by time (newest first)
    fileBackups.sort((a, b) => b.time - a.time);

    // Remove old backups if we have more than MAX_BACKUPS
    if (fileBackups.length > MAX_BACKUPS) {
      const backupsToDelete = fileBackups.slice(MAX_BACKUPS);
      await Promise.all(
        backupsToDelete.map(backup => 
          fsPromises.unlink(backup.path).catch(error => 
            console.warn(`Warning: Failed to delete old backup ${backup.path}:`, error.message)
          )
        )
      );
    }
  } catch (error) {
    if (error.code !== 'ENOENT') { // Ignore if backup directory doesn't exist
      console.error('Error cleaning up old backups:', error);
      throw error;
    }
  }
}

/**
 * Removes the backup directory if it's empty.
 * @returns {Promise<void>}
 * @private
 * @throws {Error} If directory removal fails for reasons other than not existing
 */
async function cleanupBackupDir() {
  try {
    // Check if directory exists and is empty
    const files = await fsPromises.readdir(BACKUP_DIR);
    
    if (files.length === 0) {
      console.log('Removing empty backup directory...');
      await fsPromises.rmdir(BACKUP_DIR, { recursive: true });
      console.log('✓ Backup directory removed');
    } else {
      console.log(`Backup directory not empty (${files.length} files remaining), skipping removal`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Directory doesn't exist, which is fine
      return;
    }
    
    // Only log the error if it's not a "directory not empty" error
    if (error.code !== 'ENOTEMPTY') {
      console.error('Error cleaning up backup directory:', error);
      throw error;
    }
    
    console.warn('Could not remove backup directory: directory not empty');
  }
}

/**
 * Restores all modified files from their backups.
 * 
 * @typedef {Object} RestoreResult
 * @property {boolean} success - Whether all files were restored successfully
 * @property {string[]} restored - Array of successfully restored file paths
 * @property {Array<{file: string, error: Error}>} failed - Array of failed restorations with errors
 * 
 * @returns {Promise<RestoreResult>} Result of the restore operation
 * @throws {Error} If a critical error occurs during restore
 * @example
 * const result = await restoreFromBackup();
 * if (!result.success) {
 *   console.error('Failed to restore some files:', result.failed);
 * }
 */
async function restoreFromBackup() {
  const result = {
    success: true,
    restored: [],
    failed: []
  };

  if (modifiedFiles.length === 0) {
    console.log('No files to restore');
    return result;
  }

  console.log(`Attempting to restore ${modifiedFiles.length} files from backup...`);

  // Process backups in reverse order (most recent first)
  for (let i = modifiedFiles.length - 1; i >= 0; i--) {
    const { original, backup } = modifiedFiles[i];
    try {
      // Verify backup exists and is readable
      await fsPromises.access(backup, fsPromises.constants.R_OK);
      
      // Restore the file
      await fsPromises.copyFile(backup, original);
      await fsPromises.access(original, fsPromises.constants.R_OK);
      
      // Remove the backup
      await fsPromises.unlink(backup);
      
      result.restored.push(original);
      console.log(`✓ Restored ${original}`);
    } catch (error) {
      result.success = false;
      const errorMsg = `Failed to restore ${original} from backup: ${error.message}`;
      result.failed.push({
        file: original,
        error: new Error(errorMsg, { cause: error })
      });
      console.error(`✗ ${errorMsg}`);
    }
  }

  // Clear the modified files list
  modifiedFiles = [];

  // Clean up backup directory if empty
  try {
    await cleanupBackupDir();
  } catch (error) {
    console.warn('Warning: Failed to clean up backup directory:', error.message);
  }

  // Log summary
  console.log(`\nRestore operation completed:`);
  console.log(`- Successfully restored: ${result.restored.length} files`);
  console.log(`- Failed to restore: ${result.failed.length} files`);
  
  if (result.failed.length > 0) {
    console.warn('\nThe following files could not be restored:');
    result.failed.forEach(({ file, error }) => {
      console.warn(`- ${file}: ${error.message}`);
    });
  }

  return result;
}

/**
 * Documentation templates for different types of test files.
 * Each template includes a description and coverage details specific to the test type.
 * @type {Object.<string, {description: string, coverage: string[]}>}
 * @private
 */
const TEST_TEMPLATES = {
  unit: {
    description: 'Unit tests for individual functions or modules',
    coverage: [
      'Happy path scenarios',
      'Edge cases',
      'Error conditions',
      'Input validation',
      'Boundary conditions'
    ]
  },
  integration: {
    description: 'Integration tests for component interactions',
    coverage: [
      'Component communication',
      'Data flow between modules',
      'API integration',
      'Database operations',
      'External service integration'
    ]
  },
  e2e: {
    description: 'End-to-end tests for complete user flows',
    coverage: [
      'User journeys',
      'Critical paths',
      'Cross-browser compatibility',
      'Performance under load',
      'Accessibility checks'
    ]
  },
  performance: {
    description: 'Performance testing scenarios',
    coverage: [
      'Load testing',
      'Stress testing',
      'Memory usage',
      'Response times',
      'Concurrent users'
    ]
  },
  security: {
    description: 'Security testing scenarios',
    coverage: [
      'Authentication',
      'Authorization',
      'Input validation',
      'Data protection',
      'Security headers'
    ]
  },
  // Default template for unknown test types
  default: {
    description: 'Automated test cases',
    coverage: [
      'Core functionality',
      'Error handling',
      'Edge cases',
      'Integration points',
      'Performance considerations'
    ]
  }
};

/**
 * Determines the type of test based on the filename.
 * @param {string} filename - The name of the test file
 * @returns {keyof TEST_TEMPLATES} The test type (unit, integration, etc.)
 * Maps test file names to their corresponding test types.
 * This mapping determines which documentation template to use for each test file.
 * @type {Object.<string, 'validation'|'unit'|'integration'|'performance'|'security'>}
 * @private
 */
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
  'validation.test.js': 'validation'  // Note: Duplicate key, will be overwritten
};

/**
 * Generates a JSDoc header for a test file based on its type and content.
 * 
 * @param {string} filename - Path to the test file (e.g., 'test/example.test.js')
 * @returns {Promise<string>} Formatted JSDoc comment block as a string
 * @throws {Error} If the template cannot be generated
 * @example
 * const header = await generateHeader('test/example.test.js');
 * // Returns formatted JSDoc comment
 */
import { basename } from 'path';
import { TEST_TEMPLATES } from './test-templates.js';
import { determineTestType } from './test-utils.js';
import { fsPromises } from 'fs/promises';

async function generateHeader(filename) {
  try {
    const fileContent = await fsPromises.readFile(filename, 'utf8');
    const fileName = basename(filename);
    const testType = determineTestType(fileName);
    const template = TEST_TEMPLATES[testType] || TEST_TEMPLATES.default;
    
    // Extract test description from file content if possible
    let description = 'Test file for ' + fileName.replace(/\.test\.(js|mjs)$/, '');
    const describeMatch = fileContent.match(/describe\(['"`]([^'"`]+)['"`]/);
    if (describeMatch) {
      description = describeMatch[1];
    }
    
    // Generate coverage section
    const coverageList = template.coverage
      .map(item => ` *   - ${item}`)
      .join('\n');
    
    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `/**
 * @file ${fileName} - ${description}
 * @description ${template.description}
 * 
 * @testType ${testType}
 * @lastModified ${currentDate}
 * 
 * @testCoverage
${coverageList}
 * 
 * @requires mocha - Test framework
 * @requires chai - Assertion library
 * @requires sinon - For spies, stubs, and mocks
 * 
 * @see {@link https://mochajs.org/|Mocha Documentation}
 * @see {@link https://www.chaijs.com/|Chai Documentation}
 * @see {@link https://sinonjs.org/|Sinon Documentation}
 * 
 * @example
 * // Basic test structure
 * describe('${description}', () => {
 *   it('should pass', () => {
 *     expect(true).to.be.true;
 *   });
 * });
 */`;
  } catch (error) {
    const errorMsg = `Failed to generate header for ${filename}: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
}
/**
 * Updates the JSDoc header in a single test file while preserving the existing content.
 * 
 * @param {string} filePath - Absolute path to the test file to update
 * @param {number} index - Current file index (for progress tracking)
 * @param {number} total - Total number of files being processed
 * @returns {Promise<{success: boolean, filePath: string, error?: Error}>} Result object
 */
async function updateTestFile(filePath, index, total) {
  const progress = `[${index + 1}/${total}]`;
  
  try {
    // Validate path safety before any file operations
    if (!isPathSafe(filePath)) {
      throw new Error('Path traversal attempt blocked');
    }

    // Verify file exists and has proper permissions
    await fsPromises.access(filePath, fsPromises.constants.R_OK | fsPromises.constants.W_OK);
    
    // Create a backup before making any changes
    const backupPath = await createBackup(filePath);
    
    try {
      // Read the file content with explicit encoding
      const content = await fsPromises.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Find the end of the existing header comment (if any)
      let headerEnd = 0;
      if (lines[0].includes('/**')) {
        while (headerEnd < lines.length && !lines[headerEnd].includes('*/')) {
          headerEnd++;
        }
        if (headerEnd < lines.length) {
          headerEnd++; // Include the '*/' line if found
        }
      }
      
      // Generate a new header based on the file's content and type
      const newHeader = await generateHeader(filePath);
      
      // Preserve all content after the header (imports, test code, etc.)
      const restOfFile = lines.slice(headerEnd).join('\n');
      
      // Write the updated content with the new header
      await fsPromises.writeFile(filePath, newHeader + restOfFile, 'utf8');
      
      // Verify the file was written successfully
      await fsPromises.access(filePath, fsPromises.constants.R_OK);
      
      console.log(`${progress} ✓ Updated: ${filePath}`);
      return { success: true, filePath };
      
    } catch (processError) {
      // If we fail after creating the backup, attempt to restore the original file
      console.error(`${progress} ✗ Error processing ${filePath}:`, processError.message);
      try {
        await fsPromises.copyFile(backupPath, filePath);
        console.log(`${progress} ✓ Restored original: ${filePath}`);
      } catch (restoreError) {
        console.error(`${progress} ✗ Failed to restore ${filePath} from backup:`, restoreError.message);
      }
      return { 
        success: false, 
        filePath, 
        error: new Error(`Processing failed: ${processError.message}`, { cause: processError }) 
      };
    }
    
  } catch (error) {
    // Handle any unexpected errors during the update process
    const errorMsg = `✗ Error with ${filePath}: ${error.message}`;
    console.error(`${progress} ${errorMsg}`);
    return { 
      success: false, 
      filePath, 
      error: new Error(errorMsg, { cause: error }) 
    };
  }
}

/**
 * Validates that the test directory exists and is accessible
 * @param {string} dirPath - Path to the test directory
 * @throws {Error} If directory is not accessible
 */
async function validateTestDirectory(dirPath) {
  try {
    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }
    await access(dirPath, fs.constants.R_OK | fs.constants.X_OK);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Test directory not found: ${dirPath}`);
    }
    throw new Error(`Cannot access test directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Scans the test directory and updates all test files with proper JSDoc headers.
 * 
 * This function performs the following operations:
 * 1. Scans the test directory recursively for .test.js and .test.mjs files
 * 2. Creates backups of each file before modification
 * 3. Updates the JSDoc headers while preserving the rest of the file content
 * 4. Provides detailed progress and summary information
 * 5. Handles errors gracefully with proper cleanup
 * 
 * @returns {Promise<void>} Resolves when all files have been processed
 * @throws {Error} If the test directory cannot be accessed or a critical error occurs
 * @example
 * // Run the updater
 * updateAllTestFiles()
 *   .then(() => console.log('Update completed successfully'))
 *   .catch(err => console.error('Update failed:', err));
 */
async function updateAllTestFiles() {
  const startTime = process.hrtime();
  console.clear();
  console.log('='.repeat(80));
  console.log('📝 Test Documentation Updater'.padEnd(79) + '📝');
  console.log('='.repeat(80));
  
  try {
    // Ensure test directory exists and is accessible
    await fsPromises.access(TEST_DIR, fs.constants.R_OK);
    
    // Find all test files recursively
    const testFiles = [];
    /**
     * Recursively finds all test files in a directory
     * @param {string} dir - Directory to search in
     * @returns {Promise<void>}
     */
    const findTestFiles = async (dir) => {
      const entries = await fsPromises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await findTestFiles(fullPath);
        } else if (
          (entry.name.endsWith('.test.js') || entry.name.endsWith('.test.mjs')) &&
          !entry.name.includes('.backup.') // Skip backup files
        ) {
          testFiles.push(fullPath);
        }
      }
    };
    
    // Start the recursive search for test files
    await findTestFiles(TEST_DIR);
    
    if (testFiles.length === 0) {
      console.log('ℹ️  No test files found in the test directory.');
      return;
    }
    
    console.log(`🔍 Found ${testFiles.length} test files to process.`);
    console.log('='.repeat(80));
    
    // Process files in series to avoid potential file handle issues
    const results = [];
    for (let i = 0; i < testFiles.length; i++) {
      const result = await updateTestFile(testFiles[i], i, testFiles.length);
      results.push(result);
    }
    
    // Clean up old backups to prevent disk space issues
    await cleanupBackupDir();
    
    // Calculate and display summary statistics
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const elapsedTime = (seconds + nanoseconds / 1e9).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 Update Summary'.padEnd(79) + '📊');
    console.log('='.repeat(80));
    console.log(`✅ Successfully updated: ${successCount} files`);
    
    if (errorCount > 0) {
      console.log(`❌ Failed to update: ${errorCount} files`);
      results
        .filter(r => !r.success)
        .forEach((r, index) => {
          console.log(`  ${index + 1}. ${r.filePath}`);
          if (r.error) {
            console.log(`     ${r.error.message}`);
          }
        });
    }
    
    console.log(`⏱️  Total time: ${elapsedTime}s`);
    console.log('='.repeat(80));
    
    if (errorCount === 0) {
      console.log('\n✨ All files updated successfully!');
    } else {
      console.log(`\n⚠️  ${errorCount} files had issues during update.`);
    }
    
    console.log('\n' + '-'.repeat(80));
    console.log(`🏁 Completed in ${elapsedTime}s`);
    console.log(`💾 Backup location: ${BACKUP_DIR}`);
    console.log('='.repeat(80) + '\n');
    
    return {
      success: errorCount === 0,
      updated: successCount,
      failed: errorCount,
      errors: results.filter(r => !r.success).map(r => ({
        file: r.filePath,
        error: r.error ? r.error.message : 'Unknown error'
      }))
    };
    
  } catch (error) {
    console.error('\n❌ A critical error occurred:', error);
    
    try {
      console.log('\n🔄 Attempting to restore files from backup...');
      const restoreResult = await restoreFromBackup();
      
      if (restoreResult.success) {
        console.log('✅ All modified files have been restored from backup.');
      } else {
        console.log('⚠️  Some files could not be restored. Check the backup directory:');
        console.log(`   ${BACKUP_DIR}`);
      }
    } catch (restoreError) {
      console.error('❌ Critical: Failed during restore from backup:', restoreError);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    const result = await updateAllTestFiles();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Unhandled error in main execution:', error);
    process.exit(1);
  }
})();
