const express = require('express');
const { setupOAuthRoutes } = require('./auth/oauth-server');
const TokenStorage = require('./auth/token-storage');

const app = express();
const tokenStorage = new TokenStorage();


// Auth middleware for protected routes only
const requireAuth = async (req, res, next) => {
  try {
    const token = await tokenStorage.getValidAccessToken();
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    req.accessToken = token;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Root route
app.get('/', (req, res) => {
  res.status(200).send('MCP SSE/Streaming Server');
});

// OAuth routes
setupOAuthRoutes(app, tokenStorage);


// Protected SSE route
app.get('/sse', requireAuth, (req, res) => {
  res.status(200).send('SSE endpoint');
});

// Protected Messages route
app.get('/messages', requireAuth, (req, res) => {
  res.status(200).send('Messages endpoint');
});

// Protected MCP route (POST)

// Custom JSON error handler for /mcp
const mcpJsonMiddleware = [
  express.json(),
  (err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid MCP request payload.' });
    }
    next(err);
  }
];

app.post('/mcp', requireAuth, ...mcpJsonMiddleware, (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid MCP request payload.' });
  }
  res.status(200).json({ message: 'MCP request received.' });
});

module.exports = { app };