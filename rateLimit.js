// Simple In-Memory Rate Limiter
// NOTE: For production scaling across multiple servers, store this state in Redis.

const attempts = new Map();

const WINDOW_MS = 60 * 1000; // 1 Minute
const MAX_ATTEMPTS = 10; // Max attempts per IP per window

const check = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    const record = attempts.get(ip);

    if (!record) {
        attempts.set(ip, { count: 1, startTime: now });
        return next();
    }

    // Check if window has passed
    if (now - record.startTime > WINDOW_MS) {
        attempts.set(ip, { count: 1, startTime: now });
        return next();
    }

    // Check count
    if (record.count >= MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Too many join attempts. Please try again later.' });
    }

    // Increment
    record.count++;
    return next();
};

module.exports = { check };
