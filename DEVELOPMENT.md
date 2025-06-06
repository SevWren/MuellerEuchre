# Development Guide

This document provides comprehensive documentation for the Euchre Multiplayer project, including setup instructions, development workflows, and best practices.

## Project Setup

### Environment Configuration
- **Node.js**: Version specified in `.nvmrc`
  ```bash
  nvm use  # If using nvm
  node --version  # Verify version
  ```
- **Environment Variables**: Copy `.env.example` to `.env`
  ```bash
  cp .env.example .env
  ```
- **Dependencies**: Install packages
  ```bash
  npm install
  ```

### Development Tools
- **EditorConfig**: Consistent coding styles (`.editorconfig`)
- **ESLint/Prettier**: Code quality and formatting
- **Husky**: Git hooks for pre-commit checks

## Testing Framework

### Mocha Configuration (`.mocharc.json` / `.mocharc.cjs`)
- Test timeout: 10 seconds
- Spec reporter for clear output
- ESM module support enabled
- Test file extensions: `.js` and `.mjs`
- Test setup file: `test/setup.js`
- Test loader: `test/loader.mjs`
- Excludes: `archived` and `server3` test directories

### Test Scripts
- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:debug`: Debug tests with Node inspector
- `npm run test:coverage`: Generate test coverage report
- `npm run test:integration`: Run integration tests

### Test Environment (`test/setup.js`)
- Chai `expect` assertions
- Sinon for test doubles (spies, stubs, mocks)
- Global test timeout: 10 seconds
- Mock browser environment (window, document, localStorage)
- Base directory resolution
- Test environment variables

### Test Verification
- `verify-all.js`: Run all verification checks
- `verify-babel.js`: Verify Babel configuration
- `verify-env.js`: Check environment setup
- `verify-test-helper.js`: Test helper utilities
- `verify-setup.ps1`: PowerShell environment verification

## Project Structure

### Source Code Organization
```
src/
├── client/           # Frontend components and services
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # Client-side services (socket, state management)
│   └── utils/         # Utility functions
├── config/            # Application configuration
│   ├── constants.js   # Game constants and enums
│   └── database.js    # Database configuration
├── db/                # Database layer
│   └── gameRepository.js  # Game data access
├── game/              # Core game logic
│   ├── logic/         # Game mechanics
│   └── phases/        # Game phase implementations
├── public/            # Static assets
└── test/              # Test files
```

### Server Implementation
- `server3.js` / `server3.mjs`
  - Main server entry point
  - Handles WebSocket communication
  - Manages game state and player connections
  - Uses environment variables for configuration

## Code Quality

### Linting & Formatting
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **EditorConfig**: Consistent editor settings
- **Pre-commit Hooks**: Automated checks before commit

### Testing Standards
- **Unit Tests**: Core logic and utilities
- **Integration Tests**: Component interactions
- **E2E Tests**: Critical user flows
- **Coverage Requirements**:
  - 80% statement coverage
  - 70% branch coverage
  - 100% critical path coverage

## Development Workflow

### NPM Scripts
- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Automatically fix linting issues
- `npm run prettier`: Format code with Prettier
- `npm run migrate`: Run database migrations
- `npm run init:modules`: Initialize project modules

### Debugging

#### Node.js Debugging
```bash
# Start Node.js in inspect mode
node --inspect-brk node_modules/.bin/mocha

# Or use the debug script
npm run test:debug
```

#### Browser Debugging
1. Open Chrome DevTools
2. Navigate to `chrome://inspect`
3. Click "Open dedicated DevTools for Node"

## Troubleshooting

### Common Issues
- **Tests not running**: Ensure all dependencies are installed and Node.js version matches `.nvmrc`
- **Module not found**: Check import paths and file extensions
- **Test timeouts**: Increase timeout in `.mocharc.json` or using `this.timeout()` in test files
- **Debug logging**: Enable debug output with `DEBUG=*`
  ```bash
  DEBUG=* npm test
  ```

### Getting Help
- Check the project's issue tracker
- Review the documentation
- Consult test cases in `test/` directory
- Check coverage reports in `coverage/`
- Review CI/CD pipeline logs

## Code Quality

### Linting
- `.markdownlint.json`
  - Rules for Markdown documentation
  - Ensures consistent formatting

### Git Hooks
- `.husky/`
  - Pre-commit hooks
  - Pre-push hooks
  - Custom git hooks

## Project Structure

### Source Code Organization
- `src/`
  - `client/`: Frontend components and services
    - `components/`: Reusable UI components
    - `hooks/`: Custom React hooks
    - `services/`: Client-side services (socket, state management)
    - `utils/`: Utility functions
  - `config/`: Application configuration
    - `constants.js`: Game constants and enums
    - `database.js`: Database configuration
  - `db/`: Database layer
    - `gameRepository.js`: Game data access layer
  - `game/`: Core game logic
    - `logic/`: Core game mechanics
    - `phases/`: Game phase implementations
  - `public/`: Static assets
  - `test/`: Test files

### Server Implementation
- `server3.js` / `server3.mjs`
  - Main server implementation
  - Handles WebSocket communication
  - Manages game state and player connections
  - `server3.mjs` is the ESM version (work in progress)
  - Uses environment variables for configuration (see `.env.example`)

### Public Assets
- `public/`
  - Static files served to clients
  - Client-side JavaScript
  - CSS and other assets

## Documentation

### Project Documentation
- `readme.md`: Main project documentation
- `DEVELOPMENT.md`: This development guide
- `*.md` files: Additional documentation

### API Documentation
- JSDoc comments in source files
- Generated documentation (if applicable)

## Deployment

### CI/CD
- `.github/workflows/`
  - GitHub Actions workflows for:
    - Automated testing on push/pull request
    - Deployment to production/staging
    - Code quality checks

### Environment Management
- `.env` file for local development (see `.env.example` for required variables)
- Environment-specific configurations
- Process manager (PM2/forever) configuration for production

## Performance Optimization

### Caching
- Implemented caching strategies for:
  - Game state
  - Player sessions
  - Frequently accessed data
  - Database query results

### Monitoring
- Logging system with different log levels
- Performance metrics collection
- Error tracking and reporting
- Test coverage reporting with c8
  - HTML and LCOV report generation
  - Coverage thresholds enforcement
  - Exclusion of test and node_modules directories

### Memory Management
- Proper cleanup of event listeners
- Timer management
- Garbage collection optimization
- Memory leak detection in tests

## Security Best Practices

### Input Validation
- All user inputs are validated
- Sanitization of user-provided data
- Protection against XSS and injection attacks

### Authentication
- Session management
- Secure token handling
- Role-based access control

## Documentation Standards

### Code Comments
- JSDoc for all functions and classes
- Inline comments for complex logic
- `TODO` and `FIXME` tags for future work

### API Documentation
- REST endpoints documentation
- WebSocket event documentation
- Request/response examples

## Migration and Updates

### Migration Scripts
- `migrate.js`: Database/state migration tool
- `update-tests.js`: Updates test file documentation
- `update-test-docs.js`: Updates test documentation headers
- `init-modules.js`: Initialize project modules

### Version Compatibility
- Check `.nvmrc` for required Node.js version
- Package version requirements in `package.json`
- Breaking changes documented in release notes

### Database Migrations
- Versioned migration files
- Rollback procedures
- Data migration strategies

## Development Workflow

### NPM Scripts
- `npm start`: Start the production server
- `npm run dev`: Start development server with nodemon
- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:debug`: Debug tests
- `npm run test:coverage`: Run tests with coverage
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Automatically fix linting issues
- `npm run prettier`: Format code with Prettier
- `npm run migrate`: Run database migrations
- `npm run init:modules`: Initialize project modules

## Troubleshooting

### Common Issues
- **Node.js Version Mismatch**: Ensure Node.js version matches `.nvmrc`
  ```bash
  nvm use
  ```
- **Missing Dependencies**: Reinstall packages if needed
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- **Environment Variables**: Verify `.env` setup
  ```bash
  cp .env.example .env
  # Edit .env with correct values
  ```
- **Test Failures**: Run with debug flag for more details
  ```bash
  DEBUG=* npm test
  ```

### Debugging

#### Node.js Debugging
```bash
# Start Node.js in inspect mode
node --inspect-brk node_modules/.bin/mocha

# Or use the debug script
npm run test:debug
```

#### Browser Debugging
- Open Chrome DevTools
- Go to chrome://inspect
- Click on "Open dedicated DevTools for Node"

### Getting Help
- Check the project's issue tracker
- Review the documentation
- Consult the codebase and test cases
- Check test coverage reports in `coverage/` directory
- Review CI/CD pipeline logs

## Code Quality

### Linting and Formatting
- ESLint for JavaScript/TypeScript
- Prettier for code formatting
- EditorConfig for consistent editor settings
- Pre-commit hooks for automated checks

### Testing Best Practices
- Unit tests for core logic
- Integration tests for component interactions
- End-to-end tests for critical user flows
- Test coverage requirements:
  - Minimum 80% statement coverage
  - Minimum 70% branch coverage
  - 100% critical path coverage
