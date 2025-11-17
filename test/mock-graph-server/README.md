# Mock Microsoft Graph API Server

A lightweight mock server that simulates Microsoft Graph API endpoints for testing the Outlook MCP server without requiring a Microsoft 365 subscription.

## Quick Start

### 1. Install Dependencies

```bash
cd test/mock-graph-server
npm install
```

### 2. Start the Mock Server

```bash
npm start
```

The server will start on `http://localhost:4000` (or set `MOCK_GRAPH_PORT` to change)

### 3. Configure Your MCP Server

Update your `config.js` or add to `.env`:

```javascript
// In config.js, change:
GRAPH_API_ENDPOINT: process.env.GRAPH_API_ENDPOINT || 'http://localhost:4000/v1.0/'

// Or in .env:
GRAPH_API_ENDPOINT=http://localhost:4000/v1.0/
USE_TEST_MODE=true
```

### 4. Test Your MCP Server

Now all Graph API calls will be intercepted by the mock server!

```bash
npm start  # Start your MCP server
```

## Supported Endpoints

### Email Operations
- `GET /v1.0/me/messages` - List emails
- `GET /v1.0/me/messages/:id` - Get single email
- `POST /v1.0/me/sendMail` - Send email (simulated)
- `PATCH /v1.0/me/messages/:id` - Update email

### Calendar Operations
- `GET /v1.0/me/events` - List calendar events
- `POST /v1.0/me/events` - Create event
- `PATCH /v1.0/me/events/:id` - Update event
- `DELETE /v1.0/me/events/:id` - Delete event

### Folder Operations
- `GET /v1.0/me/mailFolders` - List folders
- `POST /v1.0/me/mailFolders` - Create folder

### Rules Operations
- `GET /v1.0/me/mailFolders/inbox/messageRules` - List rules
- `POST /v1.0/me/mailFolders/inbox/messageRules` - Create rule

## Mock Data

The server starts with:
- 1 sample email in inbox
- 1 sample calendar event
- 3 default folders (Inbox, Sent Items, Drafts)
- Empty rules list

## Limitations

This is a simple mock for testing basic functionality. It does NOT:
- Implement OAuth2 authentication (uses mock tokens)
- Persist data (resets on restart)
- Support all Graph API features
- Validate request schemas strictly
- Handle pagination correctly
- Support complex queries ($filter, $search, etc.)

## For Production Testing

Use the **Microsoft 365 Developer Program** instead (FREE):
https://developer.microsoft.com/en-us/microsoft-365/dev-program
