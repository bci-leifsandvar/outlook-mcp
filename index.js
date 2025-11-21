// Only load .env if not running under Claude config (i.e., if not already provided)
if (!process.env.CLAUDE_CONFIG && !process.env.CLAUDE_RUNNING) {
  require('dotenv').config();
}
/**
 * Outlook MCP Server - Main entry point
 * FIXED: Clearer onboarding instructions for secure confirmation flow
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

// IMPROVED: Clearer onboarding message for Claude with explicit instructions
const SECURE_ACTION_PROTOCOL_MESSAGE = `
SECURE ACTION PROTOCOL FOR OUTLOOK MCP

This server uses confirmation tokens to ensure human approval for sensitive actions like sending emails.

WHEN YOU SEE A CONFIRMATION TOKEN:

1. If the server returns a message with "SECURE ACTION: Human confirmation required" and shows a 6-character token (like "A1B2C3"):
   - DO NOT try to authenticate with this token
   - DO NOT use the authenticate tool
   - This is NOT a login token

2. Instead, you should:
   - Ask the user: "Please confirm this action by typing the security code: [TOKEN]"
   - Wait for the user to type the token back
   - Call THE SAME TOOL AGAIN with all original parameters PLUS confirmationToken: "[user's input]"

3. Example for send-email:
   - First call: send-email with to, subject, body
   - Server responds with token "F91D17"
   - You ask user: "Please confirm sending this email by typing the security code: F91D17"
   - User types: "F91D17"
   - Second call: send-email with to, subject, body, confirmationToken: "F91D17"
   - Email is sent successfully

IMPORTANT: The confirmationToken parameter is ONLY used when retrying the SAME action after receiving a security token. It's not for authentication - it's for confirming the specific action you just tried.
`;

structuredLog('info', `STARTING ${config.SERVER_NAME.toUpperCase()} MCP SERVER`);
structuredLog('info', `Test mode is ${config.USE_TEST_MODE ? 'enabled' : 'disabled'}`);
structuredLog('info', 'SECURE ACTION PROTOCOL MESSAGE', { onboarding: SECURE_ACTION_PROTOCOL_MESSAGE });

// Combine all tools
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

// Register tools/call handler with improved secure action handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};

  structuredLog('debug', `Executing tool: ${toolName}`, { 
    args: Object.keys(args).reduce((acc, key) => {
      // Log args but mask sensitive data
      if (key === 'confirmationToken' || key === 'body') {
        acc[key] = '[REDACTED]';
      } else {
        acc[key] = args[key];
      }
      return acc;
    }, {})
  });

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

  // IMPROVED: Better logging for secure action flow
  const requiresConfirmation = config.SECURE_PROMPT_MODE && 
    /(send|create|delete|update|move|edit)/i.test(toolName);
  
  if (requiresConfirmation) {
    structuredLog('debug', `Tool ${toolName} requires confirmation`, {
      hasToken: !!args.confirmationToken,
      secureMode: config.SECURE_PROMPT_MODE
    });
  }

  try {
    // Execute the tool handler (it will handle confirmation internally)
    const result = await tool.handler(args);

    // IMPROVED: Add context hint if this is a confirmation request
    if (result && result.content && result.content[0] && 
        result.content[0].text && 
        result.content[0].text.includes('SECURE ACTION: Human confirmation required')) {
      
      // Extract the token from the message
      const tokenMatch = result.content[0].text.match(/token to confirm: ([A-Z0-9]{6})/);
      if (tokenMatch) {
        // Add a clear instruction as a separate message
        result.content.push({
          type: 'text',
          text: `\n[INSTRUCTION FOR CLAUDE]: Ask the user to type the token ${tokenMatch[1]}, then call ${toolName} again with ALL original parameters PLUS confirmationToken: "${tokenMatch[1]}"`
        });
      }
    }

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