# Connection Status Component

A reusable React component that displays the current connection status and quality metrics for a WebSocket connection.

## Features

- Real-time connection status display (connected/disconnected/reconnecting)
- Connection quality metrics (latency, jitter)
- Visual indicators for connection quality
- Responsive design that works on all screen sizes
- Smooth animations for state transitions
- Automatic hiding when connection is stable

## Installation

1. Ensure you have the required dependencies:
   - React (or Preact)
   - Socket.IO client

2. Import the component:

```jsx
import ConnectionStatus from './path/to/ConnectionStatus';
```

## Usage

### Basic Usage

```jsx
import { h } from 'preact';
import ConnectionStatus from './components/ConnectionStatus/ConnectionStatus';

function App() {
  return (
    <div className="app">
      {/* Your app content */}
      <ConnectionStatus />
    </div>
  );
}

export default App;
```

### Props

The component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | string | `''` | Additional CSS class names |
| `showOnHover` | boolean | `false` | Show detailed info only on hover |
| `position` | string | `'bottom-right'` | Position of the status indicator ('top-left', 'top-right', 'bottom-left', 'bottom-right') |

## Styling

You can customize the appearance by overriding the following CSS variables in your app's styles:

```css
:root {
  --connection-status-bg: rgba(255, 255, 255, 0.95);
  --connection-status-border: #ccc;
  --connection-status-text: #333;
  --connection-status-connected: #4caf50;
  --connection-status-reconnecting: #ff9800;
  --connection-status-disconnected: #f44336;
  --connection-status-error: #f44336;
}
```

## Integration with Socket.IO

The component works seamlessly with the `useSocket` hook and `socketService` to provide real-time connection status and quality metrics.

## Accessibility

- Uses semantic HTML elements
- Includes ARIA attributes for screen readers
- Keyboard navigable
- High contrast mode support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 12+)
- Chrome for Android

## License

MIT
