const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const path = require('path');
const roomService = require('./roomService');
const rateLimit = require('./rateLimit');

// Configuration
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Setup App
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Redis Client
const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    // Connect to Redis before starting server
    if (process.env.NODE_ENV !== 'test') {
        await redisClient.connect();
    }
})();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints ---

/**
 * POST /create-room
 * Body: { hostId: string, meta: object }
 * Returns: { code: string, expiresIn: number }
 */
app.post('/api/create-room', async (req, res) => {
    try {
        const { hostId, meta } = req.body;
        if (!hostId) return res.status(400).json({ error: 'hostId is required' });

        const result = await roomService.createRoom(redisClient, hostId, meta);
        
        if (!result) {
            return res.status(503).json({ error: 'Failed to generate unique room code. Please try again.' });
        }

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /join-room
 * Body: { code: string, userId: string }
 * Returns: { room: object }
 * Protected by Rate Limiter
 */
app.post('/api/join-room', rateLimit.check, async (req, res) => {
    try {
        const { code, userId } = req.body;
        if (!code || !userId) return res.status(400).json({ error: 'Code and userId are required' });

        const roomData = await roomService.getRoom(redisClient, code);

        if (!roomData) {
            return res.status(404).json({ error: 'Room not found or expired' });
        }

        res.json({ room: roomData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Socket.io Logic ---

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Host joins the room they created
    socket.on('host-create', (code) => {
        socket.join(code);
        console.log(`Host ${socket.id} joined room ${code}`);
    });

    // Participant joins with a code (after API validation)
    socket.on('join-with-code', async ({ code, user }) => {
        const roomData = await roomService.getRoom(redisClient, code);
        
        if (roomData) {
            socket.join(code);
            
            // Broadcast to everyone in the room (including host) that someone new joined
            io.to(code).emit('participant-joined', {
                socketId: socket.id,
                user: user
            });
            
            console.log(`User ${user.name} joined room ${code}`);
        } else {
            socket.emit('error', 'Room no longer exists');
        }
    });

    socket.on('leave-room', (code) => {
        socket.leave(code);
        io.to(code).emit('participant-left', { socketId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for testing
module.exports = { app, redisClient, server };