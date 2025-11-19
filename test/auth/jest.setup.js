// Ensure environment variables from .env are loaded
require('dotenv').config();

// Validate required environment variables
if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    throw new Error('Missing OUTLOOK_CLIENT_ID or OUTLOOK_CLIENT_SECRET in environment variables.');
}

// Jest setup file to ensure MCP_TOKEN_KEY is set for all tests
process.env.MCP_TOKEN_KEY = process.env.MCP_TOKEN_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Optionally, mock encryption for unit tests
jest.mock('../../utils/crypto', () => ({
  encrypt: (text) => `mock_encrypted:${text}`,
  decrypt: (data) => data.replace(/^mock_encrypted:/, '')
}));
