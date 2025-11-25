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

// Resolve credentials permitting either OUTLOOK_* or MS_* prefix for Claude Desktop JSON env usage
const resolvedClientId = process.env.OUTLOOK_CLIENT_ID || process.env.MS_CLIENT_ID || '';
const resolvedClientSecret = process.env.OUTLOOK_CLIENT_SECRET || process.env.MS_CLIENT_SECRET || '';

// Validate required credentials unless in test mode (accept either prefix)
if (!isTestMode) {
  if (!resolvedClientId || !resolvedClientSecret) {
    failClosed('Missing client credentials: set OUTLOOK_CLIENT_ID/OUTLOOK_CLIENT_SECRET or MS_CLIENT_ID/MS_CLIENT_SECRET.');
  }
}

// Helper for sensitive actions: call before performing sensitive operations
const ensureConfigSafe = () => {
  if (isTestMode) return;
  if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    throw new Error('Configuration missing: OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET are required.');
  }
};

// Allowed scopes for security validation (includes identity/OIDC basics)
const ALLOWED_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'Calendars.Read',
  'Calendars.ReadWrite',
  'Contacts.Read',
  'Contacts.ReadWrite',
  'MailboxSettings.Read',
  'MailboxSettings.ReadWrite',
  'MailboxFolder.Read',
  'MailboxFolder.ReadWrite',
  'MailboxItem.Read'
];

// Scope profiles for least-privilege abstraction
const PROFILE_SCOPE_MAP = {
  minimal: [
    'openid', 'profile', 'email', 'User.Read',
    'Mail.Read', 'Calendars.Read', 'Contacts.Read', 'MailboxSettings.Read'
  ],
  compose: [
    'openid', 'profile', 'email', 'User.Read',
    'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite', 'Contacts.Read'
  ],
  manage: [
    'openid', 'profile', 'email', 'User.Read', 'offline_access',
    'Mail.ReadWrite', 'Mail.Send', 'Calendars.ReadWrite', 'Contacts.ReadWrite'
  ],
  'admin-plus': [
    'openid', 'profile', 'email', 'User.Read', 'offline_access',
    'Mail.ReadWrite', 'Mail.Send', 'Calendars.ReadWrite', 'Contacts.ReadWrite', 'MailboxSettings.Read.Write'
  ],
  constrained: [
    'openid', 'profile', 'email', 'User.Read',
    'Mail.Read', 'Mail.Send', 'MailboxFolder.ReadWrite', 'Calendars.Read', 'Contacts.Read'
  ]
};

// Default scopes if none specified or invalid (read-only minimal set)
const DEFAULT_SCOPES = PROFILE_SCOPE_MAP.minimal;

// Determine active profile
const ACTIVE_SCOPE_PROFILE = (process.env.OUTLOOK_SCOPE_PROFILE || '').trim().toLowerCase() || null;

// Parse and validate scopes from environment or profile
const parseScopes = () => {
  // If a profile is specified, start with its scopes directly
  if (ACTIVE_SCOPE_PROFILE) {
    const profileScopes = PROFILE_SCOPE_MAP[ACTIVE_SCOPE_PROFILE];
    if (!profileScopes) {
      failClosed(`OUTLOOK_SCOPE_PROFILE '${ACTIVE_SCOPE_PROFILE}' is invalid. Valid profiles: ${Object.keys(PROFILE_SCOPE_MAP).join(', ')}`);
    }
    let requested = profileScopes.slice();

    // If OUTLOOK_SCOPES provided, ensure they are subset of profile (fail closed if not)
    if (process.env.OUTLOOK_SCOPES) {
      const extra = process.env.OUTLOOK_SCOPES.split(',').map(s => s.trim()).filter(Boolean);
      const disallowed = extra.filter(s => !requested.includes(s));
      if (disallowed.length) {
        failClosed(`Extraneous scopes not allowed under profile '${ACTIVE_SCOPE_PROFILE}': ${disallowed.join(', ')}`);
      }
      // Merge (idempotent)
      requested = Array.from(new Set([...requested, ...extra]));
    }

    // Final filter to allowed list
    return requested.filter(s => ALLOWED_SCOPES.includes(s));
  }
  // No profile: parse explicit scopes or fallback
  let scopes = process.env.OUTLOOK_SCOPES
    ? process.env.OUTLOOK_SCOPES.split(',').map(s => s.trim())
    : DEFAULT_SCOPES;
  scopes = scopes.filter(scope => ALLOWED_SCOPES.includes(scope));
  if (scopes.length === 0) scopes = DEFAULT_SCOPES;
  return scopes;
};

// Utility: Does granted scope set satisfy required (allowing ReadWrite supersets)?
function scopeSatisfied(required, granted) {
  if (granted.includes(required)) return true;
  const supersets = {
    'Mail.Read': 'Mail.ReadWrite',
    'Calendars.Read': 'Calendars.ReadWrite',
    'Contacts.Read': 'Contacts.ReadWrite',
    'MailboxSettings.Read': 'MailboxSettings.ReadWrite'
  };
  const sup = supersets[required];
  return sup ? granted.includes(sup) : false;
}

// Validate a tool's required scopes at runtime
function validateToolScopes(toolName, requiredScopes, grantedScopes) {
  if (!requiredScopes || requiredScopes.length === 0) return { ok: true };
  const missing = requiredScopes.filter(req => !scopeSatisfied(req, grantedScopes));
  if (missing.length === 0) return { ok: true };
  return {
    ok: false,
    missing,
    message: `Missing required scopes for tool '${toolName}': ${missing.join(', ')}. Current profile: ${ACTIVE_SCOPE_PROFILE || 'custom'}.`
  };
}

const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const AUTH_PORT = process.env.AUTH_PORT || 3333;
const SECURE_CONFIRM_PORT = process.env.SECURE_CONFIRM_PORT || 4000;

const AUTH_SERVER_BASE_URL = `http://${SERVER_HOST}:${AUTH_PORT}`;
const SECURE_CONFIRM_SERVER_BASE_URL = `http://${SERVER_HOST}:${SECURE_CONFIRM_PORT}`;

module.exports = {
  ensureConfigSafe,
  SERVER_HOST,
  AUTH_PORT,
  SECURE_CONFIRM_PORT,
  AUTH_SERVER_BASE_URL,
  SECURE_CONFIRM_SERVER_BASE_URL,
  
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
    clientId: resolvedClientId,
    clientSecret: resolvedClientSecret,
    redirectUri: `${AUTH_SERVER_BASE_URL}/auth/callback`,
    scopes: parseScopes(),
    tokenStorePath: path.join(homeDir, '.outlook-mcp-tokens.json'),
    authServerUrl: AUTH_SERVER_BASE_URL,
    credentialSource: resolvedClientId ? (process.env.OUTLOOK_CLIENT_ID ? 'OUTLOOK_*' : (process.env.MS_CLIENT_ID ? 'MS_*' : 'unknown')) : 'none'
  },
  ACTIVE_SCOPE_PROFILE,
  PROFILE_SCOPE_MAP,
  validateToolScopes,
  scopeSatisfied,
  
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
