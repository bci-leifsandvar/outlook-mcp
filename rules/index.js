/**
 * Email rules management module for Outlook MCP server
 */
const { handleListRules } = require('./list');
const { handleCreateRule } = require('./create');

// Import required utilities
const { ensureAuthenticated } = require('../auth');
const { callGraphAPI } = require('../utils/graph-api');

// Import getInboxRules for the edit sequence tool
const { getInboxRules } = require('./list');

/**
 * Edit rule sequence handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleEditRuleSequence(args) {
  const { ruleName, sequence, confirmationToken } = args;
  const { sanitizeText, isSuspicious } = require('../utils/sanitize');
  const { SECURE_PROMPT_MODE } = require('../config');
  const { promptForConfirmation, validateConfirmationToken } = require('../utils/secure-prompt');
  if (!ruleName) {
    return {
      content: [{ 
        type: 'text', 
        text: 'Rule name is required. Please specify the exact name of an existing rule.'
      }]
    };
  }
  if (!sequence || isNaN(sequence) || sequence < 1) {
    return {
      content: [{ 
        type: 'text', 
        text: 'A positive sequence number is required. Lower numbers run first (higher priority).'
      }]
    };
  }
  if (SECURE_PROMPT_MODE) {
    const safeRuleName = sanitizeText(ruleName);
    const safeSequence = sanitizeText(sequence.toString());
    if ([ruleName, sequence].some(isSuspicious)) {
      return {
        content: [{
          type: 'text',
          text: 'Suspicious input detected in rule sequence fields. Action blocked.'
        }],
        requiresConfirmation: false
      };
    }
    if (!confirmationToken) {
      return promptForConfirmation({
        actionType: 'editRuleSequence',
        fields: [ruleName, sequence],
        safeFields: [safeRuleName, safeSequence],
        globalTokenStore: '__editRuleSequenceTokens',
        promptText: `SECURE ACTION: Human confirmation required.\nRule: ${safeRuleName}\nNew Sequence: ${safeSequence}`
      });
    } else {
      const tokenResult = validateConfirmationToken({
        fields: [ruleName, sequence],
        globalTokenStore: '__editRuleSequenceTokens',
        confirmationToken
      });
      if (tokenResult) return tokenResult;
      // Proceed to edit rule sequence
    }
  }
  try {
    // Get access token
    const accessToken = await ensureAuthenticated();
    // Get all rules
    const rules = await getInboxRules(accessToken);
    // Find the rule by name
    const rule = rules.find(r => r.displayName === ruleName);
    if (!rule) {
      return {
        content: [{ 
          type: 'text', 
          text: `Rule with name "${ruleName}" not found.`
        }]
      };
    }
    // Update the rule sequence
    const updateResult = await callGraphAPI(
      accessToken,
      'PATCH',
      `me/mailFolders/inbox/messageRules/${rule.id}`,
      {
        sequence: sequence
      }
    );
    return {
      content: [{ 
        type: 'text', 
        text: `Successfully updated the sequence of rule "${ruleName}" to ${sequence}.`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{ 
          type: 'text', 
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }
    return {
      content: [{ 
        type: 'text', 
        text: `Error updating rule sequence: ${error.message}`
      }]
    };
  }
}

// Rules management tool definitions
const rulesTools = [
  {
    name: 'list-rules',
    description: 'Lists inbox rules in your Outlook account',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetails: {
          type: 'boolean',
          description: 'Include detailed rule conditions and actions'
        }
      },
      required: []
    },
    handler: handleListRules
  },
  {
    name: 'create-rule',
    description: 'Creates a new inbox rule',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the rule to create'
        },
        fromAddresses: {
          type: 'string',
          description: 'Comma-separated list of sender email addresses for the rule'
        },
        containsSubject: {
          type: 'string',
          description: 'Subject text the email must contain'
        },
        hasAttachments: {
          type: 'boolean',
          description: 'Whether the rule applies to emails with attachments'
        },
        moveToFolder: {
          type: 'string',
          description: 'Name of the folder to move matching emails to'
        },
        markAsRead: {
          type: 'boolean', 
          description: 'Whether to mark matching emails as read'
        },
        isEnabled: {
          type: 'boolean',
          description: 'Whether the rule should be enabled after creation (default: true)'
        },
        sequence: {
          type: 'number',
          description: 'Order in which the rule is executed (lower numbers run first, default: 100)'
        }
      },
      required: ['name']
    },
    handler: handleCreateRule
  },
  {
    name: 'edit-rule-sequence',
    description: 'Changes the execution order of an existing inbox rule',
    inputSchema: {
      type: 'object',
      properties: {
        ruleName: {
          type: 'string',
          description: 'Name of the rule to modify'
        },
        sequence: {
          type: 'number',
          description: 'New sequence value for the rule (lower numbers run first)'
        }
      },
      required: ['ruleName', 'sequence']
    },
    handler: handleEditRuleSequence
  }
];

module.exports = {
  rulesTools,
  handleListRules,
  handleCreateRule,
  handleEditRuleSequence
};
