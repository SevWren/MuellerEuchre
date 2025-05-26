const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create a timestamp for the log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(__dirname, `diagnostic-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile);

// Helper function to write to both console and log file
function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  process.stdout.write(logMessage);
  logStream.write(logMessage);
}

// Run diagnostic tests
async function runDiagnostics() {
  try {
    log('=== Node.js Environment Diagnostics ===');
    
    // Basic Node.js info
    log(`\n=== Node.js Version ===`);
    log(`Node.js: ${process.version}`);
    log(`Platform: ${process.platform}`);
    log(`Architecture: ${process.arch}`);
    log(`Current directory: ${process.cwd()}`);
    
    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      log(`\n=== npm Version ===\nnpm: ${npmVersion}`);
    } catch (error) {
      log(`\n=== npm Check Failed ===\n${error.message}`);
    }
    
    // Check directory contents
    log('\n=== Directory Contents ===');
    try {
      const files = fs.readdirSync('.');
      files.forEach(file => {
        try {
          const stats = fs.statSync(file);
          log(`${stats.isDirectory() ? '[DIR] ' : '[FILE]'} ${file.padEnd(40)} ${stats.size} bytes`);
        } catch (e) {
          log(`[ERROR] ${file}: ${e.message}`);
        }
      });
    } catch (error) {
      log(`Error reading directory: ${error.message}`);
    }
    
    // Check package.json
    log('\n=== package.json ===');
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      log(`Name: ${pkg.name}`);
      log(`Version: ${pkg.version}`);
      log(`Dependencies: ${Object.keys(pkg.dependencies || {}).length}`);
      log(`Dev Dependencies: ${Object.keys(pkg.devDependencies || {}).length}`);
    } catch (error) {
      log(`Error reading package.json: ${error.message}`);
    }
    
    // Check node_modules
    log('\n=== node_modules Status ===');
    try {
      const nodeModulesExist = fs.existsSync('node_modules');
      log(`node_modules exists: ${nodeModulesExist}`);
      
      if (nodeModulesExist) {
        const modules = fs.readdirSync('node_modules');
        log(`Number of modules: ${modules.length}`);
        log('Top-level modules:');
        modules.slice(0, 20).forEach(mod => log(`  - ${mod}`));
        if (modules.length > 20) log(`  ... and ${modules.length - 20} more`);
      }
    } catch (error) {
      log(`Error checking node_modules: ${error.message}`);
    }
    
    // Check file system permissions
    log('\n=== File System Permissions ===');
    try {
      const testFile = 'permission_test.txt';
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      log('Write permission: OK');
    } catch (error) {
      log(`Write permission error: ${error.message}`);
    }
    
    // Check package installation
    log('\n=== Package Installation Check ===');
    const packages = ['chai', 'sinon-chai', 'mocha'];
    for (const pkg of packages) {
      try {
        const pkgPath = require.resolve(pkg);
        const pkgJson = require(path.join(pkgPath.split(pkg)[0], pkg, 'package.json'));
        log(`${pkg}: ${pkgJson.version} (${pkgPath})`);
      } catch (error) {
        log(`${pkg}: NOT FOUND (${error.message})`);
      }
    }
    
    log('\n=== Diagnostic Complete ===');
    log(`Log file saved to: ${logFile}`);
    
  } catch (error) {
    log(`\n=== FATAL ERROR ===\n${error.stack || error.message}`);
  } finally {
    logStream.end();
  }
}

// Run diagnostics
runDiagnostics();
