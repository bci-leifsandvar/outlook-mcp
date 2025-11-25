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
  // For test mode, create a test token
  if (config.USE_TEST_MODE) {
    // Create a test token with a 1-hour expiry
    tokenManager.createTestTokens();
    return {
      content: [{
        type: 'text',
        text: 'Successfully authenticated with Microsoft Graph API (test mode)\nNOTE: Test access token is distinct from any secure confirmation codes. Confirmation codes NEVER grant API access.'
      }]
    };
  }
  // Removed secure confirmation for authentication to avoid confusion with action confirmation tokens.
  // For real authentication, generate an auth URL and instruct the user to visit it
  const authUrl = `${config.AUTH_CONFIG.authServerUrl}/auth?client_id=${config.AUTH_CONFIG.clientId}`;
  return {
    content: [{
      type: 'text',
      text: `AUTHENTICATION FLOW:\nVisit this URL in your browser to grant access: ${authUrl}\nOAuth access & refresh tokens will be stored automatically.\nIMPORTANT: These OAuth tokens are NEVER the same as secure confirmation codes.\nSecure confirmation codes only approve a single sensitive action and cannot be reused or converted to OAuth credentials.`
    }]
  };
}

/**
 * Check authentication status tool handler
 * @returns {object} - MCP response
 */
async function handleCheckAuthStatus() {
  const logger = require('../utils/logger');
  const graphApi = require('../utils/graph-api');
  logger.debug('Auth status check start');

  // Load raw tokens (may be test or real)
  const tokens = tokenManager.loadTokenCache();
  logger.debug('Auth status tokens loaded', { present: !!tokens });

  if (!tokens || !tokens.access_token) {
    logger.debug('Auth status - no valid access token');
    return { content: [{ type: 'text', text: 'Not authenticated' }] };
  }

  // Derive current usable access token (filters out leftover test tokens if not in test mode)
  const accessToken = tokenManager.getAccessToken();
  const isTestToken = /^test_access_token_/i.test(tokens.access_token);
  const now = Date.now();
  const expiresAt = tokens.expires_at || 0;

  if (!accessToken) {
    return { content: [{ type: 'text', text: 'Not authenticated (token expired or invalid for current mode)' }] };
  }

  if (now > expiresAt) {
    return { content: [{ type: 'text', text: 'Not authenticated (token expired)' }] };
  }

  if (isTestToken && !config.USE_TEST_MODE) {
    return { content: [{ type: 'text', text: 'Not authenticated (leftover test-mode token, please re-authenticate)' }] };
  }

  // Perform lightweight Graph probe when not in test mode to verify token is accepted
  let probeVerified = false;
  if (!config.USE_TEST_MODE) {
    try {
      const probe = await graphApi.callGraphAPI(accessToken, 'GET', 'me?$select=id');
      probeVerified = !!(probe && probe.id);
    } catch (e) {
      if (e && (e.status === 401 || e.status === 403)) {
        return { content: [{ type: 'text', text: 'Not authenticated (stored token rejected by Graph API 401/403)' }] };
      }
      // Other errors: network/timeouts -> unknown but token still present
      logger.warn('Graph probe failed during auth status', { error: e.message });
    }
  }

  const details = [
    'Authenticated and ready',
    `profile=${config.ACTIVE_SCOPE_PROFILE}`,
    `test_mode=${!!config.USE_TEST_MODE}`,
    `token_type=${isTestToken ? 'test' : 'real'}`,
    `expires_at=${expiresAt}`
  ];
  if (!config.USE_TEST_MODE) {
    details.push(`probe_verified=${probeVerified}`);
  }

  return { content: [{ type: 'text', text: details.join(' | ') }] };
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
