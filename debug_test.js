console.log('=== DEBUG TEST START ===');
console.log('Current directory:', process.cwd());

// Try to require Mocha
console.log('\n=== ATTEMPTING TO REQUIRE MOCHA ===');
try {
  const mocha = require('mocha');
  console.log('Mocha version:', mocha.version);
  console.log('Mocha constructor:', mocha.constructor.name);
} catch (error) {
  console.error('Error requiring Mocha:', error);
}

// Try to require Chai
console.log('\n=== ATTEMPTING TO REQUIRE CHAI ===');
try {
  const chai = require('chai');
  console.log('Chai version:', chai.version);
} catch (error) {
  console.error('Error requiring Chai:', error);
}

// List node_modules directory
console.log('\n=== NODE_MODULES CONTENTS ===');
try {
  const fs = require('fs');
  const path = require('path');
  const nodeModules = path.join(__dirname, 'node_modules');
  
  if (fs.existsSync(nodeModules)) {
    const files = fs.readdirSync(nodeModules);
    console.log(`Found ${files.length} items in node_modules`);
    console.log('First 20 items:', files.slice(0, 20).join(', '));
  } else {
    console.error('node_modules directory does not exist');
  }
} catch (error) {
  console.error('Error reading node_modules:', error);
}

console.log('\n=== DEBUG TEST COMPLETE ===');
