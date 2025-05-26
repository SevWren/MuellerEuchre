// Test script to verify package installation
console.log('Testing package installation...');

try {
  const chai = require('chai');
  const sinonChai = require('sinon-chai');
  
  console.log('Chai version:', chai.version);
  console.log('sinon-chai loaded successfully');
  console.log('Test completed successfully!');
} catch (error) {
  console.error('Error during test:', error);
  process.exit(1);
}
