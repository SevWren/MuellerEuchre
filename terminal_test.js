console.log('This is a test of the external terminal');
console.error('This is an error message');
process.stdout.write('Standard output test\n');
process.stderr.write('Standard error test\n');

// Add a small delay to see the output
setTimeout(() => {
    console.log('Test completed successfully');
    process.exit(0);
}, 1000);
