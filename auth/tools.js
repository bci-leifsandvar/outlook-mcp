/**
 * Authentication-related tools for the Outlook MCP server
 */
const config = require('../config');
const tokenManager = require('./token-manager');

/**
 * About tool handler
 * @returns {object} - MCP response
 */
function handleAbout() {
  return {
    content: [{
      type: 'text',
      text: `📧 MODULAR Outlook Assistant MCP Server v${config.SERVER_VERSION} 📧\n\nProvides access to Microsoft Outlook email, calendar, and contacts through Microsoft Graph API.\nImplemented with a modular architecture for improved maintainability.`
    }]
  };
}

/**
 * Authentication tool handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
function handleAuthenticate(args) {
  const _force = args && args.force === true;
  const { SECURE_PROMPT_MODE } = config;
  const { promptForConfirmation, validateConfirmationToken } = require('../utils/secure-prompt');
  const { sanitizeText, isSuspicious } = require('../utils/sanitize');
  const { confirmationToken } = args || {};
  // For test mode, create a test token
  if (config.USE_TEST_MODE) {
    // Create a test token with a 1-hour expiry
    tokenManager.createTestTokens();
    return {
      content: [{
        type: 'text',
        text: 'Successfully authenticated with Microsoft Graph API (test mode)'
      }]
    };
  }
  // For real authentication, require confirmation if secure prompt mode is enabled
  if (SECURE_PROMPT_MODE) {
    const safeClientId = sanitizeText(config.AUTH_CONFIG.clientId);
    if (isSuspicious(config.AUTH_CONFIG.clientId)) {
      return {
        content: [{
          type: 'text',
          text: 'Suspicious input detected in authentication fields. Action blocked.'
        }],
        isError: true
      };
    }
    if (!confirmationToken) {
      return promptForConfirmation({
        actionType: 'authenticate',
        fields: [config.AUTH_CONFIG.clientId],
        safeFields: [safeClientId],
        globalTokenStore: '__authTokens',
        promptText: `SECURE ACTION: Human confirmation required.\nAuthenticate with client ID: ${safeClientId}`
      });
    } else {
      const tokenResult = validateConfirmationToken({
        fields: [config.AUTH_CONFIG.clientId],
        globalTokenStore: '__authTokens',
        confirmationToken
      });
      if (tokenResult) return tokenResult;
      // Proceed to authenticate
    }
  }
  // For real authentication, generate an auth URL and instruct the user to visit it
  const authUrl = `${config.AUTH_CONFIG.authServerUrl}/auth?client_id=${config.AUTH_CONFIG.clientId}`;
  return {
    content: [{
      type: 'text',
      text: `Authentication required. Please visit the following URL to authenticate with Microsoft: ${authUrl}\n\nAfter authentication, you will be redirected back to this application.`
    }]
  };
}

/**
 * Check authentication status tool handler
 * @returns {object} - MCP response
 */
function handleCheckAuthStatus() {
  console.error('[CHECK-AUTH-STATUS] Starting authentication status check');
  
  const tokens = tokenManager.loadTokenCache();
  
  console.error(`[CHECK-AUTH-STATUS] Tokens loaded: ${tokens ? 'YES' : 'NO'}`);
  
  if (!tokens || !tokens.access_token) {
    console.error('[CHECK-AUTH-STATUS] No valid access token found');
    return {
      content: [{ type: 'text', text: 'Not authenticated' }]
    };
  }
  
  console.error('[CHECK-AUTH-STATUS] Access token present');
  console.error(`[CHECK-AUTH-STATUS] Token expires at: ${tokens.expires_at}`);
  console.error(`[CHECK-AUTH-STATUS] Current time: ${Date.now()}`);
  
  return {
    content: [{ type: 'text', text: 'Authenticated and ready' }]
  };
}

// Tool definitions
const authTools = [
  {
    name: 'about',
    description: 'Returns information about this Outlook Assistant server',
    requiredScopes: [],
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: handleAbout
  },
  {
    name: 'authenticate',
    description: 'Authenticate with Microsoft Graph API to access Outlook data',
    requiredScopes: [],
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: 'Force re-authentication even if already authenticated'
        },
        confirmationToken: {
          type: 'string',
          description: 'Security confirmation token for authentication (when prompted in secure mode)'
        }
      },
      required: []
    },
    handler: handleAuthenticate
  },
  {
    name: 'check-auth-status',
    description: 'Check the current authentication status with Microsoft Graph API',
    requiredScopes: [],
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: handleCheckAuthStatus
  }
];

module.exports = {
  authTools,
  handleAbout,
  handleAuthenticate,
  handleCheckAuthStatus
};
