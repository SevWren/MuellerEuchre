const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Output file
const outputFile = path.join(__dirname, 'env_test_output.txt');
const output = [];

// Helper function to add output
function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  output.push(line);
  console.log(line);
}

// Test basic Node.js functionality
log('=== Node.js Environment Test ===');
log(`Node.js version: ${process.version}`);
log(`Platform: ${process.platform}`);
log(`Architecture: ${process.arch}`);
log(`Current directory: ${process.cwd()}`);
log(`__dirname: ${__dirname}`);

// Test file system access
log('\n=== File System Test ===');
try {
  const testFile = path.join(__dirname, 'test_fs.txt');
  fs.writeFileSync(testFile, 'Test content');
  const content = fs.readFileSync(testFile, 'utf8');
  fs.unlinkSync(testFile);
  log('File system access: SUCCESS');
} catch (error) {
  log(`File system access FAILED: ${error.message}`);
}

// Check package.json
log('\n=== package.json Check ===');
try {
  const pkgPath = path.join(__dirname, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  log(`Project: ${pkg.name} v${pkg.version}`);
  log(`Main file: ${pkg.main || 'Not specified'}`);
  log(`Scripts: ${Object.keys(pkg.scripts || {}).join(', ')}`);
} catch (error) {
  log(`Error reading package.json: ${error.message}`);
}

// Check node_modules
log('\n=== node_modules Check ===');
try {
  const nodeModules = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    const modules = fs.readdirSync(nodeModules);
    log(`Found ${modules.length} modules in node_modules`);
    
    // Check for specific modules
    const requiredModules = ['mocha', 'chai', 'sinon-chai'];
    requiredModules.forEach(mod => {
      const modPath = path.join(nodeModules, mod);
      const exists = fs.existsSync(modPath) ? 'FOUND' : 'NOT FOUND';
      log(`- ${mod}: ${exists}`);
    });
  } else {
    log('node_modules directory not found');
  }
} catch (error) {
  log(`Error checking node_modules: ${error.message}`);
}

// Test npm commands
log('\n=== npm Check ===');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  log(`npm version: ${npmVersion}`);
  
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  log(`Node.js version (from command): ${nodeVersion}`);
  
  const mochaVersion = execSync('npx mocha --version', { encoding: 'utf8' }).trim();
  log(`Mocha version: ${mochaVersion}`);
} catch (error) {
  log(`Error running commands: ${error.message}`);
}

// List test files
log('\n=== Test Files ===');
try {
  const testDir = path.join(__dirname, 'test');
  if (fs.existsSync(testDir)) {
    const testFiles = fs.readdirSync(testDir)
      .filter(file => file.endsWith('.test.js') || file.endsWith('.spec.js'));
    
    log(`Found ${testFiles.length} test files:`);
    testFiles.forEach((file, index) => {
      log(`${index + 1}. ${file}`);
    });
  } else {
    log('test directory not found');
  }
} catch (error) {
  log(`Error reading test directory: ${error.message}`);
}

// Save output to file
try {
  fs.writeFileSync(outputFile, output.join('\n'));
  log(`\n=== Test Complete ===`);
  log(`Output saved to: ${outputFile}`);
} catch (error) {
  log(`Error saving output: ${error.message}`);
}
