# Mock Server Testing Guide

This guide shows you how to test your Outlook MCP server using the local mock Graph API server.

## Quick Start

### Terminal 1: Start Mock Server
```powershell
cd C:\dev-local\outlook-mcp
.\setup-mock-server.ps1
```

OR manually:
```powershell
cd test\mock-graph-server
npm install
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║  Mock Microsoft Graph API Server                          ║
║  Running on: http://localhost:4000                        ║
╚════════════════════════════════════════════════════════════╝
```

### Terminal 2: Start MCP Server
```powershell
cd C:\dev-local\outlook-mcp
node index.js
```

### Terminal 3: Test via TCP Client
```powershell
cd C:\dev-local\outlook-mcp
.\test-direct.ps1
```

## What Gets Mocked

The mock server provides:

### Email Operations
- ✅ List emails (1 sample email in inbox)
- ✅ Read email content
- ✅ Send email (logs to console, doesn't actually send)
- ✅ Mark as read/unread
- ✅ Search emails

### Calendar Operations
- ✅ List events (1 sample event)
- ✅ Create events
- ✅ Update events
- ✅ Delete events

### Folder Operations
- ✅ List folders (Inbox, Sent Items, Drafts)
- ✅ Create folders
- ✅ Move emails between folders

### Rule Operations
- ✅ List inbox rules
- ✅ Create inbox rules
- ✅ Update rule sequence

## Testing Scenarios

### Scenario 1: Test Email Listing

**Via Claude Desktop:**
"List my recent emails"

**Expected Result:**
```
Subject: Welcome to Mock Graph API
From: Test User <test@mockdomain.com>
Received: [timestamp]
Preview: This is a test email from the mock server
```

### Scenario 2: Test Email Sending

**Via Claude Desktop:**
"Send an email to test@example.com with subject 'Test' and body 'Hello World'"

**Mock Server Console Output:**
```
[MOCK] Send email: Test
       To: test@example.com
```

**MCP Response:**
```
Email sent successfully!
Subject: Test
Recipients: 1
Message Length: 11 characters
```

### Scenario 3: Test Calendar

**Via Claude Desktop:**
"What events do I have coming up?"

**Expected Result:**
```
Subject: Mock Calendar Event
Start: [tomorrow's date]
Location: Mock Conference Room
```

## Switching Between Mock and Real

### Use Mock Server (Testing)
```bash
# In .env
USE_TEST_MODE=true
GRAPH_API_ENDPOINT=http://localhost:4000/v1.0/
```

### Use Real Microsoft Graph (Production)
```bash
# In .env
USE_TEST_MODE=false
GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0/
MS_CLIENT_ID=your-real-client-id
MS_CLIENT_SECRET=your-real-client-secret
```

## Monitoring Mock Server

Watch the mock server console to see all API requests:
```
[MOCK] List emails
[MOCK] Get email: msg-001
[MOCK] Send email: Test Subject
[MOCK] Create calendar event: Team Meeting
[MOCK] List mail folders
```

## Adding Mock Data

Edit `test/mock-graph-server/server.js` to add more test data:

```javascript
const mockData = {
  emails: [
    {
      id: 'msg-002',
      subject: 'Your Custom Test Email',
      from: { emailAddress: { name: 'Boss', address: 'boss@company.com' } },
      // ... more fields
    }
  ]
};
```

## Troubleshooting

### Mock server won't start
- Check port 4000 is not in use: `netstat -ano | findstr :4000`
- Try different port: `$env:MOCK_GRAPH_PORT=4001; npm start`

### MCP server still hitting real Graph API
- Verify `.env` has `GRAPH_API_ENDPOINT=http://localhost:4000/v1.0/`
- Restart MCP server after changing .env
- Check config.js is loading environment variables

### No data returned
- Verify mock server is running on port 4000
- Check mock server console for incoming requests
- Look for CORS or network errors in logs

## Next Steps

Once you've tested with the mock server:

1. Apply for Microsoft 365 Developer Program (free)
2. Get real credentials
3. Update .env with real credentials
4. Set `USE_TEST_MODE=false`
5. Remove `GRAPH_API_ENDPOINT` override
6. Test with real Outlook data!
