const request = require('supertest');
const { app, server } = require('../server'); // Import express app
const roomService = require('../roomService');

// Mock Redis Client
const mockRedis = {
    connect: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    on: jest.fn()
};

jest.mock('redis', () => ({
    createClient: () => mockRedis
}));

describe('Room Service & API', () => {
    
    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('generateCode creates 5-char alphanumeric string', () => {
        const code = roomService.generateCode();
        expect(code).toMatch(/^[A-Z0-9]{5}$/);
    });

    test('POST /create-room success', async () => {
        // Mock Redis SET to return OK (success)
        mockRedis.set.mockResolvedValue('OK');

        const res = await request(app)
            .post('/api/create-room')
            .send({ hostId: 'test-host' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('code');
        expect(res.body.code.length).toBe(5);
        expect(mockRedis.set).toHaveBeenCalledTimes(1);
    });

    test('POST /create-room handles collision and retries', async () => {
        // Mock Redis SET to return null first (collision), then OK
        mockRedis.set
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce('OK');

        const res = await request(app)
            .post('/api/create-room')
            .send({ hostId: 'test-host' });

        expect(res.statusCode).toBe(200);
        expect(mockRedis.set).toHaveBeenCalledTimes(2); // Retried once
    });

    test('POST /join-room success', async () => {
        const mockRoom = JSON.stringify({ hostId: 'h1', participants: [] });
        mockRedis.get.mockResolvedValue(mockRoom);

        const res = await request(app)
            .post('/api/join-room')
            .send({ code: 'ABC12', userId: 'u1' });

        expect(res.statusCode).toBe(200);
        expect(res.body.room.hostId).toBe('h1');
    });

    test('POST /join-room not found', async () => {
        mockRedis.get.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/join-room')
            .send({ code: 'INVALID', userId: 'u1' });

        expect(res.statusCode).toBe(404);
    });
});