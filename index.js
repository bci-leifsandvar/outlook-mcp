// Load .env unless a known MCP client provides its own environment
// Skip when running under Claude, OpenAI ChatGPT MCP wrapper, or generic MCP orchestrators
if (!process.env.CLAUDE_CONFIG && !process.env.CLAUDE_RUNNING &&
    !process.env.OPENAI_MCP && !process.env.MCP_CLIENT) {
  require('dotenv').config();
}
/**
 * Outlook MCP Server - Main entry point
 * FIXED: Clearer onboarding instructions for secure confirmation flow
 * 
 * A Model Context Protocol server that provides access to
 * Microsoft Outlook through the Microsoft Graph API.
 * Compatible with any MCP client (Claude Desktop, OpenAI / ChatGPT MCP workers,
 * generic OpenAPI MCP bridges, and other tool runners) via stdio transport.
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
// Spawn subservers (auth and secure confirmation) as child processes if not already running
const { spawn } = require('child_process');
const net = require('net');
function isPortInUse(port, cb) {
  const tester = net.createServer()
    .once('error', err => (err.code === 'EADDRINUSE' ? cb(true) : cb(false)))
    .once('listening', () => tester.once('close', () => cb(false)).close())
    .listen(port);
}

function spawnSubserver(port, scriptPath, name) {
  isPortInUse(port, (inUse) => {
    if (!inUse) {
      spawn(process.execPath, [scriptPath], {
        stdio: 'inherit',
        detached: true
      });
      console.error(`Spawned ${name} on port ${port}`);
    } else {
      console.error(`${name} already running on port ${port}`);
    }
  });
}

spawnSubserver(3333, require('path').resolve(__dirname, 'auth', 'outlook-auth-server.js'), 'Outlook Auth Server');
spawnSubserver(4000, require('path').resolve(__dirname, 'secure-confirmation-server.js'), 'Secure Confirmation Server');
const logger = require('./utils/logger');

// Generic onboarding message for ALL MCP clients (no vendor-specific instructions)
const SECURE_ACTION_PROTOCOL_MESSAGE = `
SECURE ACTION PROTOCOL FOR OUTLOOK MCP

This server can enforce human approval for sensitive actions (send email, create/delete/move items, rule changes) using either:
1. Token-based confirmation (default) OR
2. Browser captcha/code confirmation (if SECURE_CONFIRM_MODE=captcha)

WHEN YOU RECEIVE A SECURE ACTION MESSAGE:
It will contain: "SECURE ACTION: Human confirmation required".

TOKEN MODE:
• Message includes a short code (e.g. A1B2C3)
• Ask user to provide it, then re-invoke the SAME tool with confirmationToken: "<CODE>".

CAPTCHA MODE:
• Message includes a URL like http://localhost:4000/confirm/<actionId>
• Instruct user to open it in a browser and enter the displayed code.
• After completion, re-invoke the SAME tool with confirmationToken: "<actionId>".

NOTES:
• Codes/actionIds expire quickly—restart if invalid.
• Never treat codes as authentication credentials.
• Each confirmation applies only to the original action parameters.
`;

logger.info(`STARTING ${config.SERVER_NAME.toUpperCase()} MCP SERVER`);
logger.info(`Test mode is ${config.USE_TEST_MODE ? 'enabled' : 'disabled'}`);
logger.info('SECURE ACTION PROTOCOL MESSAGE', { onboarding: SECURE_ACTION_PROTOCOL_MESSAGE });

// Combine all tools
const TOOLS = [
  ...authTools,
  ...calendarTools,
  ...emailTools,
  ...folderTools,
  ...rulesTools
];

// Debug: Print all registered tool names and count
logger.debug('Registered tools', { tools: TOOLS.map(t => t.name) });
logger.debug('Tool count', { count: TOOLS.length });

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
server.setRequestHandler(ListToolsRequestSchema, () => {
  logger.debug('Handling tools/list request');
  
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

  logger.debug(`Executing tool: ${toolName}`, { 
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
    logger.debug(`Tool ${toolName} requires confirmation`, {
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
      const tokenMatch = result.content[0].text.match(/token to confirm: ([A-Z0-9]{6})/);
      if (tokenMatch) {
        result.content.push({
          type: 'text',
          text: `\n[CLIENT ACTION]: Ask user for security code ${tokenMatch[1]} then re-invoke '${toolName}' with original parameters plus confirmationToken: "${tokenMatch[1]}".`
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
    logger.error(`Tool execution error: ${error.message}`, { toolName, error: error.stack });
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
server.setRequestHandler(ListResourcesRequestSchema, () => {
  return { resources: [] };
});

// Register prompts/list handler (empty - required by protocol)
server.setRequestHandler(ListPromptsRequestSchema, () => {
  return { prompts: [] };
});

logger.debug('All request handlers registered');

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received but staying alive');
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport)
  .then(() => logger.info(`${config.SERVER_NAME} connected and listening`))
  .catch(error => {
    logger.error(`Connection error: ${error.message}`, { error: error.stack });
    process.exit(1);
  });