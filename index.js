// Only load .env if not running under Claude config (i.e., if not already provided)
if (!process.env.CLAUDE_CONFIG && !process.env.CLAUDE_RUNNING) {
  require('dotenv').config();
}
/**
 * Outlook MCP Server - Main entry point
 * 
 * A Model Context Protocol server that provides access to
 * Microsoft Outlook through the Microsoft Graph API.
 */
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');
const config = require('./config');

// Import module tools
const { authTools } = require('./auth');
const { calendarTools } = require('./calendar');
const { emailTools } = require('./email');
const { folderTools } = require('./folder');
const { rulesTools } = require('./rules');

// Log startup information
const { maskPIIinObject } = require('./utils/sanitize');
function structuredLog(level, message, details = {}) {
  // Mask PII in details
  const maskedDetails = maskPIIinObject(details);
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...maskedDetails
  };
  // Output as JSON string for SIEM/monitoring compliance
  console.error(JSON.stringify(entry));
}


// Inject secure action protocol onboarding message for Claude
const SECURE_ACTION_PROTOCOL_MESSAGE = `SECURE ACTION PROTOCOL INSTRUCTION\n\nWhen you receive a message indicating \"SECURE ACTION: Human confirmation required\" and a token, you must:\n\n1. Prompt the user to input the provided token.\n2. Wait for the user’s response.\n3. Include the user’s input as confirmationToken in your next MCP request for this action.\n4. If the token is missing or incorrect, do not proceed and prompt again.\n\nExample:\n- Server:  \"SECURE ACTION: Human confirmation required. ... Ask the user to input the following token to confirm: F91D17 ...\"\n- Claude:  \"Please enter the security code: F91D17\"\n- User:  \"F91D17\"\n- Claude (next request):  { ..., \"confirmationToken\": \"F91D17\" }\n`;
structuredLog('info', `STARTING ${config.SERVER_NAME.toUpperCase()} MCP SERVER`);
structuredLog('info', `Test mode is ${config.USE_TEST_MODE ? 'enabled' : 'disabled'}`);
structuredLog('info', 'SECURE ACTION PROTOCOL MESSAGE', { onboarding: SECURE_ACTION_PROTOCOL_MESSAGE });

// Combine all tools

// Secure actions rule: mark all non-Read actions as requiring confirmation if secure mode is enabled
const SECURE_ACTIONS_RULE = config.SECURE_PROMPT_MODE
  ? {
      enabled: true,
      requireConfirmation: (toolName) => {
        // Mark any tool that is not a "read" action as secure
        return !/read/i.test(toolName);
      }
    }
  : { enabled: false };

const TOOLS = [
  ...authTools,
  ...calendarTools,
  ...emailTools,
  ...folderTools,
  ...rulesTools
];

// Debug: Print all registered tool names and count
structuredLog('debug', 'Registered tools', { tools: TOOLS.map(t => t.name) });
structuredLog('debug', 'Tool count', { count: TOOLS.length });

// Create server instance
const server = new Server(
  {
    name: config.SERVER_NAME,
    version: config.SERVER_VERSION,
    onboarding: SECURE_ACTION_PROTOCOL_MESSAGE // Inject onboarding message into initial MCP context
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// Register tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  structuredLog('debug', 'Handling tools/list request');
  
  return {
    tools: TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};

  structuredLog('debug', `Executing tool: ${toolName}`, { args });

  // Find the tool
  const tool = TOOLS.find(t => t.name === toolName);

  if (!tool) {
    return {
      content: [{
        type: 'text',
        text: `Tool '${toolName}' not found`
      }],
      isError: true
    };
  }

  // Enforce secure workflow for non-Read actions if secure mode is enabled
  if (SECURE_ACTIONS_RULE.enabled && SECURE_ACTIONS_RULE.requireConfirmation(toolName)) {
    // If confirmationToken is missing, prompt for confirmation
    if (!args.confirmationToken) {
      const { promptForConfirmation } = require('./utils/secure-prompt');
      return promptForConfirmation({
        actionType: toolName,
        fields: Object.values(args),
        safeFields: Object.values(args),
        globalTokenStore: '__secureActionsTokens',
        promptText: `SECURE ACTION: Human confirmation required for '${toolName}'. Please confirm to proceed.`
      });
    } else {
      const { validateConfirmationToken } = require('./utils/secure-prompt');
      const tokenResult = validateConfirmationToken({
        fields: Object.values(args),
        globalTokenStore: '__secureActionsTokens',
        confirmationToken: args.confirmationToken
      });
      if (tokenResult) return tokenResult;
      // Proceed to tool handler
    }
  }

  try {
    // Execute the tool handler
    const result = await tool.handler(args);

    // Ensure result is in proper MCP format
    if (result && result.content) {
      return result;
    }

    // Wrap result if needed
    return {
      content: [{
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    structuredLog('error', `Tool execution error: ${error.message}`, { toolName, error: error.stack });
    return {
      content: [{
        type: 'text',
        text: `Error executing tool '${toolName}': ${error.message}`
      }],
      isError: true
    };
  }
});

// Register resources/list handler (empty - required by protocol)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

// Register prompts/list handler (empty - required by protocol)
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: [] };
});

structuredLog('debug', 'All request handlers registered');

// Handle graceful shutdown
process.on('SIGTERM', () => {
  structuredLog('warn', 'SIGTERM received but staying alive');
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport)
  .then(() => structuredLog('info', `${config.SERVER_NAME} connected and listening`))
  .catch(error => {
    structuredLog('error', `Connection error: ${error.message}`, { error: error.stack });
    process.exit(1);
  });
