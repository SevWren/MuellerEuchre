console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'development');

// Test basic ES module import
import { fileURLToPath } from 'url';
import { dirname } from 'path';

console.log('ES Modules are working!');
