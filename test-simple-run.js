// Simple test runner
console.log('=== Starting Simple Test Runner ===');

const { spawn } = require('child_process');
const path = require('path');

const testFile = path.join(__dirname, 'test', 'sanity.test.js');
const mochaPath = path.join(__dirname, 'node_modules', '.bin', 'mocha');

console.log(`Running: node ${mochaPath} ${testFile}`);

const mocha = spawn('node', [mochaPath, testFile], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    FORCE_COLOR: '1',
  },
});

mocha.on('error', (error) => {
  console.error('Error executing Mocha:', error);
  process.exit(1);
});

mocha.on('close', (code) => {
  console.log(`Mocha process exited with code ${code}`);
  process.exit(code);
});
