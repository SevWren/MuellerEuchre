/**
 * @file createTestDirs.js - Creates test directory structure
 * @description Creates the necessary test directory structure for the project
 */

const fs = require('fs');
const path = require('path');

// Define directories to create
const testDirs = [
    path.join('test', '__mocks__', 'services'),
    path.join('test', '__fixtures__'),
    path.join('test', 'utils')
];

// Create each directory
console.log('Creating test directory structure...');
console.log('Current working directory:', process.cwd());

let success = true;

for (const dir of testDirs) {
    try {
        const fullPath = path.resolve(dir);
        console.log(`\nProcessing: ${fullPath}`);
        
        if (fs.existsSync(fullPath)) {
            console.log(`✓ Directory already exists: ${fullPath}`);
            continue;
        }
        
        console.log(`Creating directory: ${fullPath}`);
        fs.mkdirSync(fullPath, { recursive: true });
        
        if (fs.existsSync(fullPath)) {
            console.log(`✓ Successfully created: ${fullPath}`);
        } else {
            console.error(`✗ Failed to create: ${fullPath}`);
            success = false;
        }
    } catch (error) {
        console.error(`✗ Error creating directory ${dir}:`, error.message);
        success = false;
    }
}

if (success) {
    console.log('\n✅ Test directory structure created successfully!');
    process.exit(0);
} else {
    console.error('\n❌ Some directories could not be created. See errors above.');
    process.exit(1);
}
