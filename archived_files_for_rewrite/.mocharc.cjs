module.exports = {
  diff: true,
  extension: ['js'],
  package: './package.json',
  reporter: 'spec',
  timeout: 5000,
  ui: 'bdd',
  'watch-files': ['src/**/*.test.js'],
  'watch-ignore': ['node_modules', '.git'],
  recursive: true,
  require: ['esm', 'chai/register-expect.js']
};
