# Node.js Meeting Room System

A "Meeting Room Code" system using Node.js, Express, Socket.io, and Redis.

## Prerequisites

1.  **Node.js** (v14+)
2.  **Redis** running on default port `6379`.

## Installation

```bash
npm install
```

## Running the App

1.  Start Redis Server.
2.  Start the backend:
    ```bash
    npm start
    ```
3.  Open browser to `http://localhost:3000`.

## Testing

Run unit tests (mocks Redis, so no running instance required for tests):
```bash
npm test
```

## Scaling Note

To scale this application across multiple servers/instances (e.g., using PM2 cluster mode or Kubernetes):

1.  **Socket.io Adapter**: You must use `@socket.io/redis-adapter`. This allows socket events to be broadcast across all server instances. Without this, a user connected to Server A won't see messages from a user on Server B in the same room.
    ```javascript
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = createClient({ url: 'redis://localhost:6379' });
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    ```

2.  **Rate Limiting**: The current `rateLimit.js` stores counts in local process memory (`Map`). In a cluster, limits would apply *per server*. Move this logic to Redis (increment keys with TTL) for a unified rate limiter.
