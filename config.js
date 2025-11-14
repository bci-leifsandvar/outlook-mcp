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
/**
 * Configuration for Outlook MCP Server
 */
const path = require('path');
const os = require('os');

// Ensure we have a home directory path even if process.env.HOME is undefined

const failClosed = (msg) => {
  // Print error and exit process
  // (If used in a handler, can throw instead)
  console.error('CONFIGURATION ERROR:', msg);
  process.exit(1);
};


// Validate required environment/config (skip if USE_TEST_MODE=true or TRUE)
const isTestMode = (process.env.USE_TEST_MODE || '').toLowerCase() === 'true';
if (!isTestMode) {
  if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    failClosed('OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET must be set in environment or .env file.');
  }
}

const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir() || '/tmp';
// Helper for sensitive actions: call before performing sensitive operations
module.exports.ensureConfigSafe = () => {
  if (isTestMode) return;
  if (!process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    throw new Error('Configuration missing: OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET are required.');
  }
};

module.exports = {
  // Secure prompting mode (explicit user confirmation for sensitive actions)
  // Enabled by default unless explicitly set to 'false'
  SECURE_PROMPT_MODE: process.env.SECURE_PROMPT_MODE !== 'false',
  // Server information
  SERVER_NAME: "outlook-assistant",
  SERVER_VERSION: "1.0.0",
  
  // Test mode setting
  USE_TEST_MODE: isTestMode,
  
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
    // Validate and filter allowed scopes
    scopes: (() => {
      const allowed = [
        'Mail.Read', 'Mail.ReadWrite', 'Mail.Send',
        'User.Read', 'Calendars.Read', 'Calendars.ReadWrite', 'Contacts.Read'
      ];
      let scopes = process.env.OUTLOOK_SCOPES
        ? process.env.OUTLOOK_SCOPES.split(',').map(s => s.trim())
        : ['Mail.Read', 'User.Read', 'Calendars.Read'];
      scopes = scopes.filter(scope => allowed.includes(scope));
      if (scopes.length === 0) {
        // fallback to secure default if none valid
        scopes = ['Mail.Read', 'User.Read', 'Calendars.Read'];
      }
      return scopes;
    })(),
    tokenStorePath: path.join(homeDir, '.outlook-mcp-tokens.json'),
    authServerUrl: 'http://localhost:3333'
  },
  
  // Microsoft Graph API
  GRAPH_API_ENDPOINT: 'https://graph.microsoft.com/v1.0/',
  
  // Calendar constants
  CALENDAR_SELECT_FIELDS: 'id,subject,start,end,location,bodyPreview,isAllDay,recurrence,attendees',

  // Email constants
  EMAIL_SELECT_FIELDS: 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,hasAttachments,importance,isRead',
  EMAIL_DETAIL_FIELDS: 'id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,body,hasAttachments,importance,isRead,internetMessageHeaders',
  
  // Calendar constants
  CALENDAR_SELECT_FIELDS: 'id,subject,bodyPreview,start,end,location,organizer,attendees,isAllDay,isCancelled',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  MAX_RESULT_COUNT: 50,

  // Timezone
  DEFAULT_TIMEZONE: "Pacific Standard Time",
};
