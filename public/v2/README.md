# Euchre Multiplayer - Modern Client

This is the modernized client implementation for the Euchre Multiplayer game. It features a responsive design, improved user experience, and better code organization compared to the original implementation.

## Features

- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Uses Socket.IO for real-time game state synchronization
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Modular Code**: Well-organized JavaScript with clear separation of concerns
- **Accessible**: Built with accessibility in mind

## Directory Structure

```
public/v2/
├── css/
│   └── styles.css       # All styles for the modern client
├── js/
│   └── socketHandler.js # Client-side socket handler
└── index.html           # Main HTML file
```

## Setup

1. Make sure the server is running
2. Open `http://localhost:3000/v2` in your browser

## Implementation Details

### Socket Events Handled

- `connect` / `disconnect`: Handle connection status
- `gameState`: Update the entire game UI
- `playerJoined` / `playerLeft`: Update player list and status
- `cardPlayed`: Update trick display
- `trickWon`: Update scores and clear trick
- `handStarted`: Reset for new hand
- `gameOver`: Show game over modal

### Key Components

- **SocketHandler**: Manages all socket communication
- **Game Board**: Responsive grid layout for 4 players
- **Card System**: Interactive card components
- **Bidding UI**: Intuitive controls for the bidding phase
- **Game Log**: Real-time game messages

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

To make changes to the client:

1. Edit the relevant files in the `public/v2` directory
2. Test changes in the browser
3. Commit changes with descriptive messages

## Testing

Manual testing should be performed for:
- Different screen sizes
- Various game scenarios (winning, losing, ties)
- Network interruptions
- Different browsers
