# Euchre Multiplayer - LLM System Instructions

## Project Overview
You are an AI assistant working on the Euchre Multiplayer project, an online implementation of the classic Euchre card game. The application features real-time multiplayer gameplay, game state management, and a client-server architecture using WebSockets.

## Codebase Structure

### Server-Side
- `server.js`: Main Express server setup and WebSocket initialization
- `src/game/`: Core game logic and state management
  - `state.js`: Game state management
  - `phases/`: Game phase implementations (bidding, playing, scoring)
  - `logic/`: Core game rules and validation
- `src/socket/`: WebSocket communication
  - `index.js`: Socket.IO configuration and event handling
  - `handlers/`: Event handlers for game actions
  - `middleware/`: Authentication and error handling middleware

### Client-Side
- `src/client/services/`: Client-side services
  - `socketService.js`: WebSocket communication with the server
  - `stateSyncService.js`: State synchronization with the server
  - `uiIntegrationService.js`: UI updates based on game state

## Development Guidelines

### Code Style
- Use ES6+ JavaScript features
- Follow consistent naming conventions (camelCase for variables/functions, PascalCase for classes)
- Use JSDoc for function documentation
- Keep functions focused and single-responsibility

### State Management
- Game state is the single source of truth
- All state mutations should go through the appropriate state management functions
- Keep client and server state in sync through WebSocket events

### Error Handling
- Use the centralized logger for all error reporting
- Implement proper error boundaries in the UI
- Validate all inputs on both client and server

### Testing
- Write unit tests for all game logic
- Include integration tests for WebSocket communication
- Test edge cases in game rules

## Common Tasks

### Adding New Game Features
1. Update the game state structure if needed
2. Implement the server-side logic
3. Add WebSocket event handlers
4. Update the client-side state management
5. Add UI components and integration

### Debugging
1. Check server logs for errors
2. Verify WebSocket connection status
3. Validate game state at each step
4. Use the debug logging levels appropriately

## Best Practices

### Performance
- Minimize state updates
- Batch WebSocket messages when possible
- Optimize rendering of game components

### Security
- Validate all inputs on the server
- Implement proper authentication
- Use secure WebSocket connections (WSS) in production

### Documentation
- Keep JSDoc comments up to date
- Document complex game logic
- Maintain API documentation for WebSocket events

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test/file.test.js

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues
1. **WebSocket Connection Issues**
   - Verify the server is running
   - Check for CORS or firewall issues
   - Verify the WebSocket URL is correct

2. **State Sync Problems**
   - Check for conflicting state updates
   - Verify event handlers are properly registered
   - Check for race conditions in state updates

3. **Game Logic Bugs**
   - Add detailed logging
   - Write test cases to reproduce the issue
   - Validate game state at each step

## Contributing

1. Create a new branch for your changes
2. Write tests for new features
3. Update documentation as needed
4. Submit a pull request with a clear description of changes
