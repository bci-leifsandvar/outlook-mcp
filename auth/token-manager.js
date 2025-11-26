/**
 * Token management for Microsoft Graph API authentication
 */
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

// Global variable to store tokens
let cachedTokens = null;

/**
 * Loads authentication tokens from the token file
 * @returns {object|null} - The loaded tokens or null if not available
 */
function loadTokenCache() {
  try {
    const tokenPath = config.AUTH_CONFIG.tokenStorePath;
    logger.debug('Attempting to load tokens', { tokenPath, home: process.env.HOME, resolvedPath: tokenPath });
    
    // Log file existence and details
    if (!fs.existsSync(tokenPath)) {
      logger.debug('Token file does not exist', { tokenPath });
      return null;
    }
    
    const stats = fs.statSync(tokenPath);
    logger.debug('Token file stats', { size: stats.size, created: stats.birthtime, modified: stats.mtime });
    
    const tokenData = fs.readFileSync(tokenPath, 'utf8');
    logger.debug('Token file contents', { length: tokenData.length, preview: tokenData.slice(0, 200) });
    
    try {
      const tokens = JSON.parse(tokenData);
      logger.debug('Parsed tokens keys', { keys: Object.keys(tokens) });
      
      // Log each key's value to see what's present
      Object.keys(tokens).forEach(key => {
        logger.debug('Token key type', { key, type: typeof tokens[key] });
      });
      
      // Check for access token presence
      if (!tokens.access_token) {
        logger.debug('No access_token found');
        return null;
      }
      
      // Check token expiration
      const now = Date.now();
      const expiresAt = tokens.expires_at || 0;
      
      logger.debug('Token timing', { now, expiresAt });
      
      if (now > expiresAt) {
        logger.debug('Token expired');
        return null;
      }
      
      // Update the cache
      cachedTokens = tokens;
      return tokens;
    } catch (parseError) {
      logger.error('Error parsing token JSON', { error: parseError.message });
      return null;
    }
  } catch (error) {
    logger.error('Error loading token cache', { error: error.message });
    return null;
  }
}

/**
 * Saves authentication tokens to the token file
 * @param {object} tokens - The tokens to save
 * @returns {boolean} - Whether the save was successful
 */
function saveTokenCache(tokens) {
  try {
    const tokenPath = config.AUTH_CONFIG.tokenStorePath;
    logger.info('Saving tokens', { tokenPath });
    
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    logger.info('Tokens saved successfully');
    
    // Update the cache
    cachedTokens = tokens;
    return true;
  } catch (error) {
    logger.error('Error saving token cache', { error: error.message });
    return false;
  }
}

/**
 * Gets the current access token, loading from cache if necessary
 * @returns {string|null} - The access token or null if not available
 */
function getAccessToken() {
  // If we already have a cached token, ensure it's valid for current mode
  if (cachedTokens && cachedTokens.access_token) {
    if (!config.USE_TEST_MODE && /^test_access_token_/i.test(cachedTokens.access_token)) {
      // Ignore leftover test token when not in test mode
      return null;
    }
    return cachedTokens.access_token;
  }
  const tokens = loadTokenCache();
  if (!tokens) return null;
  if (!config.USE_TEST_MODE && /^test_access_token_/i.test(tokens.access_token)) {
    // Leftover test token file; treat as unauthenticated
    return null;
  }
  return tokens.access_token;
}

/**
 * Creates a test access token for use in test mode
 * @returns {object} - The test tokens
 */
function createTestTokens() {
  const testTokens = {
    access_token: `test_access_token_${Date.now()}`,
    refresh_token: `test_refresh_token_${Date.now()}`,
    expires_at: Date.now() + (3600 * 1000) // 1 hour
  };
  
  saveTokenCache(testTokens);
  return testTokens;
}

module.exports = {
  loadTokenCache,
  saveTokenCache,
  getAccessToken,
  createTestTokens
};
