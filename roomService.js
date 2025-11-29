const crypto = require('crypto');

const CODE_LENGTH = 5;
const TTL_SECONDS = 3600; // 1 Hour
const MAX_RETRIES = 10;
// Ambiguous characters removed (I, 1, 0, O) to reduce confusion, though prompt requested alphanumeric
// We will use standard alphanumeric to strictly comply with "alphanumeric uppercase"
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
    let code = '';
    const bytes = crypto.randomBytes(CODE_LENGTH);
    for (let i = 0; i < CODE_LENGTH; i++) {
        const randomIndex = bytes[i] % ALPHABET.length;
        code += ALPHABET[randomIndex];
    }
    return code;
}

/**
 * Creates a room with a unique code.
 * Uses Redis SET NX to ensure atomicity.
 * Retries on collision.
 */
async function createRoom(redisClient, hostId, meta = {}) {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
        const code = generateCode();
        const key = `room:${code}`;
        
        const roomData = {
            hostId,
            createdAt: Date.now(),
            meta,
            participants: [] 
        };

        // ATOMIC OPERATION:
        // SET key value NX (Only set if Not Exists) EX (Expire seconds)
        const result = await redisClient.set(key, JSON.stringify(roomData), {
            NX: true,
            EX: TTL_SECONDS
        });

        if (result === 'OK') {
            return { code, expiresIn: TTL_SECONDS };
        }

        // Collision detected, retry
        retries++;
    }

    return null; // Failed to generate unique code after max retries
}

async function getRoom(redisClient, code) {
    // Normalize code to uppercase for case-insensitivity
    const normalizedCode = code.toUpperCase();
    const key = `room:${normalizedCode}`;
    
    const data = await redisClient.get(key);
    if (!data) return null;
    
    return JSON.parse(data);
}

module.exports = {
    createRoom,
    getRoom,
    generateCode
};
