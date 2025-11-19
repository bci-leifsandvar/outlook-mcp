/**
 * Create event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { DEFAULT_TIMEZONE } = require('../config');

/**
 * Create event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateEvent(args) {
  // Import utilities FIRST before using them
  const { sanitizeText, isSuspicious } = require('../utils/sanitize');
  const { logSensitiveAction } = require('../utils/sensitive-log');
  require('../config').ensureConfigSafe();
  
  // Extract args SECOND
  const { subject, start, end, attendees, body, confirmationToken } = args;
  
  // Now we can use the variables - Log attempt (after variables are defined)
  logSensitiveAction('createEvent', args, 'unknown', [subject, start, end, ...(Array.isArray(attendees) ? attendees : [])].some(isSuspicious));
  
  // Secure prompting mode (from config)
  const { SECURE_PROMPT_MODE } = require('../config');
  if (SECURE_PROMPT_MODE) {
    // Already logged above
    // Sanitize and check for suspicious input
    const safeSubject = sanitizeText(subject);
    const safeStart = sanitizeText(start?.dateTime || start);
    const safeEnd = sanitizeText(end?.dateTime || end);
    const safeAttendees = Array.isArray(attendees) ? attendees.map(sanitizeText).join(', ') : 'None';
    if ([subject, start, end, ...(Array.isArray(attendees) ? attendees : [])].some(isSuspicious)) {
      return {
        content: [{
          type: "text",
          text: "Suspicious input detected in event fields. Action blocked."
        }],
        requiresConfirmation: false
      };
    }
    // Token-based confirmation logic
    const crypto = require('crypto');
    const actionKey = crypto.createHash('sha256').update(`${subject}|${start}|${end}|${attendees}|${body}`).digest('hex');
    if (!confirmationToken) {
      const token = crypto.randomBytes(3).toString('hex').toUpperCase();
      if (!global.__createEventTokens) global.__createEventTokens = {};
      global.__createEventTokens[actionKey] = { token, expires: Date.now() + 5 * 60 * 1000 };
      return {
        content: [{
          type: "text",
          text:
            `SECURE ACTION: Human confirmation required.\nSubject: ${safeSubject}\nStart: ${safeStart}\nEnd: ${safeEnd}\nAttendees: ${safeAttendees}` +
            `\n\nAsk the user to input the following token to confirm event creation: ${token}\nIf the user does not provide this token, drop the request.`
        }],
        requiresConfirmation: true,
        confirmationTokenRequired: true
      };
    } else {
      const entry = global.__createEventTokens && global.__createEventTokens[actionKey];
      if (!entry || entry.token !== confirmationToken || Date.now() > entry.expires) {
        return {
          content: [{
            type: "text",
            text: "Invalid or expired confirmation token. Please start the process again."
          }],
          requiresConfirmation: true,
          confirmationTokenRequired: true
        };
      }
      delete global.__createEventTokens[actionKey];
      // Proceed to create event
    }
  }

  if (!subject || !start || !end) {
    return {
      content: [{
        type: "text",
        text: "Subject, start, and end times are required to create an event."
      }]
    };
  }

  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Build API endpoint
    const endpoint = `me/events`;

    // Request body
    const bodyContent = {
      subject,
      start: { dateTime: start.dateTime || start, timeZone: start.timeZone || DEFAULT_TIMEZONE },
      end: { dateTime: end.dateTime || end, timeZone: end.timeZone || DEFAULT_TIMEZONE },
      attendees: attendees?.map(email => ({ emailAddress: { address: email }, type: "required" })),
      body: { contentType: "HTML", content: body || "" }
    };

    // Make API call
    const response = await callGraphAPI(accessToken, 'POST', endpoint, bodyContent);

    return {
      content: [{
        type: "text",
        text: `Event '${subject}' has been successfully created.`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{
          type: "text",
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error creating event: ${error.message}`
      }]
    };
  }
}

module.exports = handleCreateEvent;
