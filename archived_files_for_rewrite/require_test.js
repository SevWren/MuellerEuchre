// Simple module require test
console.log('=== Module Require Test ===');

try {
  console.log('Requiring chai...');
  const chai = require('chai');
  console.log(`Chai version: ${chai.version}`);
  
  console.log('\nRequiring sinon-chai...');
  const sinonChai = require('sinon-chai');
  console.log('sinon-chai loaded successfully');
  
  console.log('\n=== Test Passed ===');
} catch (error) {
  console.error('\n=== Test Failed ===');
  console.error(error.stack || error.message);
  process.exit(1);
}
