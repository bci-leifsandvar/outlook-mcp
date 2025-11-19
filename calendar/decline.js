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
  // Log attempt (before confirmation)
  logSensitiveAction('declineEvent', args, 'unknown', isSuspicious(eventId));
  const { sanitizeText, isSuspicious } = require('../utils/sanitize');
  require('../config').ensureConfigSafe();
  const { eventId, comment, confirmationToken } = args;
  // Secure prompting mode (from config)
  const { SECURE_PROMPT_MODE } = require('../config');
  if (SECURE_PROMPT_MODE) {
    // Already logged above
    const safeEventId = sanitizeText(eventId);
    if (isSuspicious(eventId)) {
      return {
        content: [{
          type: "text",
          text: "Suspicious input detected in event ID. Action blocked."
        }],
        requiresConfirmation: false
      };
    }
    // Token-based confirmation logic
    const crypto = require('crypto');
    const actionKey = crypto.createHash('sha256').update(`${eventId}|${comment}`).digest('hex');
    if (!confirmationToken) {
      const token = crypto.randomBytes(3).toString('hex').toUpperCase();
      if (!global.__declineEventTokens) global.__declineEventTokens = {};
      global.__declineEventTokens[actionKey] = { token, expires: Date.now() + 5 * 60 * 1000 };
      return {
        content: [{
          type: "text",
          text:
            `SECURE ACTION: Human confirmation required.\nEvent ID: ${safeEventId}` +
            `\n\nAsk the user to input the following token to confirm event decline: ${token}\nIf the user does not provide this token, drop the request.`
        }],
        requiresConfirmation: true,
        confirmationTokenRequired: true
      };
    } else {
      const entry = global.__declineEventTokens && global.__declineEventTokens[actionKey];
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
      delete global.__declineEventTokens[actionKey];
      // Proceed to decline event
    }
  }

  if (!eventId) {
    return {
      content: [{
        type: "text",
        text: "Event ID is required to decline an event."
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
      comment: comment || "Declined via API"
    };

    // Make API call
    await callGraphAPI(accessToken, 'POST', endpoint, body);

    return {
      content: [{
        type: "text",
        text: `Event with ID ${eventId} has been successfully declined.`
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
        text: `Error declining event: ${error.message}`
      }]
    };
  }
}

module.exports = handleDeclineEvent;