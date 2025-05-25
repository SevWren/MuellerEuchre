# Windsurf MCP Server Implementation

This document outlines how to implement MCP (Model Context Protocol) servers for the Windsurf code editor to enhance the Euchre Multiplayer development experience.

## Table of Contents
1. [Game State Management MCP](#game-state-management-mcp)
   - [Server Implementation](#game-state-server)
   - [API Methods](#game-state-methods)
   - [Usage Examples](#game-state-examples)

2. [Chat & Communication MCP](#chat-communication-mcp)
   - [Server Implementation](#chat-server)
   - [API Methods](#chat-methods)
   - [Usage Examples](#chat-examples)

## Game State Management MCP

### Server Implementation

Create a new file `mcp/game-state-server.js`:

```javascript
const { MCPServer } = require('@windsurf/mcp');

class GameStateMCPServer extends MCPServer {
  constructor() {
    super('euchre-game-state');
    this.gameStates = new Map();
  }

  async getGameState({ gameId }) {
    return this.gameStates.get(gameId) || null;
  }

  async updateGameState({ gameId, state }) {
    this.gameStates.set(gameId, state);
    this.emit('gameStateChanged', { gameId, state });
    return { success: true };
  }

  async validateMove({ gameId, playerId, move }) {
    const game = this.gameStates.get(gameId);
    // Add game-specific validation logic here
    return { valid: true };
  }
}

// Start the server
const server = new GameStateMCPServer();
server.start();
```

### API Methods

#### `getGameState`
- **Description**: Retrieve the current game state
- **Parameters**: `{ gameId: string }`
- **Returns**: `Promise<GameState>`

#### `updateGameState`
- **Description**: Update the game state
- **Parameters**: `{ gameId: string, state: GameState }`
- **Returns**: `Promise<{ success: boolean }>`

#### `validateMove`
- **Description**: Validate a player's move
- **Parameters**: `{ gameId: string, playerId: string, move: any }`
- **Returns**: `Promise<{ valid: boolean, error?: string }>`

### Usage Examples

#### Subscribing to Game State Changes
```javascript
const gameStateServer = new MCPServer('euchre-game-state');
gameStateServer.on('gameStateChanged', ({ gameId, state }) => {
  console.log(`Game ${gameId} state updated:`, state);
});
```

#### Getting Current Game State
```javascript
const state = await gameStateServer.getGameState({ gameId: 'game123' });
```

## Chat & Communication MCP

### Server Implementation

Create a new file `mcp/chat-server.js`:

```javascript
const { MCPServer } = require('@windsurf/mcp');

class ChatMCPServer extends MCPServer {
  constructor() {
    super('euchre-chat');
    this.messages = new Map(); // gameId -> Message[]
  }


  async sendMessage({ gameId, playerId, content }) {
    const message = {
      id: Date.now().toString(),
      playerId,
      content,
      timestamp: new Date().toISOString(),
    };

    if (!this.messages.has(gameId)) {
      this.messages.set(gameId, []);
    }

    this.messages.get(gameId).push(message);
    this.emit('newMessage', { gameId, message });
    return { success: true, messageId: message.id };
  }

  async getMessages({ gameId, since = 0 }) {
    const messages = this.messages.get(gameId) || [];
    return messages.filter(msg => new Date(msg.timestamp) >= new Date(since));
  }
}

// Start the server
const server = new ChatMCPServer();
server.start();
```

### API Methods

#### `sendMessage`
- **Description**: Send a chat message
- **Parameters**: `{ gameId: string, playerId: string, content: string }`
- **Returns**: `Promise<{ success: boolean, messageId: string }>`

#### `getMessages`
- **Description**: Get chat messages
- **Parameters**: `{ gameId: string, since?: number }`
- **Returns**: `Promise<Message[]>`

### Usage Examples

#### Sending a Message
```javascript
const chatServer = new MCPServer('euchre-chat');
await chatServer.sendMessage({
  gameId: 'game123',
  playerId: 'player1',
  content: 'Hello, world!'
});
```

#### Receiving Messages
```javascript
chatServer.on('newMessage', ({ gameId, message }) => {
  console.log(`New message in ${gameId}:`, message);
});
```

## Integration with Windsurf

1. Add the MCP server to your Windsurf configuration:

```json
// .windsurf/config.json
{
  "mcpServers": [
    {
      "name": "euchre-game-state",
      "command": "node mcp/game-state-server.js"
    },
    {
      "name": "euchre-chat",
      "command": "node mcp/chat-server.js"
    }
  ]
}
```

2. Use the MCP client in your code:

```javascript
const { MCPClient } = require('@windsurf/mcp');

// Connect to the game state server
const gameState = new MCPClient('euchre-game-state');

// Connect to the chat server
const chat = new MCPClient('euchre-chat');
```

## Testing

1. Start the MCP servers:
```bash
node mcp/game-state-server.js &
node mcp/chat-server.js &
```

2. Use the Windsurf MCP CLI to test:
```bash
# List available MCP servers
windsurf mcp list

# Call a method
windsurf mcp call euchre-game-state getGameState '{"gameId":"test"}'
```

## Best Practices

1. **Error Handling**: Always handle MCP server connection errors
2. **Type Safety**: Use TypeScript for better type checking
3. **Logging**: Implement proper logging for debugging
4. **Security**: Validate all inputs and implement rate limiting
5. **Documentation**: Keep method documentation up to date
