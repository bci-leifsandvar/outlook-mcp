/**
 * Secure Confirmation Server
 * Serves a web page for human verification (CAPTCHA/code) before allowing sensitive actions (e.g., email send)
 */
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const app = express();
const PORT = process.env.SECURE_CONFIRM_PORT || 4000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for pending confirmations
const pendingActions = {};

// Generate a confirmation page for a pending action
app.get('/confirm/:actionId', (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions[actionId];
  if (!action) {
    return res.status(404).send('No pending action found.');
  }
  res.send(`
    <html>
      <head><title>Secure Confirmation</title></head>
      <body>
        <h2>Confirm Email Send</h2>
        <p>To: ${action.to}</p>
        <p>Subject: ${action.subject}</p>
        <form method="POST">
          <label>Enter the code: <b>${action.code}</b></label><br>
          <input type="text" name="code" required />
          <button type="submit">Confirm</button>
        </form>
      </body>
    </html>
  `);
});

// Handle confirmation submission
app.post('/confirm/:actionId', (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions[actionId];
  if (!action) return res.status(404).send('No pending action found.');
  const userCode = req.body.code;
  if (userCode === action.code) {
    // Mark as confirmed
    action.confirmed = true;
    res.send('<h2>Confirmed! Your email will be sent.</h2>');
  } else {
    res.send('<h2>Incorrect code. Please try again.</h2>');
  }
});

// API to create a pending confirmation (called by MCP email flow)
app.post('/api/create-confirmation', bodyParser.json(), (req, res) => {
  const { to, subject, body } = req.body;
  const actionId = crypto.randomBytes(8).toString('hex');
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  pendingActions[actionId] = { to, subject, body, code, confirmed: false };
  res.json({ actionId, code, confirmUrl: `http://localhost:${PORT}/confirm/${actionId}` });
});

// API to check confirmation status
app.get('/api/confirmation-status/:actionId', (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions[actionId];
  if (!action) return res.json({ confirmed: false });
  res.json({ confirmed: !!action.confirmed });
});

app.listen(PORT, () => {
  console.log(`Secure Confirmation Server running at http://localhost:${PORT}`);
});
