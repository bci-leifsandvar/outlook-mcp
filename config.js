/**
 * Configuration for Outlook MCP Server
 */
const path = require('path');
const os = require('os');

// Ensure we have a home directory path even if process.env.HOME is undefined
const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir() || '/tmp';

const failClosed = (msg) => {
  // Print error and exit process
  // (If used in a handler, can throw instead)
  console.error('CONFIGURATION ERROR:', msg);
  if (process.env.NODE_ENV === 'test') {
    throw new Error(`CONFIGURATION ERROR: ${msg}`);
  } else {
    process.exit(1);
  }
};

// FIXED: Move test mode detection BEFORE production checks
// Validate required environment/config (skip if USE_TEST_MODE=true or TRUE)
const isTestMode = (process.env.USE_TEST_MODE || '').toLowerCase() === 'true';
const useMockGraphApi = (process.env.USE_MOCK_GRAPH_API || '').toLowerCase() === 'true';

// Production environment checks
const isProd = process.env.NODE_ENV === 'production' || process.env.MCP_ENV === 'production';
if (isProd) {
  if (isTestMode) {
    console.error('SECURITY ERROR: Test mode must not be enabled in production!');
    process.exit(1);
  }
  if (process.env.SECURE_PROMPT_MODE === 'false') {
    console.error('SECURITY ERROR: SECURE_PROMPT_MODE must be enabled in production!');
    process.exit(1);
  }
}

// Validate required credentials unless in test mode
if (!isTestMode) {
  if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    failClosed('OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET must be set in environment or .env file.');
  }
}

// Helper for sensitive actions: call before performing sensitive operations
const ensureConfigSafe = () => {
  if (isTestMode) return;
  if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    throw new Error('Configuration missing: OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET are required.');
  }
};

// Allowed scopes for security validation
const ALLOWED_SCOPES = [
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite',
  'Contacts.Read'
];

// Default scopes if none specified or invalid
const DEFAULT_SCOPES = ['Mail.Read', 'User.Read', 'Calendars.Read'];

// Parse and validate scopes from environment
const parseScopes = () => {
  let scopes = process.env.OUTLOOK_SCOPES
    ? process.env.OUTLOOK_SCOPES.split(',').map(s => s.trim())
    : DEFAULT_SCOPES;
  
  // Filter to only allowed scopes
  scopes = scopes.filter(scope => ALLOWED_SCOPES.includes(scope));
  
  // Fallback to secure default if none valid
  if (scopes.length === 0) {
    scopes = DEFAULT_SCOPES;
  }
  
  return scopes;
};

module.exports = {
  ensureConfigSafe,
  
  // Secure prompting mode (explicit user confirmation for sensitive actions)
  // Enabled by default unless explicitly set to 'false'
  SECURE_PROMPT_MODE: process.env.SECURE_PROMPT_MODE !== 'false',
  
  // Server information
  SERVER_NAME: 'outlook-assistant',
  SERVER_VERSION: '1.0.0',
  
  // Test mode setting
  USE_TEST_MODE: isTestMode,
  USE_MOCK_GRAPH_API: useMockGraphApi,
  
  // Authentication configuration
  /**
   * AUTH_CONFIG.scopes can be set via OUTLOOK_SCOPES env var (comma-separated).
   * Only the following scopes are allowed for security:
   *   - Mail.Read, Mail.ReadWrite, Mail.Send, User.Read, Calendars.Read, Calendars.ReadWrite, Contacts.Read
   * Example: OUTLOOK_SCOPES="Mail.Read,User.Read,Calendars.Read"
   */
  AUTH_CONFIG: {
    clientId: process.env.OUTLOOK_CLIENT_ID || '',
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
    redirectUri: 'http://localhost:3333/auth/callback',
    scopes: parseScopes(),
    tokenStorePath: path.join(homeDir, '.outlook-mcp-tokens.json'),
    authServerUrl: 'http://localhost:3333'
  },
  
  // Microsoft Graph API
  // Can be overridden with GRAPH_API_ENDPOINT env var (e.g., for mock server: http://localhost:4000/v1.0/)
  GRAPH_API_ENDPOINT: process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0/',
  
  // Email constants
  EMAIL_SELECT_FIELDS: 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,hasAttachments,importance,isRead',
  EMAIL_DETAIL_FIELDS: 'id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,body,hasAttachments,importance,isRead,internetMessageHeaders',
  
  // Calendar constants - FIXED: Removed duplicate definition
  CALENDAR_SELECT_FIELDS: 'id,subject,bodyPreview,start,end,location,organizer,attendees,isAllDay,isCancelled',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  MAX_RESULT_COUNT: 50,

  // Timezone
  DEFAULT_TIMEZONE: 'Pacific Standard Time',
  
  // Rate limiting constants
  RATE_LIMITS: {
    EMAIL_SEND: {
      MAX_PER_MINUTE: 5,
      WINDOW_MS: 60000
    }
  },
  
  // Input validation limits
  MAX_EMAIL_BODY_LENGTH: 1048576, // 1MB
  MAX_SUBJECT_LENGTH: 255,
  MAX_EMAIL_RECIPIENTS: 50
};
