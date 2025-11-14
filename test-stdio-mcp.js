#!/usr/bin/env node
// Minimal stdio test for MCP server
const { spawn } = require('child_process');

const mcpProcess = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const initRequest = '{"jsonrpc":"2.0","id":"init-1","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}\n';
const aboutRequest = '{"jsonrpc":"2.0","id":"about-test","method":"tools/call","params":{"name":"about","arguments":{}}}\n';

let sentAbout = false;
mcpProcess.stdout.on('data', (data) => {
  console.log('STDIO MCP server response:', data.toString());
  if (!sentAbout) {
    mcpProcess.stdin.write(aboutRequest);
    sentAbout = true;
  } else {
    mcpProcess.stdin.end();
    mcpProcess.kill();
  }
});

setTimeout(() => {
  mcpProcess.stdin.write(initRequest);
}, 1000);
