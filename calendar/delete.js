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
  const { sanitizeText: _sanitizeText, isSuspicious } = require('../utils/sanitize');
  require('../config').ensureConfigSafe();
  const { eventId, confirmationToken } = args;
  // Secure prompting mode (from config)
  const { SECURE_PROMPT_MODE } = require('../config');
  if (SECURE_PROMPT_MODE) {
    const { handleSecureConfirmation } = require('../utils/secure-confirmation');
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'deleteEvent',
      fields: [eventId],
      confirmationToken,
      globalTokenStore: '__deleteEventTokens',
      promptText: `SECURE ACTION: Human confirmation required.\nEvent ID: ${eventId}`
    });
    if (confirmationResult && confirmationResult.confirmationAccepted !== true) {
      return confirmationResult;
    }
    // Proceed to delete event if confirmationAccepted
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