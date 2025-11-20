/**
 * Accept event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Accept event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleAcceptEvent(args) {
  const { logSensitiveAction } = require('../utils/sensitive-log');
  // Log attempt (before confirmation)
  logSensitiveAction('acceptEvent', args, 'unknown', isSuspicious(eventId));
  const { sanitizeText, isSuspicious } = require('../utils/sanitize');
  require('../config').ensureConfigSafe();
  const { eventId, comment, confirmationToken } = args;
  // Secure prompting mode (from config)
  const { SECURE_PROMPT_MODE } = require('../config');
  const { promptForConfirmation, validateConfirmationToken } = require('../utils/secure-prompt');
  if (SECURE_PROMPT_MODE) {
    const safeEventId = sanitizeText(eventId);
    if (isSuspicious(eventId)) {
      return {
        content: [{
          type: 'text',
          text: 'Suspicious input detected in event ID. Action blocked.'
        }],
        requiresConfirmation: false
      };
    }
    // Use secure-prompt utility
    if (!confirmationToken) {
      return promptForConfirmation({
        actionType: 'acceptEvent',
        fields: [eventId, comment],
        safeFields: [safeEventId],
        globalTokenStore: '__acceptEventTokens',
        promptText: `SECURE ACTION: Human confirmation required.\nEvent ID: ${safeEventId}`
      });
    } else {
      const tokenResult = validateConfirmationToken({
        fields: [eventId, comment],
        globalTokenStore: '__acceptEventTokens',
        confirmationToken
      });
      if (tokenResult) return tokenResult;
      // Proceed to accept event
    }
  }

  if (!eventId) {
    return {
      content: [{
        type: 'text',
        text: 'Event ID is required to accept an event.'
      }]
    };
  }

  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Build API endpoint
    const endpoint = `me/events/${eventId}/accept`;

    // Request body
    const body = {
      comment: comment || 'Accepted via API'
    };

    // Make API call
    await callGraphAPI(accessToken, 'POST', endpoint, body);

    return {
      content: [{
        type: 'text',
        text: `Event with ID ${eventId} has been successfully accepted.`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{
          type: 'text',
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Error accepting event: ${error.message}`
      }]
    };
  }
}

module.exports = handleAcceptEvent;