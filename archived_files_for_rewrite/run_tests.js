const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'mocha_output.txt');
const outputStream = fs.createWriteStream(outputFile);

const mocha = spawn('npx', ['mocha', 'test/startNewHand.unit.test.js', '--reporter', 'spec'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

mocha.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  outputStream.write(str);
});

mocha.stderr.on('data', (data) => {
  const str = data.toString();
  process.stderr.write(str);
  outputStream.write(`ERROR: ${str}`);
});

mocha.on('close', (code) => {
  outputStream.write(`\nProcess exited with code ${code}\n`);
  outputStream.end();
  console.log(`\nTest output written to: ${outputFile}`);
  console.log(`Exit code: ${code}`);
});
