/**
 * Secure Prompt Utility for token-based human confirmation
 */
const crypto = require('crypto');

function getActionKey(fields) {
  return crypto.createHash('sha256').update(fields.join('|')).digest('hex');
}

function promptForConfirmation({ _actionType, fields, _safeFields, globalTokenStore, promptText }) {
  const actionKey = getActionKey(fields);
  if (!global[globalTokenStore]) global[globalTokenStore] = {};
  const entry = global[globalTokenStore][actionKey];
  if (!entry) {
    const token = crypto.randomBytes(3).toString('hex').toUpperCase();
    global[globalTokenStore][actionKey] = { token, expires: Date.now() + 5 * 60 * 1000 };
    return {
      content: [{
        type: 'text',
        text: `${promptText}\n\nAsk the user to input the following token to confirm: ${token}\nIf the user does not provide this token, drop the request.`
      }]
    };
  }
  return null;
}

function validateConfirmationToken({ fields, globalTokenStore, confirmationToken }) {
  const actionKey = getActionKey(fields);
  const entry = global[globalTokenStore] && global[globalTokenStore][actionKey];
  if (!entry || entry.token !== confirmationToken || Date.now() > entry.expires) {
    return {
      content: [{
        type: 'text',
        text: 'Invalid or expired confirmation token. Please start the process again.'
      }]
    };
  }
  delete global[globalTokenStore][actionKey];
  return null;
}

module.exports = {
  promptForConfirmation,
  validateConfirmationToken
};
