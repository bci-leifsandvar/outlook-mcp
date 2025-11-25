const { ensureAuthenticated } = require('../auth');
const { callGraphAPI } = require('../utils/graph-api');
const { handleSecureConfirmation } = require('../utils/secure-confirmation');
const { SECURE_PROMPT_MODE } = require('../config');

async function handleUpdateContact(args) {
  const { id, displayName, email, companyName, mobilePhone, businessPhone, confirmationToken } = args;
  if (!id) {
    return { content: [{ type: 'text', text: 'Contact id is required.' }], isError: true };
  }
  if (SECURE_PROMPT_MODE) {
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'updateContact',
      fields: [id, displayName, email, companyName, mobilePhone, businessPhone],
      confirmationToken,
      globalTokenStore: '__updateContactTokens',
      promptText: `SECURE ACTION: Update contact\nID: ${id}\nName: ${displayName || 'unchanged'}\nEmail: ${email || 'unchanged'}`
    });
    if (confirmationResult && confirmationResult.confirmationAccepted !== true) {
      return confirmationResult;
    }
  }
  try {
    const accessToken = await ensureAuthenticated();
    const body = {};
    if (displayName) body.displayName = displayName;
    if (email) body.emailAddresses = [{ address: email }];
    if (companyName) body.companyName = companyName;
    if (mobilePhone) body.mobilePhone = mobilePhone;
    if (businessPhone) body.businessPhones = [businessPhone];
    await callGraphAPI(accessToken, 'PATCH', `me/contacts/${id}`, body);
    return { content: [{ type: 'text', text: `Contact '${id}' updated.` }] };
  } catch (e) {
    if (e.message === 'Authentication required') {
      return { content: [{ type: 'text', text: "Authentication required. Please use the 'authenticate' tool first." }], isError: true };
    }
    return { content: [{ type: 'text', text: `Error updating contact: ${e.message}` }], isError: true };
  }
}

module.exports = handleUpdateContact;
