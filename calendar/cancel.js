/**
 * Cancel event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Cancel event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCancelEvent(args) {
  const { logSensitiveAction } = require('../utils/sensitive-log');
  const { isSuspicious } = require('../utils/sanitize');
  // Log attempt (before confirmation)
  logSensitiveAction('cancelEvent', args, 'unknown', isSuspicious(args.eventId));
  require('../config').ensureConfigSafe();
  const { eventId, comment, confirmationToken } = args;
  // Secure prompting mode (from config)
  const { SECURE_PROMPT_MODE } = require('../config');
  if (SECURE_PROMPT_MODE) {
    const { handleSecureConfirmation } = require('../utils/secure-confirmation');
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'cancelEvent',
      fields: [eventId, comment],
      confirmationToken,
      globalTokenStore: '__cancelEventTokens',
      promptText: `SECURE ACTION: Human confirmation required.\nEvent ID: ${eventId}`
    });
    if (confirmationResult && confirmationResult.confirmationAccepted !== true) {
      return confirmationResult;
    }
    // Proceed to cancel event if confirmationAccepted
  }

  if (!eventId) {
    return {
      content: [{
        type: 'text',
        text: 'Event ID is required to cancel an event.'
      }]
    };
  }

  // Get access token
  const accessToken = await ensureAuthenticated();

  // Build API endpoint
  const endpoint = `me/events/${eventId}/cancel`;

  // Request body
  const body = {
    comment: comment || 'Cancelled via API'
  };

  // Make API call
  await callGraphAPI(accessToken, 'POST', endpoint, body);

  return {
    content: [{
      type: 'text',
      text: `Event with ID ${eventId} has been successfully cancelled.`
    }]
  };
}

module.exports = handleCancelEvent;