/**
 * Decline event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Decline event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleDeclineEvent(args) {
  const { logSensitiveAction } = require('../utils/sensitive-log');
  const { sanitizeText: _sanitizeText, isSuspicious } = require('../utils/sanitize');
  // Log attempt (before confirmation)
  logSensitiveAction('declineEvent', args, 'unknown', isSuspicious(args.eventId));
  require('../config').ensureConfigSafe();
  const { eventId, comment, confirmationToken } = args;
  // Secure prompting mode (from config)
  const { SECURE_PROMPT_MODE } = require('../config');
  if (SECURE_PROMPT_MODE) {
    const { handleSecureConfirmation } = require('../utils/secure-confirmation');
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'declineEvent',
      fields: [eventId, comment],
      confirmationToken,
      globalTokenStore: '__declineEventTokens',
      promptText: `SECURE ACTION: Human confirmation required.\nEvent ID: ${eventId}`
    });
    if (confirmationResult && confirmationResult.confirmationAccepted !== true) {
      return confirmationResult;
    }
    // Proceed to decline event if confirmationAccepted
  }

  if (!eventId) {
    return {
      content: [{
        type: 'text',
        text: 'Event ID is required to decline an event.'
      }]
    };
  }

  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Build API endpoint
    const endpoint = `me/events/${eventId}/decline`;

    // Request body
    const body = {
      comment: comment || 'Declined via API'
    };

    // Make API call
    await callGraphAPI(accessToken, 'POST', endpoint, body);

    return {
      content: [{
        type: 'text',
        text: `Event with ID ${eventId} has been successfully declined.`
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
        text: `Error declining event: ${error.message}`
      }]
    };
  }
}

module.exports = handleDeclineEvent;