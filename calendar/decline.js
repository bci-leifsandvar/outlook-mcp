/**
 * Decline event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { logSensitiveAction } = require('../utils/sensitive-log');
const { isSuspicious } = require('../utils/sanitize');
const config = require('../config');
const { handleSecureConfirmation } = require('../utils/secure-confirmation');

/**
 * Decline event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleDeclineEvent(args) {
  // Log attempt (before confirmation)
  logSensitiveAction('declineEvent', args, 'unknown', isSuspicious(args.eventId));
  config.ensureConfigSafe();
  const { eventId, comment, confirmationToken } = args;
  // Secure prompting mode (from config)
  if (config.SECURE_PROMPT_MODE) {
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

  // Get access token
  const accessToken = await ensureAuthenticated();

  // Optional preflight: fetch event to detect organizer self-decline for clearer messaging
  let isOrganizer = false;
  try {
    const evt = await callGraphAPI(accessToken, 'GET', `me/events/${eventId}`, null, { $select: 'id,subject,organizer' });
    if (evt && evt.organizer && evt.organizer.emailAddress && evt.organizer.emailAddress.address) {
      // Fetch current user mail to compare
      try {
        const me = await callGraphAPI(accessToken, 'GET', 'me', null, { $select: 'mail,userPrincipalName' });
        const myAddr = (me && (me.mail || me.userPrincipalName)) || '';
        if (myAddr && myAddr.toLowerCase() === evt.organizer.emailAddress.address.toLowerCase()) {
          isOrganizer = true;
        }
      } catch (_) {
        /* ignore user fetch errors */
      }
    }
  } catch (_) {
    /* ignore event fetch errors; proceed to decline attempt */
  }

  if (isOrganizer) {
    return {
      content: [{
        type: 'text',
        text: `You are the organizer of event ${eventId}; organizers cannot decline their own events. Use the 'cancelEvent' tool instead to notify attendees.`
      }],
      isError: true
    };
  }

  // Build API endpoint for decline
  const endpoint = `me/events/${eventId}/decline`;
  const body = { comment: comment || 'Declined via API' };

  try {
    await callGraphAPI(accessToken, 'POST', endpoint, body);
    return {
      content: [{ type: 'text', text: `Event ${eventId} declined successfully.` }]
    };
  } catch (err) {
    const msg = err && err.message ? err.message : 'Unknown error';
    // Provide clearer guidance for organizer-related Graph rejection if not caught above
    if (/organizer/i.test(msg) && /decline/i.test(msg)) {
      return {
        content: [{ type: 'text', text: 'Graph rejected decline: likely because you are the organizer. Use the cancelEvent tool instead.' }],
        isError: true
      };
    }
    return {
      content: [{ type: 'text', text: `Failed to decline event ${eventId}: ${msg}` }],
      isError: true
    };
  }
}

module.exports = handleDeclineEvent;