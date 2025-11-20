/**
 * Delete event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Delete event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleDeleteEvent(args) {
  const { logSensitiveAction } = require('../utils/sensitive-log');
  // Log attempt (before confirmation)
  logSensitiveAction('deleteEvent', args, 'unknown', isSuspicious(eventId));
  const { sanitizeText, isSuspicious } = require('../utils/sanitize');
  require('../config').ensureConfigSafe();
  const { eventId, confirmationToken } = args;
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
        actionType: 'deleteEvent',
        fields: [eventId],
        safeFields: [safeEventId],
        globalTokenStore: '__deleteEventTokens',
        promptText: `SECURE ACTION: Human confirmation required.\nEvent ID: ${safeEventId}`
      });
    } else {
      const tokenResult = validateConfirmationToken({
        fields: [eventId],
        globalTokenStore: '__deleteEventTokens',
        confirmationToken
      });
      if (tokenResult) return tokenResult;
      // Proceed to delete event
    }
  }

  if (!eventId) {
    return {
      content: [{
        type: 'text',
        text: 'Event ID is required to delete an event.'
      }]
    };
  }

  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Build API endpoint
    const endpoint = `me/events/${eventId}`;

    // Make API call
    await callGraphAPI(accessToken, 'DELETE', endpoint);

    return {
      content: [{
        type: 'text',
        text: `Event with ID ${eventId} has been successfully deleted.`
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
        text: `Error deleting event: ${error.message}`
      }]
    };
  }
}

module.exports = handleDeleteEvent;