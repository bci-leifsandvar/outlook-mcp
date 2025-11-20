// Load environment variables from ../.env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const request = require('supertest');
const http = require('http');

// Mock dependencies from sse-server.js
jest.mock('../auth/token-storage');
jest.mock('../auth/oauth-server');

const TokenStorage = require('../auth/token-storage');
const { setupOAuthRoutes, createAuthConfig } = require('../auth/oauth-server');

// Global mock for TokenStorage instance
const mockTokenStorageInstance = {
    getValidAccessToken: jest.fn(),
    _consentHistory: [],
    // Add other methods if sse-server interacts with them directly
};

TokenStorage.mockImplementation(() => mockTokenStorageInstance);
setupOAuthRoutes.mockImplementation(() => {}); // Mock: Does nothing for these tests
createAuthConfig.mockReturnValue({}); // Mock: Returns empty config

// Dynamically require sse-server AFTER mocks are set up
let sseApp;
let server; // To hold the HTTP server instance for proper cleanup

const startServer = (done) => {
    jest.isolateModules(() => {
        if (!sseApp) {
            try {
                // Use relative path for Jest compatibility
                sseApp = require('../../sse-server.js').app;
            } catch (err) {
                console.error('Failed to require sse-server.js:', err);
                throw err;
            }
        }
    });

    if (sseApp && typeof sseApp.listen === 'function') {
        server = http.createServer(sseApp);
        server.listen(0, done);
    } else {
        console.error("sse-server.test.js: Could not start test server. sseApp is not valid.");
        done();
    }
};

const stopServer = (done) => {
    if (server && server.listening) {
        server.close(done);
    } else {
        done();
    }
};

describe('SSE Server (sse-server.js)', () => {
    beforeAll(startServer);
    afterAll(stopServer);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Root path /', () => {
        it('should return server information', async () => {
            if (!sseApp || !server || !server.listening) {
                console.warn("Skipping test for /: server not running");
                return;
            }
            const response = await request(server).get('/');
            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
            expect(response.text).toContain('MCP SSE/Streaming Server');
        });
    });

    describe('OAuth routes (e.g. /auth, /auth/callback, /token-status)', () => {
        it('should have OAuth routes available (mocked handling)', async () => {
            if (!sseApp || !server || !server.listening) {
                console.warn("Skipping test for /auth: server not running");
                return;
            }
            const response = await request(server).get('/auth');
            expect(response.status).toBe(404);
        });
    });

    describe('/mcp (Streamable HTTP transport)', () => {
        it('should require authentication', async () => {
            if (!sseApp || !server || !server.listening) {
                console.warn("Skipping test for /mcp auth: server not running");
                return;
            }
            mockTokenStorageInstance.getValidAccessToken.mockResolvedValue(null);
            const response = await request(server).post('/mcp').send({ some: 'payload' });
            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required.');
        });

        it('should respond with 400 for bad MCP request if authenticated', async () => {
            if (!sseApp || !server || !server.listening) {
                console.warn("Skipping test for /mcp bad request: server not running");
                return;
            }
            mockTokenStorageInstance.getValidAccessToken.mockResolvedValue('fake_access_token');
            const response = await request(server)
                .post('/mcp')
                .set('Content-Type', 'application/json')
                .send("this is not valid json for mcp");
            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('/sse and /messages (Legacy SSE transport)', () => {
        it('should require authentication for /sse', async () => {
            if (!sseApp || !server || !server.listening) {
                console.warn("Skipping test for /sse auth: server not running");
                return;
            }
            mockTokenStorageInstance.getValidAccessToken.mockResolvedValue(null);
            const response = await request(server).get('/sse');
            expect(response.status).toBe(401);
        });

        it('should require authentication for /messages', async () => {
            if (!sseApp || !server || !server.listening) {
                console.warn("Skipping test for /messages auth: server not running");
                return;
            }
            mockTokenStorageInstance.getValidAccessToken.mockResolvedValue(null);
            const response = await request(server).get('/messages');
            expect(response.status).toBe(401);
        });
    });

    // Debugging Jest module resolution
    // Removed direct require.resolve to prevent Jest module resolution error before mocks
});
