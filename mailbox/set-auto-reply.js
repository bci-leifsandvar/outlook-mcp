const { ensureAuthenticated } = require('../auth');
const { callGraphAPI } = require('../utils/graph-api');
const { handleSecureConfirmation } = require('../utils/secure-confirmation');
const { SECURE_PROMPT_MODE } = require('../config');

async function handleSetAutoReply(args) {
  const { status = 'scheduled', internalMessage = '', externalMessage = '', externalAudience = 'contactsOnly', startDateTime, endDateTime, confirmationToken } = args;

  if (SECURE_PROMPT_MODE) {
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'setAutoReply',
      fields: [status, internalMessage, externalMessage, externalAudience, startDateTime, endDateTime],
      confirmationToken,
      globalTokenStore: '__setAutoReplyTokens',
      promptText: `SECURE ACTION: Configure auto-reply\nStatus: ${status}\nExternal Audience: ${externalAudience}`
    });
    if (confirmationResult && confirmationResult.confirmationAccepted !== true) {
      return confirmationResult;
    }
  }

  if (status === 'scheduled' && (!startDateTime || !endDateTime)) {
    return { content: [{ type: 'text', text: 'For scheduled status, startDateTime and endDateTime are required.' }], isError: true };
  }

  try {
    const accessToken = await ensureAuthenticated();
    const automaticRepliesSetting = {
      status,
      externalAudience,
      internalReplyMessage: internalMessage,
      externalReplyMessage: externalMessage
    };
    if (status === 'scheduled') {
      automaticRepliesSetting.scheduledStartDateTime = { dateTime: startDateTime, timeZone: 'UTC' };
      automaticRepliesSetting.scheduledEndDateTime = { dateTime: endDateTime, timeZone: 'UTC' };
    }

    await callGraphAPI(accessToken, 'PATCH', 'me/mailboxSettings', { automaticRepliesSetting });
    return { content: [{ type: 'text', text: 'Auto-reply settings updated successfully.' }] };
  } catch (e) {
    if (e.message === 'Authentication required') {
      return { content: [{ type: 'text', text: "Authentication required. Please use the 'authenticate' tool first." }], isError: true };
    }
    return { content: [{ type: 'text', text: `Error updating auto-reply: ${e.message}` }], isError: true };
  }
}

module.exports = handleSetAutoReply;
