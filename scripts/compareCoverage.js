import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const COVERAGE_DIR = path.join(process.cwd(), 'coverage');

// Ensure coverage directories exist
const dirs = ['original', 'new'].map(dir => path.join(COVERAGE_DIR, dir));
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Run coverage for original file using Windows path
console.log('Running coverage for original persistence tests...');
const originalResult = spawnSync('node', [
    './node_modules/c8/bin/c8.js',
    '--reporter=json',
    '--reporter=text',
    '--report-dir=' + path.join('coverage', 'original'),
    './node_modules/mocha/bin/mocha.js',
    '.\\test\\server\\persistence.unit.test.js'
], {
    shell: true,
    stdio: 'inherit',
    windowsHide: true
});

if (originalResult.error) {
    console.error('Error running original coverage:', originalResult.error);
    process.exit(1);
}

// Run coverage for new files using Windows path
console.log('\nRunning coverage for new persistence tests...');
const newResult = spawnSync('node', [
    './node_modules/c8/bin/c8.js',
    '--reporter=json',
    '--reporter=text',
    '--report-dir=' + path.join('coverage', 'new'),
    './node_modules/mocha/bin/mocha.js',
    '.\\test\\server\\persistence\\*.unit.test.js'
], {
    shell: true,
    stdio: 'inherit',
    windowsHide: true
});

if (newResult.error) {
    console.error('Error running new coverage:', newResult.error);
    process.exit(1);
}

// Compare coverage reports
try {
    const originalCoverage = JSON.parse(
        fs.readFileSync(path.join(COVERAGE_DIR, 'original', 'coverage-final.json'))
    );
    const newCoverage = JSON.parse(
        fs.readFileSync(path.join(COVERAGE_DIR, 'new', 'coverage-final.json'))
    );

    console.log('\nCoverage Comparison:');
    console.log('==================');

    // Compare statement coverage
    const compareStatements = (original, current) => {
        const originalTotal = Object.values(original).reduce((acc, file) => 
            acc + file.s.total, 0);
        const currentTotal = Object.values(current).reduce((acc, file) => 
            acc + file.s.total, 0);
        
        console.log(`Statements:`);
        console.log(`  Original: ${originalTotal}`);
        console.log(`  New: ${currentTotal}`);
        console.log(`  Diff: ${currentTotal - originalTotal}`);
    };

    // Compare branch coverage
    const compareBranches = (original, current) => {
        const originalTotal = Object.values(original).reduce((acc, file) => 
            acc + file.b.total, 0);
        const currentTotal = Object.values(current).reduce((acc, file) => 
            acc + file.b.total, 0);
        
        console.log(`\nBranches:`);
        console.log(`  Original: ${originalTotal}`);
        console.log(`  New: ${currentTotal}`);
        console.log(`  Diff: ${currentTotal - originalTotal}`);
    };

    compareStatements(originalCoverage, newCoverage);
    compareBranches(originalCoverage, newCoverage);

} catch (err) {
    console.error('Error comparing coverage:', err);
    process.exit(1);
}
