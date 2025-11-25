/**
 * Secure Confirmation Tool for MCP
 * Handles token-based human confirmation for sensitive actions
 */
const { promptForConfirmation, validateConfirmationToken } = require('../utils/secure-prompt');
const { sanitizeText, isSuspicious } = require('../utils/sanitize');

/**
 * Secure confirmation handler
 * @param {object} args - { actionType, fields, safeFields, confirmationToken, globalTokenStore, promptText }
 * @returns {object} - MCP response
 */
async function handleSecureConfirmation(args) {
  const { actionType, fields = [], safeFields = [], confirmationToken, globalTokenStore = '__secureActionsTokens', promptText } = args;
  // Sanitize and check for suspicious input
  if (fields.some(isSuspicious)) {
    return {
      content: [{
        type: 'text',
        text: 'Suspicious input detected in secure confirmation fields. Action blocked.'
      }],
      requiresConfirmation: false,
      status: 'blocked'
    };
  }
  if (!confirmationToken) {
    const result = await promptForConfirmation({
      actionType,
      fields,
      safeFields: safeFields.length ? safeFields : fields.map(sanitizeText),
      globalTokenStore,
      promptText: promptText || `SECURE ACTION: Human confirmation required for '${actionType}'. Please confirm to proceed.`
    });
    // When a confirmation is already pending, promptForConfirmation returns null. Return an explicit pending response instead of allowing caller to proceed.
    if (result === null) {
      return {
        content: [{
          type: 'text',
          text: `Confirmation already initiated for '${actionType}'. Provide the previously issued token or actionId (captcha) via confirmationToken to proceed.`
        }],
        requiresConfirmation: true,
        pending: true,
        status: 'pending'
      };
    }
    // Wrap initial prompt with status metadata
    return {
      ...result,
      requiresConfirmation: true,
      status: 'prompt'
    };
  } else {
    const tokenResult = await validateConfirmationToken({
      fields,
      globalTokenStore,
      confirmationToken
    });
    if (tokenResult) {
      // tokenResult is an object containing content; classify as retry/failure
      return {
        ...tokenResult,
        status: 'retry'
      };
    }
    // Proceed to next step (caller should handle)
    return { confirmationAccepted: true, status: 'accepted' };
  }
}

module.exports = {
  handleSecureConfirmation
};
