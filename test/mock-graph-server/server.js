/**
 * Mock Microsoft Graph API Server for Testing
 * Simulates Graph API endpoints without needing a real Microsoft 365 subscription
 */
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Mock data store
const mockData = {
  emails: [
    {
      id: 'msg-001',
      subject: 'Welcome to Mock Graph API',
      from: { emailAddress: { name: 'Test User', address: 'test@mockdomain.com' } },
      toRecipients: [{ emailAddress: { address: 'you@mockdomain.com' } }],
      receivedDateTime: new Date().toISOString(),
      bodyPreview: 'This is a test email from the mock server',
      hasAttachments: false,
      isRead: false,
      importance: 'normal'
    }
  ],
  events: [
    {
      id: 'evt-001',
      subject: 'Mock Calendar Event',
      start: { dateTime: new Date(Date.now() + 86400000).toISOString(), timeZone: 'UTC' },
      end: { dateTime: new Date(Date.now() + 90000000).toISOString(), timeZone: 'UTC' },
      bodyPreview: 'A test calendar event',
      location: { displayName: 'Mock Conference Room' },
      attendees: []
    }
  ],
  folders: [
    { id: 'folder-inbox', displayName: 'Inbox', totalItemCount: 15, unreadItemCount: 3 },
    { id: 'folder-sent', displayName: 'Sent Items', totalItemCount: 25, unreadItemCount: 0 },
    { id: 'folder-drafts', displayName: 'Drafts', totalItemCount: 2, unreadItemCount: 0 }
  ],
  rules: []
};

// OAuth2 Token Endpoint (Mock)
app.post('/oauth2/v2.0/token', (req, res) => {
  console.log('[MOCK] Token request received');
  res.json({
    access_token: 'mock_access_token_' + Date.now(),
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'mock_refresh_token_' + Date.now(),
    scope: 'Mail.Read User.Read Calendars.Read'
  });
});

// Get User Profile
app.get('/v1.0/me', (req, res) => {
  console.log('[MOCK] Get user profile');
  res.json({
    id: 'user-001',
    displayName: 'Mock User',
    mail: 'mockuser@mockdomain.com',
    userPrincipalName: 'mockuser@mockdomain.com'
  });
});

// List Emails
app.get('/v1.0/me/messages', (req, res) => {
  console.log('[MOCK] List emails');
  const top = parseInt(req.query.$top) || 10;
  res.json({
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/me/messages',
    value: mockData.emails.slice(0, top)
  });
});

// Get Single Email
app.get('/v1.0/me/messages/:id', (req, res) => {
  console.log('[MOCK] Get email:', req.params.id);
  const email = mockData.emails.find(e => e.id === req.params.id);
  if (email) {
    res.json({
      ...email,
      body: {
        contentType: 'text',
        content: 'This is the full body of the mock email message.'
      }
    });
  } else {
    res.status(404).json({ error: { message: 'Message not found' } });
  }
});

// Send Email
app.post('/v1.0/me/sendMail', (req, res) => {
  console.log('[MOCK] Send email:', req.body.message.subject);
  console.log('       To:', req.body.message.toRecipients.map(r => r.emailAddress.address).join(', '));
  
  // Simulate success
  res.status(202).send();
});

// List Calendar Events
app.get('/v1.0/me/events', (req, res) => {
  console.log('[MOCK] List calendar events');
  const top = parseInt(req.query.$top) || 10;
  res.json({
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/me/events',
    value: mockData.events.slice(0, top)
  });
});

// Create Calendar Event
app.post('/v1.0/me/events', (req, res) => {
  console.log('[MOCK] Create calendar event:', req.body.subject);
  const newEvent = {
    id: 'evt-' + Date.now(),
    ...req.body
  };
  mockData.events.push(newEvent);
  res.status(201).json(newEvent);
});

// List Mail Folders
app.get('/v1.0/me/mailFolders', (req, res) => {
  console.log('[MOCK] List mail folders');
  res.json({
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/me/mailFolders',
    value: mockData.folders
  });
});

// Create Mail Folder
app.post('/v1.0/me/mailFolders', (req, res) => {
  console.log('[MOCK] Create mail folder:', req.body.displayName);
  const newFolder = {
    id: 'folder-' + Date.now(),
    displayName: req.body.displayName,
    totalItemCount: 0,
    unreadItemCount: 0
  };
  mockData.folders.push(newFolder);
  res.status(201).json(newFolder);
});

// List Inbox Rules
app.get('/v1.0/me/mailFolders/inbox/messageRules', (req, res) => {
  console.log('[MOCK] List inbox rules');
  res.json({
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/me/mailFolders/inbox/messageRules',
    value: mockData.rules
  });
});

// Create Inbox Rule
app.post('/v1.0/me/mailFolders/inbox/messageRules', (req, res) => {
  console.log('[MOCK] Create inbox rule:', req.body.displayName);
  const newRule = {
    id: 'rule-' + Date.now(),
    ...req.body
  };
  mockData.rules.push(newRule);
  res.status(201).json(newRule);
});

// Start server
const PORT = process.env.MOCK_GRAPH_PORT || 4000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Mock Microsoft Graph API Server                          ║
║  Running on: http://localhost:${PORT}                        ║
║                                                            ║
║  To use with your MCP server:                             ║
║  1. Set GRAPH_API_ENDPOINT=http://localhost:${PORT}/       ║
║  2. Set USE_TEST_MODE=true                                 ║
║  3. Use mock tokens (no real OAuth needed)                ║
╚════════════════════════════════════════════════════════════╝
  `);
});
