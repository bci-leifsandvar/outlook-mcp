const logger = require('../utils/logger');
const fs = require('fs').promises;
const { encrypt, decrypt } = require('../utils/crypto');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

class TokenStorage {
  // Consent tracking methods
  async _loadConsentHistory() {
    try {
      const data = await require('fs').promises.readFile(this.config.consentStorePath, 'utf8');
      this._consentHistory = JSON.parse(data);
    } catch (err) {
      this._consentHistory = [];
    }
  }

  async _saveConsentHistory() {
    try {
      await require('fs').promises.writeFile(this.config.consentStorePath, JSON.stringify(this._consentHistory, null, 2), 'utf8');
    } catch (err) {
      // Silent fail
    }
  }

  async recordConsent(scopes, source = 'oauth') {
    const event = {
      timestamp: new Date().toISOString(),
      scopes,
      source
    };
    this._consentHistory.push(event);
    await this._saveConsentHistory();
  }

  getConsentHistory() {
    return this._consentHistory;
  }
  constructor(config) {
    this.config = {
      tokenStorePath: path.join(process.env.HOME || process.env.USERPROFILE, '.outlook-mcp-tokens.json'),
      consentStorePath: path.join(process.env.HOME || process.env.USERPROFILE, '.outlook-mcp-consent.json'),
      // Accept either OUTLOOK_* or MS_* env prefixes (Claude Desktop JSON config compatibility)
      clientId: process.env.MS_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID,
      clientSecret: process.env.MS_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET,
      redirectUri: process.env.MS_REDIRECT_URI || 'http://localhost:3333/auth/callback',
      scopes: (process.env.MS_SCOPES || 'offline_access User.Read Mail.Read').split(' '),
      tokenEndpoint: process.env.MS_TOKEN_ENDPOINT || 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      refreshTokenBuffer: 5 * 60 * 1000, // 5 minutes buffer for token refresh
      ...config // Allow overriding default config
    };
    this.tokens = null;
    this._loadPromise = null;
    this._refreshPromise = null;
    this._consentHistory = [];
    this._loadConsentHistory();

    if (!this.config.clientId || !this.config.clientSecret) {
      logger.warn('Client credentials missing (MS_* or OUTLOOK_*). Token operations will fail until set.');
    } else {
      const source = process.env.MS_CLIENT_ID ? 'MS_*' : (process.env.OUTLOOK_CLIENT_ID ? 'OUTLOOK_*' : 'unknown');
      logger.info('TokenStorage credential source detected', { source });
    }
  }

  async _loadTokensFromFile() {
    try {
      const encryptedData = await fs.readFile(this.config.tokenStorePath, 'utf8');
      const tokenData = decrypt(encryptedData);
      this.tokens = JSON.parse(tokenData);
      logger.info('Tokens loaded from encrypted file.');
      return this.tokens;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('Token file not found. No tokens loaded.');
      } else {
        logger.error('Error loading token cache', { error });
      }
      this.tokens = null;
      return null;
    }
  }

  async _saveTokensToFile() {
    if (!this.tokens) {
      logger.warn('No tokens to save.');
      return false;
    }
    try {
      const encrypted = encrypt(JSON.stringify(this.tokens));
      await fs.writeFile(this.config.tokenStorePath, encrypted);
      try {
        require('fs').chmodSync(this.config.tokenStorePath, 0o600);
      } catch (e) {
        // Ignore errors if file permissions can't be set
      }
      logger.info('Tokens saved (encrypted) successfully.');
    } catch (error) {
      logger.error('Error saving token cache', { error });
      throw error;
    }
  }

  getTokens() {
    if (this.tokens) {
      return this.tokens;
    }
    if (!this._loadPromise) {
      this._loadPromise = this._loadTokensFromFile().finally(() => {
        this._loadPromise = null; // Reset promise once completed
      });
    }
    return this._loadPromise;
  }

  getExpiryTime() {
    return this.tokens && this.tokens.expires_at ? this.tokens.expires_at : 0;
  }

  isTokenExpired() {
    if (!this.tokens || !this.tokens.expires_at) {
      return true; // No token or no expiry means it's effectively expired or invalid
    }
    // Token is expired if now + buffer >= expires_at
    return Date.now() + this.config.refreshTokenBuffer >= this.tokens.expires_at;
  }

  async getValidAccessToken() {
    await this.getTokens(); // Ensure tokens are loaded

    if (!this.tokens || !this.tokens.access_token) {
      logger.info('No access token available.');
      return null;
    }

    if (this.isTokenExpired()) {
      logger.info('Access token expired or nearing expiration. Attempting refresh.');
      if (this.tokens.refresh_token) {
        try {
          return await this.refreshAccessToken();
        } catch (refreshError) {
          logger.error('Failed to refresh access token', { error: refreshError });
          this.tokens = null; // Invalidate tokens on refresh failure
          await this._saveTokensToFile(); // Persist invalidation
          return null;
        }
      } else {
        logger.warn('No refresh token available. Cannot refresh access token.');
        this.tokens = null; // Invalidate tokens as they are expired and cannot be refreshed
        await this._saveTokensToFile(); // Persist invalidation
        return null;
      }
    }
    return this.tokens.access_token;
  }

  refreshAccessToken() {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available to refresh the access token.');
    }

    // Prevent multiple concurrent refresh attempts
    if (this._refreshPromise) {
      logger.info('Refresh already in progress, returning existing promise.');
      return this._refreshPromise.then(tokens => tokens.access_token);
    }

    logger.info('Attempting to refresh access token...');
    const postData = querystring.stringify({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refresh_token,
      scope: this.config.scopes.join(' ')
    });

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    this._refreshPromise = new Promise((resolve, reject) => {
      const req = https.request(this.config.tokenEndpoint, requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
          try {
            const responseBody = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.tokens.access_token = responseBody.access_token;
              if (responseBody.refresh_token) {
                this.tokens.refresh_token = responseBody.refresh_token;
              }
              this.tokens.expires_in = responseBody.expires_in;
              this.tokens.expires_at = Date.now() + (responseBody.expires_in * 1000);
              // Consent tracking (always set details as object)
              this.tokens.consent = {
                granted: true,
                timestamp: new Date().toISOString(),
                source: 'refresh',
                details: {
                  scope: responseBody.scope || this.tokens.scope,
                  grant_type: 'refresh_token',
                  client_id: this.config.clientId,
                  refresh_token: this.tokens.refresh_token,
                  scopes: this.config.scopes
                }
              };
              // Record consent event
              await this.recordConsent((responseBody.scope || this.tokens.scope || '').split(' '), 'refresh');
              try {
                await this._saveTokensToFile();
                logger.info('Access token refreshed and saved successfully.');
                resolve(this.tokens);
              } catch (saveError) {
                logger.error('Failed to save refreshed tokens', { error: saveError });
                // Even if save fails, tokens are updated in memory.
                // Depending on desired strictness, could reject here.
                // For now, resolve with in-memory tokens but log critical error.
                // Or, to be stricter and align with re-throwing:
                reject(new Error(`Access token refreshed but failed to save: ${saveError.message}`));
              }
            } else {
              logger.error('Error refreshing token', { responseBody });
              reject(new Error(responseBody.error_description || `Token refresh failed with status ${res.statusCode}`));
            }
          } catch (e) { // Catch any error during parsing or saving
            logger.error('Error processing refresh token response or saving tokens', { error: e });
            reject(e);
          } finally {
            this._refreshPromise = null; // Clear promise after completion
          }
        });
      });
      req.on('error', (error) => {
        logger.error('HTTP error during token refresh', { error });
        reject(error);
        this._refreshPromise = null; // Clear promise on error
      });
      req.write(postData);
      req.end();
    });

    return this._refreshPromise.then(tokens => tokens.access_token);
  }


  exchangeCodeForTokens(authCode) {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Client ID or Client Secret is not configured. Cannot exchange code for tokens.');
    }
    logger.info('Exchanging authorization code for tokens...');
    const postData = querystring.stringify({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' ')
    });

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(this.config.tokenEndpoint, requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
          try {
            const responseBody = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.tokens = {
                access_token: responseBody.access_token,
                refresh_token: responseBody.refresh_token,
                expires_in: responseBody.expires_in,
                expires_at: Date.now() + (responseBody.expires_in * 1000),
                scope: responseBody.scope,
                token_type: responseBody.token_type,
                consent: {
                  granted: true,
                  timestamp: new Date().toISOString(),
                  source: 'oauth',
                  details: responseBody.scope
                }
              };
              // Record consent event
              await this.recordConsent((responseBody.scope || '').split(' '), 'oauth');
              try {
                await this._saveTokensToFile();
                logger.info('Tokens exchanged and saved successfully.');
                resolve(this.tokens);
              } catch (saveError) {
                logger.error('Failed to save exchanged tokens', { error: saveError });
                // Similar to refresh, tokens are in memory but not persisted.
                // Rejecting to indicate the operation wasn't fully successful.
                reject(new Error(`Tokens exchanged but failed to save: ${saveError.message}`));
              }
            } else {
              logger.error('Error exchanging code for tokens', { responseBody });
              reject(new Error(responseBody.error_description || `Token exchange failed with status ${res.statusCode}`));
            }
          } catch (e) { // Catch any error during parsing or saving
            logger.error('Error processing token exchange response or saving tokens', { error: e, data });
            reject(new Error(`Error processing token response: ${e.message}. Response data: ${data}`));
          }
        });
      });
      req.on('error', (error) => {
        logger.error('HTTP error during code exchange', { error });
        reject(error);
      });
      req.write(postData);
      req.end();
    });
  }

  // Utility to clear tokens, e.g., for logout or forcing re-auth
  async clearTokens() {
    this.tokens = null;
    try {
      await fs.unlink(this.config.tokenStorePath);
      logger.info('Token file deleted successfully.');
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('Token file not found, nothing to delete.');
      } else {
        logger.error('Error deleting token file', { error });
      }
    }
    // Clear consent history
    this._consentHistory = [];
    try {
      await require('fs').promises.unlink(this.config.consentStorePath);
    } catch (err) {
      // Silent fail
    }
  }
}

module.exports = TokenStorage;
// Adding a newline at the end of the file as requested by Gemini Code Assist
