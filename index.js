
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
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const config = require('./config');

// Import module tools
const { authTools } = require('./auth');
const { calendarTools } = require('./calendar');
const { emailTools } = require('./email');
const { folderTools } = require('./folder');
const { rulesTools } = require('./rules');

// Log startup information
console.error(`STARTING ${config.SERVER_NAME.toUpperCase()} MCP SERVER`);
console.error(`Test mode is ${config.USE_TEST_MODE ? 'enabled' : 'disabled'}`);


// Combine all tools
const TOOLS = [
  ...authTools,
  ...calendarTools,
  ...emailTools,
  ...folderTools,
  ...rulesTools
  // Future modules: contactsTools, etc.
];

// Debug: Print all registered tool names and count
console.error('DEBUG: Registered tools:', TOOLS.map(t => t.name));
console.error('DEBUG: Tool count:', TOOLS.length);

// Create server with tools capabilities
const mcpServer = new McpServer(
  { name: config.SERVER_NAME, version: config.SERVER_VERSION },
  { 
    capabilities: { 
      tools: TOOLS.reduce((acc, tool) => {
        acc[tool.name] = {};
        return acc;
      }, {})
    } 
  }
);

// Handle all requests
mcpServer.fallbackRequestHandler = async (request) => {
  try {
    console.error('DEBUG: Entered fallbackRequestHandler');
    console.error('FULL REQUEST:', JSON.stringify(request));
    const { method, params, id } = request;
    console.error(`REQUEST: ${method} [${id}]`);

    // Log available tools for debugging
    console.error('DEBUG: Available tools:', TOOLS.map(t => t.name));

    // Initialize handler
    if (method === "initialize") {
      console.error(`DEBUG: Handling initialize request [${id}]`);
      return {
        protocolVersion: "2024-11-05",
        capabilities: { 
          tools: TOOLS.reduce((acc, tool) => {
            acc[tool.name] = {};
            return acc;
          }, {})
        },
        serverInfo: { name: config.SERVER_NAME, version: config.SERVER_VERSION }
      };
    }

    // Tools list handler
    if (method === "tools/list") {
      console.error(`DEBUG: Handling tools/list request [${id}]`);
      console.error(`DEBUG: Tools count: ${TOOLS.length}`);
      console.error(`DEBUG: Tools names: ${TOOLS.map(t => t.name).join(', ')}`);

      return {
        tools: TOOLS.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    }

    // Required empty responses for other capabilities
    if (method === "resources/list") {
      console.error(`DEBUG: Handling resources/list request [${id}]`);
      return { resources: [] };
    }
    if (method === "prompts/list") {
      console.error(`DEBUG: Handling prompts/list request [${id}]`);
      return { prompts: [] };
    }

    // Tool call handler
    if (method === "tools/call") {
      try {
        const { name, arguments: args = {} } = params || {};
        console.error(`DEBUG: Handling tools/call request for tool: ${name}`);

        // Enhanced debugging for tool lookup
        console.error('DEBUG: Current TOOLS array:', TOOLS.map(tool => ({ name: tool.name, handler: !!tool.handler })));
        console.error(`DEBUG: Searching for tool: ${name}`);

        const tool = TOOLS.find(t => t.name === name);
        if (tool) {
          console.error(`DEBUG: Tool found: ${name}`);
          console.error(`DEBUG: Tool details:`, {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            hasHandler: !!tool.handler
          });

          if (tool.handler) {
            return await tool.handler(args);
          } else {
            console.error(`DEBUG: Tool handler missing for: ${name}`);
          }
        } else {
          console.error(`DEBUG: Tool not found: ${name}`);
        }

        // Tool not found
        return {
          error: {
            code: -32601,
            message: `Tool not found: ${name}`
          }
        };
      } catch (error) {
        console.error(`DEBUG: Error in tools/call:`, error);
        return {
          error: {
            code: -32603,
            message: `Error processing tool call: ${error.message}`
          }
        };
      }
    }

    // For any other method, return method not found
    console.error(`DEBUG: Method not found: ${method}`);
    return {
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
  } catch (error) {
    console.error(`DEBUG: Error in fallbackRequestHandler:`, error);
    return {
      error: {
        code: -32603,
        message: `Error processing request: ${error.message}`
      }
    };
  }
};

// Make the script executable
process.on('SIGTERM', () => {
  console.error('SIGTERM received but staying alive');
});

// Start the server
const transport = new StdioServerTransport();
mcpServer.connect(transport)
  .then(() => console.error(`${config.SERVER_NAME} connected and listening`))
  .catch(error => {
    console.error(`Connection error: ${error.message}`);
    process.exit(1);
  });
