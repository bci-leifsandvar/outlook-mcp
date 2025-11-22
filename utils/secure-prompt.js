/**
 * Secure Prompt Utility for human confirmation.
 * Supports two modes:
 * 1. Token-based (default)
 * 2. Captcha/browser confirmation server (if SECURE_CONFIRM_USE_CAPTCHA=true)
 */
const crypto = require('crypto');
const http = require('http');

// Confirmation mode: 'token' (default) or 'captcha'
const confirmMode = (process.env.SECURE_CONFIRM_MODE || 'token').toLowerCase();
const useCaptcha = confirmMode === 'captcha';
const CAPTCHA_PORT = process.env.SECURE_CONFIRM_PORT || 4000;

function getActionKey(fields) {
  return crypto.createHash('sha256').update(fields.join('|')).digest('hex');
}

function promptForConfirmation({ actionType, fields, safeFields, globalTokenStore, promptText }) {
  const actionKey = getActionKey(fields);
  if (!global[globalTokenStore]) global[globalTokenStore] = {};
  const entry = global[globalTokenStore][actionKey];

  // If entry already exists (token or captcha pending) do nothing (caller will request re-validation)
  if (entry) return null;

  // Captcha/browser confirmation flow
  if (useCaptcha) {
    // Prepare POST body for secure-confirmation-server
    const payload = JSON.stringify({
      to: safeFields && safeFields[0] ? safeFields[0] : '',
      subject: safeFields && safeFields[1] ? safeFields[1] : actionType,
      body: safeFields && safeFields[2] ? safeFields[2] : ''
    });

    const options = {
      hostname: 'localhost',
      port: CAPTCHA_PORT,
      path: '/api/create-confirmation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            // Store actionId for later validation
            global[globalTokenStore][actionKey] = { actionId: json.actionId, expires: Date.now() + 10 * 60 * 1000 };
            resolve({
              content: [{
                type: 'text',
                text: `${promptText}\n\n[CLIENT ACTION] Open ${json.confirmUrl} in a browser and enter the code shown. After completion, re-run the SAME tool with confirmationToken: "${json.actionId}". If not confirmed yet you'll be asked again.`
              }]
            });
          } catch (e) {
            resolve({
              content: [{
                type: 'text',
                text: `Failed to parse confirmation server response. Ensure secure-confirmation-server is running on port ${CAPTCHA_PORT}.`
              }]
            });
          }
        });
      });
      req.on('error', () => {
        // Server likely not running
        global[globalTokenStore][actionKey] = { error: true, expires: Date.now() + 60 * 1000 };
        resolve({
          content: [{
            type: 'text',
            text: `Secure confirmation server not reachable at http://localhost:${CAPTCHA_PORT}. Start it (node secure-confirmation-server.js or npm start if included) and retry.`
          }]
        });
      });
      req.write(payload);
      req.end();
    });
  }

  // Token (legacy) flow
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  global[globalTokenStore][actionKey] = { token, expires: Date.now() + 5 * 60 * 1000 };
  return {
    content: [{
      type: 'text',
      text: `${promptText}\n\nConfirmation Mode: token\nSecurity code: ${token}\nRe-invoke the SAME tool with confirmationToken: "${token}" to proceed.\nNOTE: This short code is NOT an OAuth access token and cannot be used outside this single action.`
    }]
  };
}

function validateConfirmationToken({ fields, globalTokenStore, confirmationToken }) {
  const actionKey = getActionKey(fields);
  const entry = global[globalTokenStore] && global[globalTokenStore][actionKey];
  if (!entry) {
    return {
      content: [{ type: 'text', text: 'No pending confirmation found. Restart the action.' }]
    };
  }

  // Captcha flow validation
  if (useCaptcha && entry.actionId) {
    if (confirmationToken !== entry.actionId || Date.now() > entry.expires) {
      return { content: [{ type: 'text', text: 'Invalid or expired confirmation action. Restart the process.' }] };
    }
    // Query status from server
    return new Promise((resolve) => {
      http.get(`http://localhost:${CAPTCHA_PORT}/api/confirmation-status/${entry.actionId}`, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (!json.confirmed) {
              resolve({
                content: [{
                  type: 'text',
                  text: 'Still awaiting browser confirmation. Complete the captcha/code entry and retry.'
                }]
              });
            } else {
              delete global[globalTokenStore][actionKey];
              resolve(null); // success
            }
          } catch (e) {
            resolve({ content: [{ type: 'text', text: 'Malformed confirmation status response.' }] });
          }
        });
      }).on('error', () => {
        resolve({ content: [{ type: 'text', text: 'Confirmation server unreachable during status check.' }] });
      });
    });
  }

  // Token flow validation
  if (!entry.token || entry.token !== confirmationToken || Date.now() > entry.expires) {
    return {
      content: [{ type: 'text', text: 'Invalid or expired confirmation token. Please start the process again.' }]
    };
  }
  delete global[globalTokenStore][actionKey];
  return null;
}

module.exports = {
  promptForConfirmation,
  validateConfirmationToken
};
