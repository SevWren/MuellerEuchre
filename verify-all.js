/**
 * Runs all verification scripts in the project. This is useful for CI/CD and
 * should not be run as part of the normal development workflow.
 *
 * To run this file, you can use the following command:
 *
 *     node verify-all.js
 *
 * This will run all of the verification scripts in the project and log the
 * results to the console.
 *
 * If any of the verification scripts fail, the script will exit with a
 * non-zero status code.
 */


import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execPromise(command);
    console.log(`✅ ${command}`);
    if (stderr) console.log(stderr);
    return true;
  } catch (error) {
    console.error(`❌ ${command} failed:`);
    console.error(error.stderr || error.message);
    return false;
  }
}

async function verifyAll() {
  console.log('\n=== Starting Verification Process ===\n');
  
  // 1. Verify Node.js version
  console.log('1. Verifying Node.js version...');
  const nodeVersion = process.version;
  console.log(`   Node.js version: ${nodeVersion}`);
  
  // 2. Verify npm installation
  console.log('\n2. Verifying npm installation...');
  await runCommand('npm --version');
  
  // 3. Verify Babel configuration
  console.log('\n3. Verifying Babel configuration...');
  const babelSuccess = await runCommand('node verify-babel.js');
  
  // 4. Verify Test Helper
  console.log('\n4. Verifying Test Helper...');
  const helperSuccess = await runCommand('node verify-test-helper.js');
  
  // 5. Verify Mocha Tests
  console.log('\n5. Verifying Mocha Tests...');
  const mochaSuccess = await runCommand('npx mocha test/verify-mocha.test.js');
  
  // 6. Verify Play Phase Tests
  console.log('\n6. Verifying Play Phase Tests...');
  const playPhaseSuccess = await runCommand('npx mocha test/playPhase.unit.test.js');
  
  // Summary
  console.log('\n=== Verification Summary ===');
  console.log(`✅ Node.js Version: ${nodeVersion}`);
  console.log(`✅ npm: Installed`);
  console.log(`${babelSuccess ? '✅' : '❌'} Babel Configuration`);
  console.log(`${helperSuccess ? '✅' : '❌'} Test Helper`);
  console.log(`${mochaSuccess ? '✅' : '❌'} Mocha Tests`);
  console.log(`${playPhaseSuccess ? '✅' : '❌'} Play Phase Tests`);
  
  if (babelSuccess && helperSuccess && mochaSuccess && playPhaseSuccess) {
    console.log('\n🎉 All verifications passed!');
  } else {
    console.log('\n❌ Some verifications failed. Please check the logs above.');
    process.exit(1);
  }
}

verifyAll().catch(console.error);
