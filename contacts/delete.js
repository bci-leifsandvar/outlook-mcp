const { ensureAuthenticated } = require('../auth');
const { callGraphAPI } = require('../utils/graph-api');
const { handleSecureConfirmation } = require('../utils/secure-confirmation');
const { SECURE_PROMPT_MODE } = require('../config');

async function handleDeleteContact(args) {
  const { id, confirmationToken } = args;
  if (!id) {
    return { content: [{ type: 'text', text: 'Contact id is required.' }], isError: true };
  }
  if (SECURE_PROMPT_MODE) {
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'deleteContact',
      fields: [id],
      confirmationToken,
      globalTokenStore: '__deleteContactTokens',
      promptText: `SECURE ACTION: Delete contact\nID: ${id}`
    });
    if (confirmationResult && confirmationResult.confirmationAccepted !== true) {
      return confirmationResult;
    }
  }
  try {
    const accessToken = await ensureAuthenticated();
    await callGraphAPI(accessToken, 'DELETE', `me/contacts/${id}`);
    return { content: [{ type: 'text', text: `Contact '${id}' deleted.` }] };
  } catch (e) {
    if (e.message === 'Authentication required') {
      return { content: [{ type: 'text', text: "Authentication required. Please use the 'authenticate' tool first." }], isError: true };
    }
    return { content: [{ type: 'text', text: `Error deleting contact: ${e.message}` }], isError: true };
  }
}

module.exports = handleDeleteContact;
