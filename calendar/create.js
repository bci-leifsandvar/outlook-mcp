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
  const { promptForConfirmation, validateConfirmationToken } = require('../utils/secure-prompt');
  if (SECURE_PROMPT_MODE) {
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
    // Use secure-prompt utility
    if (!confirmationToken) {
      return promptForConfirmation({
        actionType: 'createEvent',
        fields: [subject, start, end, attendees, body],
        safeFields: [safeSubject, safeStart, safeEnd, safeAttendees],
        globalTokenStore: '__createEventTokens',
        promptText: `SECURE ACTION: Human confirmation required.\nSubject: ${safeSubject}\nStart: ${safeStart}\nEnd: ${safeEnd}\nAttendees: ${safeAttendees}`
      });
    } else {
      const tokenResult = validateConfirmationToken({
        fields: [subject, start, end, attendees, body],
        globalTokenStore: '__createEventTokens',
        confirmationToken
      });
      if (tokenResult) return tokenResult;
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
