const express = require('express');
const { setupOAuthRoutes } = require('./auth/oauth-server');
const TokenStorage = require('./auth/token-storage');

const app = express();
const tokenStorage = new TokenStorage();

// Middleware to ensure authentication
app.use(async (req, res, next) => {
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
});

// Root route
app.get('/', (req, res) => {
  res.status(200).send('MCP SSE/Streaming Server');
});

// OAuth routes
setupOAuthRoutes(app, tokenStorage);

// SSE route
app.get('/sse', (req, res) => {
  res.status(200).send('SSE endpoint');
});

// Messages route
app.get('/messages', (req, res) => {
  res.status(200).send('Messages endpoint');
});

module.exports = { app };