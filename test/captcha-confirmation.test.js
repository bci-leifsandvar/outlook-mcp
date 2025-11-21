/**
 * Integration test for captcha-based secure confirmation mode.
 */
process.env.USE_TEST_MODE = 'true';
process.env.SECURE_PROMPT_MODE = 'true';
process.env.SECURE_CONFIRM_MODE = 'captcha';

const http = require('http');
const { serverInstance } = require('../secure-confirmation-server.js');
const handleCreateEvent = require('../calendar/create.js');

// Utility to GET a URL and return body
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

// Utility to POST form data
function httpPost(url, form) {
  return new Promise((resolve, reject) => {
    const { hostname, port, path } = new URL(url);
    const body = Object.entries(form).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const options = { hostname, port, path, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

describe('Captcha confirmation flow (createEvent)', () => {
  afterAll(() => {
    serverInstance.close();
  });

  const baseArgs = {
    subject: 'Test Captcha Event',
    start: { dateTime: new Date().toISOString(), timeZone: 'UTC' },
    end: { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: 'UTC' },
    attendees: ['test@example.com'],
    body: 'Event body'
  };

  test('Requires captcha confirmation and completes after browser flow', async () => {
    // First call - should produce confirmation URL
    const first = await handleCreateEvent(baseArgs);
    expect(first.content[0].text).toMatch(/http:\/\/localhost:4000\/confirm\//);

    // Extract actionId from URL
    const urlMatch = first.content[0].text.match(/http:\/\/localhost:4000\/confirm\/([a-f0-9]{16})/i);
    expect(urlMatch).not.toBeNull();
    const actionId = urlMatch[1];

    // Second call with confirmationToken before user confirms -> should still wait
    const second = await handleCreateEvent({ ...baseArgs, confirmationToken: actionId });
    // May respond awaiting confirmation
    const awaiting = second.content[0].text.includes('awaiting') || second.content[0].text.includes('browser');
    expect(awaiting).toBe(true);

    // Simulate user visiting page and submitting code
    const page = await httpGet(`http://localhost:4000/confirm/${actionId}`);
    expect(page.status).toBe(200);
    const codeMatch = page.data.match(/<b>([A-F0-9]{6})<\/b>/);
    expect(codeMatch).not.toBeNull();
    const code = codeMatch[1];
    const submit = await httpPost(`http://localhost:4000/confirm/${actionId}`, { code });
    expect(submit.data).toMatch(/Confirmed!/);

    // Third call with confirmationToken after user confirmation -> should succeed
    const third = await handleCreateEvent({ ...baseArgs, confirmationToken: actionId });
    expect(third.content[0].text).toMatch(/Event 'Test Captcha Event' has been successfully created/);
  });
});
