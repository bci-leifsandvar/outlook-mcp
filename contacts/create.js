const { ensureAuthenticated } = require('../auth');
const { callGraphAPI } = require('../utils/graph-api');
const { handleSecureConfirmation } = require('../utils/secure-confirmation');
const { SECURE_PROMPT_MODE } = require('../config');

async function handleCreateContact(args) {
  const { displayName, email, companyName, mobilePhone, businessPhone, confirmationToken } = args;
  if (!displayName || !email) {
    return { content: [{ type: 'text', text: 'displayName and email are required.' }], isError: true };
  }
  if (SECURE_PROMPT_MODE) {
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'createContact',
      fields: [displayName, email, companyName, mobilePhone, businessPhone],
      confirmationToken,
      globalTokenStore: '__createContactTokens',
      promptText: `SECURE ACTION: Create contact\nName: ${displayName}\nEmail: ${email}`
    });
    if (confirmationResult && confirmationResult.confirmationAccepted !== true) {
      return confirmationResult;
    }
  }
  try {
    const accessToken = await ensureAuthenticated();
    const body = {
      displayName,
      emailAddresses: [{ address: email }],
      companyName: companyName || undefined,
      mobilePhone,
      businessPhones: businessPhone ? [businessPhone] : undefined
    };
    await callGraphAPI(accessToken, 'POST', 'me/contacts', body);
    return { content: [{ type: 'text', text: `Contact '${displayName}' created.` }] };
  } catch (e) {
    if (e.message === 'Authentication required') {
      return { content: [{ type: 'text', text: "Authentication required. Please use the 'authenticate' tool first." }], isError: true };
    }
    return { content: [{ type: 'text', text: `Error creating contact: ${e.message}` }], isError: true };
  }
}

module.exports = handleCreateContact;
