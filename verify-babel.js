// Test Babel configuration
console.log('=== Verifying Babel Configuration ===');

try {
  // Test modern JavaScript features
  const testObj = { a: 1, b: 2 };
  const { a, ...rest } = testObj;
  
  // Test class properties
  class TestClass {
    answer = 42;
    getAnswer() {
      return this.answer;
    }
  }
  
  const instance = new TestClass();
  if (instance.getAnswer() === 42) {
    console.log('✅ Babel class properties working');
  } else {
    throw new Error('Class properties not working');
  }
  
  // Test async/await
  (async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log('✅ Async/await working');
  })();
  
  console.log('\n✅ Babel configuration verified!');
} catch (error) {
  console.error('❌ Babel verification failed:', error);
  process.exit(1);
}
