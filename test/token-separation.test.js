// Tests ensuring secure confirmation codes are distinct from OAuth authentication tokens
beforeAll(() => {
  process.env.USE_TEST_MODE = 'true'; // use test mode for deterministic auth token creation
  process.env.SECURE_PROMPT_MODE = 'true'; // enable secure confirmation
  jest.resetModules();
});

describe('Token separation between OAuth and secure confirmation', () => {
  test('authenticate does not request confirmation token and message clarifies separation', () => {
    const { handleAuthenticate, authTools } = require('../auth/tools');
    const authDef = authTools.find(t => t.name === 'authenticate');
    expect(authDef).toBeDefined();
    // authenticate input schema should not include confirmationToken anymore
    expect(Object.keys(authDef.inputSchema.properties)).not.toContain('confirmationToken');
    const result = handleAuthenticate({ confirmationToken: 'FAKE123' }); // ignored if passed
    expect(result.content[0].text).toMatch(/Successfully authenticated/);
    expect(result.content[0].text).toMatch(/distinct from any secure confirmation codes/i);
    expect(result.content[0].text).not.toMatch(/SECURE ACTION/);
  });

  test('send-email secure confirmation code differs from OAuth access token', async () => {
    const { ensureAuthenticated } = require('../auth');
    const handleSendEmail = require('../email/send');
    // First ensure we have an auth token
    const { handleAuthenticate } = require('../auth/tools');
    handleAuthenticate({});
    const accessToken = ensureAuthenticated();
    expect(accessToken).toMatch(/test_access_token_/);

    // Trigger secure confirmation
    const first = await handleSendEmail({
      to: 'user@example.com',
      subject: 'Separation Test',
      body: 'Testing secure confirmation separation.'
    });
    expect(first.content[0].text).toMatch(/SECURE ACTION: Human confirmation required/);
    const tokenMatch = first.content[0].text.match(/Security code: ([A-F0-9]{6})/);
    expect(tokenMatch).toBeTruthy();
    const confirmationCode = tokenMatch[1];
    expect(confirmationCode.length).toBe(6);
    // Ensure code is not part of access token
    expect(accessToken.includes(confirmationCode)).toBe(false);

    // Complete confirmation
    const second = await handleSendEmail({
      to: 'user@example.com',
      subject: 'Separation Test',
      body: 'Testing secure confirmation separation.',
      confirmationToken: confirmationCode
    });
    expect(second.content[0].text).toMatch(/Email sent successfully/);
    // Success message should not leak access token or confirmation code
    expect(second.content[0].text).not.toContain(accessToken);
    expect(second.content[0].text).not.toContain(confirmationCode);
  });
});
