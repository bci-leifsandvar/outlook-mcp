const { ensureAuthenticated } = require('../auth');
const { callGraphAPI } = require('../utils/graph-api');

async function handleGetMailboxSettings() {
  try {
    const accessToken = await ensureAuthenticated();
    const data = await callGraphAPI(accessToken, 'GET', 'me/mailboxSettings');
    // Format subset for readability
    const summary = {
      timeZone: data.timeZone,
      automaticallyAdjustForDaylightSavingTime: data.automaticallyAdjustForDaylightSavingTime,
      language: data.language,
      workingHours: data.workingHours,
      automaticRepliesSetting: data.automaticRepliesSetting
    };
    return { content: [{ type: 'text', text: `Mailbox Settings:\n${JSON.stringify(summary, null, 2)}` }] };
  } catch (e) {
    if (e.message === 'Authentication required') {
      return { content: [{ type: 'text', text: "Authentication required. Please use the 'authenticate' tool first." }], isError: true };
    }
    return { content: [{ type: 'text', text: `Error retrieving mailbox settings: ${e.message}` }], isError: true };
  }
}

module.exports = handleGetMailboxSettings;
