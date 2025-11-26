/**
 * Create event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { DEFAULT_TIMEZONE } = require('../config');
const { isSuspicious } = require('../utils/sanitize');
const { logSensitiveAction } = require('../utils/sensitive-log');
const config = require('../config');
const { handleSecureConfirmation } = require('../utils/secure-confirmation');

/**
 * Create event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateEvent(args) {
  config.ensureConfigSafe();
  
  // Extract args SECOND
  const { subject, start, end, attendees, body, confirmationToken } = args;
  
  // Now we can use the variables - Log attempt (after variables are defined)
  logSensitiveAction('createEvent', args, 'unknown', [subject, start, end, ...(Array.isArray(attendees) ? attendees : [])].some(isSuspicious));
  
  // Secure prompting mode (from config)
  if (config.SECURE_PROMPT_MODE) {
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'createEvent',
      fields: [subject, start, end, attendees, body],
      confirmationToken,
      globalTokenStore: '__createEventTokens',
      promptText: `SECURE ACTION: Human confirmation required.\nSubject: ${subject}\nStart: ${start?.dateTime || start}\nEnd: ${end?.dateTime || end}\nAttendees: ${Array.isArray(attendees) ? attendees.join(', ') : 'None'}`
    });
    if (confirmationResult && confirmationResult.confirmationAccepted !== true) {
      return confirmationResult;
    }
    // Proceed to create event if confirmationAccepted
  }

  if (!subject || !start || !end) {
    return {
      content: [{
        type: 'text',
        text: 'Subject, start, and end times are required to create an event.'
      }]
    };
  }

  // Get access token
  const accessToken = await ensureAuthenticated();

  // Build API endpoint
  const endpoint = 'me/events';

  // Request body
  const bodyContent = {
    subject,
    start: { dateTime: start.dateTime || start, timeZone: start.timeZone || DEFAULT_TIMEZONE },
    end: { dateTime: end.dateTime || end, timeZone: end.timeZone || DEFAULT_TIMEZONE },
    attendees: attendees?.map(email => ({ emailAddress: { address: email }, type: 'required' })),
    body: { contentType: 'HTML', content: body || '' }
  };

  // Make API call
  const _response = await callGraphAPI(accessToken, 'POST', endpoint, bodyContent);

  return {
    content: [{
      type: 'text',
      text: `Event '${subject}' has been successfully created.`
    }]
  };
}

module.exports = handleCreateEvent;
