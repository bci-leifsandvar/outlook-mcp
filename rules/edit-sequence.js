const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { secureConfirmation } = require('../utils/secure-confirmation');

const editRuleSequenceTool = {
  name: 'rules_editSequence',
  description: 'Edits the sequence of a mail rule. Requires confirmation.',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: { type: 'string', description: 'The ID of the rule to edit.' },
      sequence: { type: 'number', description: 'The new sequence number for the rule.' },
      confirmationToken: { type: 'string', description: 'A token to confirm the action.' }
    },
    required: ['ruleId', 'sequence']
  },
  handler: async (args) => {
    const { ruleId, sequence, confirmationToken } = args;

    const confirmed = await secureConfirmation({
      toolName: 'rules_editSequence',
      confirmationToken,
      details: { ruleId, sequence }
    });

    if (!confirmed) {
      return confirmed; // Return confirmation request
    }

    try {
      const accessToken = await ensureAuthenticated();
      const endpoint = `me/mailFolders/inbox/messageRules/${ruleId}`;
      const data = { sequence };

      await callGraphAPI(accessToken, 'PATCH', endpoint, data);

      return {
        content: [{
          type: 'text',
          text: `Successfully updated sequence for rule ${ruleId} to ${sequence}.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error editing rule sequence: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

module.exports = {
  editRuleSequenceTool
};
