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
    const actionKey = crypto.createHash('sha256').update(`${eventId}`).digest('hex');
    if (!confirmationToken) {
      const token = crypto.randomBytes(3).toString('hex').toUpperCase();
      if (!global.__deleteEventTokens) global.__deleteEventTokens = {};
      global.__deleteEventTokens[actionKey] = { token, expires: Date.now() + 5 * 60 * 1000 };
      return {
        content: [{
          type: "text",
          text:
            `SECURE ACTION: Human confirmation required.\nEvent ID: ${safeEventId}` +
            `\n\nAsk the user to input the following token to confirm event deletion: ${token}\nIf the user does not provide this token, drop the request.`
        }],
        requiresConfirmation: true,
        confirmationTokenRequired: true
      };
    } else {
      const entry = global.__deleteEventTokens && global.__deleteEventTokens[actionKey];
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
      delete global.__deleteEventTokens[actionKey];
      // Proceed to delete event
    }
  }

  if (!eventId) {
    return {
      content: [{
        type: "text",
        text: "Event ID is required to delete an event."
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
        type: "text",
        text: `Event with ID ${eventId} has been successfully deleted.`
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
        text: `Error deleting event: ${error.message}`
      }]
    };
  }
}

module.exports = handleDeleteEvent;