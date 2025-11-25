// Integration tests for core MCP tool handlers in test mode
// Test strategy: Run handlers directly with USE_TEST_MODE enabled to exercise logic
// without external Graph API calls (mock-data simulation is used).

beforeAll(() => {
  process.env.USE_TEST_MODE = 'true';
  process.env.SECURE_PROMPT_MODE = 'false'; // disable confirmation for basic tests
  jest.resetModules();
});

describe('Authentication (test mode)', () => {
  test('authenticate returns success in test mode', async () => {
    const { handleAuthenticate } = require('../auth/tools');
    const result = handleAuthenticate({});
    expect(result).toBeDefined();
    expect(result.content[0].text).toMatch(/Successfully authenticated/);
  });

  test('ensureAuthenticated returns test token', () => {
    const { ensureAuthenticated } = require('../auth');
    // authenticate first to create tokens
    const { handleAuthenticate } = require('../auth/tools');
    handleAuthenticate({});
    const token = ensureAuthenticated();
    expect(token).toMatch(/test_access_token_/);
  });
});

describe('Email tools (test mode)', () => {
  test('list-emails returns simulated list', async () => {
    const handleListEmails = require('../email/list');
    const result = await handleListEmails({});
    expect(result.content[0].text).toMatch(/Found .* emails in inbox/);
  });

  test('read-email returns simulated email content', async () => {
    const handleReadEmail = require('../email/read');
    // Simulated single email endpoint id used by mock-data
    const result = await handleReadEmail({ id: 'simulated-email-id' });
    expect(result.content[0].text).toMatch(/Subject: Test Email: Please Ignore/);
  });
});

describe('Folder tools (test mode)', () => {
  test('list-folders returns folder names', async () => {
    const handleListFolders = require('../folder/list');
    const result = await handleListFolders({});
    expect(result.content[0].text).toMatch(/Inbox/);
  });
});

describe('Rules tools (test mode)', () => {
  test('list-rules returns rules list or no-rules message (mock)', async () => {
    const { handleListRules } = require('../rules/list');
    const result = await handleListRules({});
    expect(result.content[0].text).toMatch(/(No inbox rules found|Found \d+ inbox rules)/);
  });
});

describe('Secure confirmation flows', () => {
  beforeAll(() => {
    // Enable secure prompt mode and reset modules so config re-reads env
    process.env.SECURE_PROMPT_MODE = 'true';
    jest.resetModules();
    // Re-authenticate to ensure token present
    const { handleAuthenticate } = require('../auth/tools');
    handleAuthenticate({});
  });

  test('create-event prompts for confirmation then succeeds', async () => {
    const handleCreateEvent = require('../calendar/create');
    const first = await handleCreateEvent({
      subject: 'Test Event',
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      attendees: ['user@example.com'],
      body: 'Event body'
    });
    expect(first.content[0].text).toMatch(/SECURE ACTION: Human confirmation required/);
    const tokenMatch = first.content[0].text.match(/token to confirm: ([A-Z0-9]{6})/) || first.content[0].text.match(/Security code: ([A-Z0-9]{6})/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch[1];
    const second = await handleCreateEvent({
      subject: 'Test Event',
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      attendees: ['user@example.com'],
      body: 'Event body',
      confirmationToken: token
    });
    expect(second.content[0].text).toMatch(/Event 'Test Event' has been successfully created/);
  });
});
