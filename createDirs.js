const fs = require('fs');
const path = require('path');

const dirs = [
  'test/__mocks__/services',
  'test/__fixtures__',
  'test/utils'
];

console.log('Creating directories...');

let success = true;

for (const dir of dirs) {
  try {
    const fullPath = path.join(process.cwd(), ...dir.split('/'));
    console.log(`Creating: ${fullPath}`);
    
    if (!fs.existsSync(path.dirname(fullPath))) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    }
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath);
      console.log(`✓ Created: ${fullPath}`);
    } else {
      console.log(`✓ Exists: ${fullPath}`);
    }
  } catch (error) {
    console.error(`✗ Error creating ${dir}:`, error.message);
    success = false;
  }
}

if (success) {
  console.log('\n✅ All directories created successfully!');
} else {
  console.log('\n⚠️ Some directories may not have been created. See errors above.');
}

// Keep the console open for 5 seconds
setTimeout(() => {}, 5000);
