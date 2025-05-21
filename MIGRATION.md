# Migration to Modular Structure

This document outlines the changes made to restructure the Euchre multiplayer game server from a single `server3.js` file to a modular architecture.

## New Project Structure

```text
src/
├── config/               # Configuration and constants
│   └── constants.js      # Game constants and enums
├── game/                 # Core game logic
│   ├── state.js          # Game state management
│   └── phases/           # Game phase handlers
├── public/               # Static files (HTML, CSS, client JS)
├── socket/               # Socket.IO handlers and middleware
├── test/                 # Test files
└── utils/                # Utility functions
    ├── deck.js          # Card and deck utilities
    ├── logger.js        # Logging utilities
    └── players.js       # Player-related utilities
```

## Key Changes

1. **Modular Code Organization**
   - Split the monolithic `server3.js` into logical modules
   - Each module has a single responsibility
   - Improved code organization and maintainability

2. **ES Modules**
   - Switched from CommonJS to ES modules
   - Added `"type": "module"` to package.json
   - Updated import/export syntax

3. **Dependency Management**
   - Added `nodemon` for development
   - Updated test scripts to support ES modules
   - Added `--experimental-vm-modules` flag for Mocha

## Migration Steps

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Update Environment**
   - Ensure you're using Node.js 14+ (recommended: LTS version)
   - Install nodemon globally if needed: `npm install -g nodemon`

3. **Running the Server**
   - Development: `npm run dev` (with hot-reload)
   - Production: `npm start`

4. **Running Tests**
   - Run all tests: `npm test`
   - Run tests in watch mode: `npm run test:watch`

## Next Steps

1. **Complete the Migration**
   - Move remaining game logic from `server3.js` to appropriate modules
   - Update client-side code to work with the new server structure
   - Add more unit tests for the new modules

2. **Documentation**

   - Update README.md with new setup instructions
   - Add JSDoc comments to all functions and modules
   - Document the API endpoints and socket events

3. **Testing**
   - Add integration tests
   - Set up CI/CD pipeline
   - Add end-to-end tests

## Known Issues

- Some game logic still needs to be migrated from the old `server3.js`
- Client-side code needs updates to work with the new server structure
- Test coverage needs improvement

## Rollback Plan

If you need to revert to the old structure:

1. Check out the commit before the migration
2. Restore the original `server3.js`
3. Revert package.json changes
4. Remove the new directories if needed

## Contributing

When making changes, please follow these guidelines:

1. Keep modules focused and single-purpose
2. Write tests for new functionality
3. Document public APIs with JSDoc
4. Follow the existing code style
5. Update documentation when making changes
