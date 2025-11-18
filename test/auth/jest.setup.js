// Jest setup file to ensure MCP_TOKEN_KEY is set for all tests
process.env.MCP_TOKEN_KEY = process.env.MCP_TOKEN_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Optionally, mock encryption for unit tests
jest.mock('../../utils/crypto', () => ({
  encrypt: (text) => `mock_encrypted:${text}`,
  decrypt: (data) => data.replace(/^mock_encrypted:/, '')
}));
