
const net = require('net');
const { spawn } = require('child_process');

// Start the MCP server as a child process
const mcpProcess = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Track all connected sockets for response routing
const sockets = new Set();

// Create a TCP server with newline-delimited JSON framing
const server = net.createServer((socket) => {
  sockets.add(socket);
  let buffer = '';

  // Debug: Log new connection
  console.error('[TCP] New client connected');

  // Handle incoming data, split on newlines
  socket.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // Save incomplete line
    for (const line of lines) {
      if (line.trim()) {
        console.error(`[TCP] Received from client: ${line.trim()}`);
        mcpProcess.stdin.write(`${line.trim()}\n`);
      }
    }
  });

  // Pipe MCP server stdout back to TCP socket, line by line
  let mcpBuffer = '';
  mcpProcess.stdout.on('data', (data) => {
    mcpBuffer += data.toString();
    const lines = mcpBuffer.split(/\r?\n/);
    mcpBuffer = lines.pop();
    for (const line of lines) {
      if (line.trim()) {
        // Debug: Log response from MCP server
        console.error(`[TCP] Sending to client: ${line.trim()}`);
        // Write to all connected sockets
        for (const s of sockets) {
          if (!s.destroyed) {
            s.write(`${line.trim()}\n`);
          }
        }
      }
    }
  });

  socket.on('end', () => {
    sockets.delete(socket);
    console.error('[TCP] Client disconnected');
  });

  socket.on('error', (err) => {
    sockets.delete(socket);
    console.error(`[TCP] Socket error: ${err.message}`);
  });
});

server.listen(3333, () => {
  console.log('TCP server listening on port 3333');
});