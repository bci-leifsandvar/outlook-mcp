const http = require('http');
const url = require('url');
const querystring = require('querystring');
const https = require('https');
const fs = require('fs');
const path = require('path');

function startAuthServer(port = 3333, silent = false) {
  const logger = require('../utils/logger');
  if (!silent) logger.info('Starting Outlook Authentication Server');

  // Authentication configuration
  const AUTH_CONFIG = {
    clientId: process.env.MS_CLIENT_ID || '', // Set your client ID as an environment variable
    clientSecret: process.env.MS_CLIENT_SECRET || '', // Set your client secret as an environment variable
    redirectUri: 'http://localhost:3333/auth/callback',
    scopes: [
      'offline_access',
      'User.Read',
      'Mail.Read',
      'Mail.Send',
      'Calendars.Read',
      'Calendars.ReadWrite',
      'Contacts.Read'
    ],
    tokenStorePath: path.join(process.env.HOME || process.env.USERPROFILE, '.outlook-mcp-tokens.json')
  };

  // Create HTTP server
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
  
    logger.debug('Auth server request received', { pathname });
  
    if (pathname === '/auth/callback') {
      const query = parsedUrl.query;
      // CSRF protection: check state token
      const cookies = (req.headers.cookie || '').split(';').reduce((acc, c) => {
        const [k, v] = c.split('=');
        if (k && v) acc[k.trim()] = decodeURIComponent(v.trim());
        return acc;
      }, {});
      if (!query.state || !cookies.oauth_state || query.state !== cookies.oauth_state) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end(`
        <html>
          <head><title>CSRF Protection</title></head>
          <body>
            <h1>CSRF Protection Error</h1>
            <p>State token mismatch. Please restart the authentication process.</p>
          </body>
        </html>
      `);
        return;
      }
      if (query.error) {
        logger.error(`Authentication error: ${query.error} - ${query.error_description}`);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
        <html>
          <head>
            <title>Authentication Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              h1 { color: #d9534f; }
              .error-box { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>Authentication Error</h1>
            <div class="error-box">
              <p><strong>Error:</strong> ${query.error}</p>
              <p><strong>Description:</strong> ${query.error_description || 'No description provided'}</p>
            </div>
            <p>Please close this window and try again.</p>
          </body>
        </html>
      `);
        return;
      }
    
      if (query.code) {
        logger.info('Authorization code received, exchanging for tokens...');
      
        // Exchange code for tokens
        exchangeCodeForTokens(query.code)
          .then((_tokens) => {
            logger.info('Token exchange successful');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
            <html>
              <head>
                <title>Authentication Successful</title>
                <style>
                  body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
                  h1 { color: #5cb85c; }
                  .success-box { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; }
                </style>
              </head>
              <body>
                <h1>Authentication Successful!</h1>
                <div class="success-box">
                  <p>You have successfully authenticated with Microsoft Graph API.</p>
                  <p>The access token has been saved securely.</p>
                </div>
                <p>You can now close this window and return to Claude.</p>
              </body>
            </html>
          `);
          })
          .catch((error) => {
            logger.error(`Token exchange error: ${error.message}`);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
            <html>
              <head>
                <title>Token Exchange Error</title>
                <style>
                  body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
                  h1 { color: #d9534f; }
                  .error-box { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; }
                </style>
              </head>
              <body>
                <h1>Token Exchange Error</h1>
                <div class="error-box">
                  <p>${error.message}</p>
                </div>
                <p>Please close this window and try again.</p>
              </body>
            </html>
          `);
          });
      } else {
        logger.error('No authorization code provided');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
        <html>
          <head>
            <title>Missing Authorization Code</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              h1 { color: #d9534f; }
              .error-box { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>Missing Authorization Code</h1>
            <div class="error-box">
              <p>No authorization code was provided in the callback.</p>
            </div>
            <p>Please close this window and try again.</p>
          </body>
        </html>
      `);
      }
    } else if (pathname === '/auth') {
    // Handle the /auth route - redirect to Microsoft's OAuth authorization endpoint
      logger.info('Auth request received, redirecting to Microsoft login...');
    
      // Verify credentials are set
      if (!AUTH_CONFIG.clientId || !AUTH_CONFIG.clientSecret) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
        <html>
          <head>
            <title>Configuration Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              h1 { color: #d9534f; }
              .error-box { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; }
              code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>Configuration Error</h1>
            <div class="error-box">
              <p>Microsoft Graph API credentials are not set. Please set the following environment variables:</p>
              <ul>
                <li><code>MS_CLIENT_ID</code></li>
                <li><code>MS_CLIENT_SECRET</code></li>
              </ul>
            </div>
          </body>
        </html>
      `);
        return;
      }
    
      // Get client_id from query parameters or use the default
      const query = parsedUrl.query;
      const clientId = query.client_id || AUTH_CONFIG.clientId;
    
      // Build the authorization URL
      // Generate a random state token for CSRF protection
      const crypto = require('crypto');
      const stateToken = crypto.randomBytes(16).toString('hex');
      const authParams = {
        client_id: clientId,
        response_type: 'code',
        redirect_uri: AUTH_CONFIG.redirectUri,
        scope: AUTH_CONFIG.scopes.join(' '),
        response_mode: 'query',
        state: stateToken
      };
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${querystring.stringify(authParams)}`;
      logger.info('Redirecting to Microsoft login', { authUrl });
      // Set state token in cookie
      res.writeHead(302, {
        'Location': authUrl,
        'Set-Cookie': `oauth_state=${encodeURIComponent(stateToken)}; HttpOnly; Path=/; Max-Age=600`
      });
      res.end();
    } else if (pathname === '/') {
    // Root path - provide instructions
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
      <html>
        <head>
          <title>Outlook Authentication Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #0078d4; }
            .info-box { background-color: #e7f6fd; border: 1px solid #b3e0ff; padding: 15px; border-radius: 4px; }
            code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Outlook Authentication Server</h1>
          <div class="info-box">
            <p>This server is running to handle Microsoft Graph API authentication callbacks.</p>
            <p>Don't navigate here directly. Instead, use the <code>authenticate</code> tool in Claude to start the authentication process.</p>
            <p>Make sure you've set the <code>MS_CLIENT_ID</code> and <code>MS_CLIENT_SECRET</code> environment variables.</p>
          </div>
          <p>Server is running at http://localhost:3333</p>
        </body>
      </html>
    `);
    } else {
    // Not found
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  function exchangeCodeForTokens(code) {
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify({
        client_id: AUTH_CONFIG.clientId,
        client_secret: AUTH_CONFIG.clientSecret,
        code: code,
        redirect_uri: AUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code',
        scope: AUTH_CONFIG.scopes.join(' ')
      });
    
      const options = {
        hostname: 'login.microsoftonline.com',
        path: '/common/oauth2/v2.0/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
    
      const req = https.request(options, (res) => {
        let data = '';
      
        res.on('data', (chunk) => {
          data += chunk;
        });
      
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const tokenResponse = JSON.parse(data);
            
              // Calculate expiration time (current time + expires_in seconds)
              const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
            
              // Add expires_at for easier expiration checking
              tokenResponse.expires_at = expiresAt;
            
              // Save tokens to file
              fs.writeFileSync(AUTH_CONFIG.tokenStorePath, JSON.stringify(tokenResponse, null, 2), 'utf8');
              logger.info('Tokens saved', { path: AUTH_CONFIG.tokenStorePath });
            
              resolve(tokenResponse);
            } catch (error) {
              reject(new Error(`Error parsing token response: ${error.message}`));
            }
          } else {
            reject(new Error(`Token exchange failed with status ${res.statusCode}: ${data}`));
          }
        });
      });
    
      req.on('error', (error) => {
        reject(error);
      });
    
      req.write(postData);
      req.end();
    });
  }

  // Start server
  server.listen(port, () => {
    if (!silent) {
      logger.info('Authentication server running', { url: `http://localhost:${port}` });
      logger.info('Waiting for authentication callback', { redirect: AUTH_CONFIG.redirectUri });
      logger.info('Token store path', { path: AUTH_CONFIG.tokenStorePath });
      if (!AUTH_CONFIG.clientId || !AUTH_CONFIG.clientSecret) {
        logger.warn('Microsoft Graph API credentials are not set. Set MS_CLIENT_ID and MS_CLIENT_SECRET env vars.');
      }
    }
  });

  // Handle termination
  process.on('SIGINT', () => {
    if (!silent) logger.info('Authentication server shutting down');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    if (!silent) logger.info('Authentication server shutting down');
    process.exit(0);
  });
  return server;
}

// If run directly, start the server
if (require.main === module) {
  startAuthServer();
}

module.exports = { startAuthServer };
