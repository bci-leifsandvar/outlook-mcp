
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

// Register tools/list handler
mcpServer.setRequestHandler({ method: "tools/list" }, async () => {
  console.error('DEBUG: Handling tools/list request');
  console.error(`DEBUG: Tools count: ${TOOLS.length}`);
  console.error(`DEBUG: Tools names: ${TOOLS.map(t => t.name).join(', ')}`);

  return {
    tools: TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

// Register tools/call handler
mcpServer.setRequestHandler({ method: "tools/call" }, async (request) => {
  try {
    const { name, arguments: args = {} } = request.params || {};
    console.error(`DEBUG: Handling tools/call request for tool: ${name}`);

    // Enhanced debugging for tool lookup
    console.error('DEBUG: Current TOOLS array:', TOOLS.map(tool => ({ name: tool.name, handler: !!tool.handler })));
    console.error(`DEBUG: Searching for tool: ${name}`);

    const tool = TOOLS.find(t => t.name === name);
    if (!tool) {
      console.error(`DEBUG: Tool not found: ${name}`);
      throw new Error(`Tool not found: ${name}`);
    }

    console.error(`DEBUG: Tool found: ${name}`);
    console.error(`DEBUG: Tool details:`, {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      hasHandler: !!tool.handler
    });

    if (!tool.handler) {
      console.error(`DEBUG: Tool handler missing for: ${name}`);
      throw new Error(`Tool handler missing for: ${name}`);
    }

    const result = await tool.handler(args);
    return result;
  } catch (error) {
    console.error(`DEBUG: Error in tools/call:`, error);
    throw error;
  }
});

// Register resources/list handler (required by MCP protocol)
mcpServer.setRequestHandler({ method: "resources/list" }, async () => {
  console.error('DEBUG: Handling resources/list request');
  return { resources: [] };
});

// Register prompts/list handler (required by MCP protocol)
mcpServer.setRequestHandler({ method: "prompts/list" }, async () => {
  console.error('DEBUG: Handling prompts/list request');
  return { prompts: [] };
});

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
