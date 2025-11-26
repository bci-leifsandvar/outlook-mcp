/**
 * Secure Confirmation Server
 * Serves a web page for human verification (CAPTCHA/code) before allowing sensitive actions (e.g., email send)
 */
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const config = require('./config');
const { SECURE_CONFIRM_SERVER_BASE_URL, SECURE_CONFIRM_PORT } = config;
const app = express();
const PORT = SECURE_CONFIRM_PORT;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for pending confirmations
const pendingActions = {};

// Generate a confirmation page for a pending action
// ENHANCED UI v2: Pico.css + custom theming (no build step)
// Provides: brand gradient, badges, responsive layout, copy-to-clipboard for code, improved preview styling
function shell(title, inner) {
  return `<!DOCTYPE html><html lang='en'>
  <head>
    <meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/>
    <title>${title}</title>
    <style>
      :root {
        --bg: #f8fafc; /* slate-50 */
        --card: #ffffff; /* white */
        --border: #e2e8f0; /* slate-200 */
        --muted: #f1f5f9; /* slate-100 */
        --fg: #0f172a; /* slate-900 */
        --fg-muted: #475569; /* slate-600 */
        --brand: #6366f1; /* indigo-500 */
        --brand-600: #4f46e5;
        --danger: #dc2626; /* red-600 */
        --success: #16a34a; /* green-600 */
        --shadow: 0 10px 25px -10px rgba(2,6,23,.35), 0 6px 16px -8px rgba(2,6,23,.2);
      }
      [data-theme="dark"] {
        --bg: #0b1220; /* custom dark */
        --card: #0f172a; /* slate-900 */
        --border: #1f2937; /* gray-800 */
        --muted: #0b1220;
        --fg: #e5e7eb; /* gray-200 */
        --fg-muted: #94a3b8; /* slate-400 */
        --shadow: 0 14px 30px -14px rgba(0,0,0,.6), 0 8px 22px -10px rgba(0,0,0,.45);
      }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body { margin:0; background: var(--bg); color: var(--fg); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
      .container { max-width: 880px; margin: 0 auto; padding: 24px; }
      .nav { display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; }
      .brand-title { font-weight: 700; letter-spacing: .3px; }
      .title-gradient { background: linear-gradient(135deg, var(--brand), #0ea5e9); -webkit-background-clip:text; color: transparent; }
      .surface { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; box-shadow: var(--shadow); }
      .meta-list { list-style:none; padding:0; margin:0 0 12px; display:grid; gap:8px; }
      .meta-list li { font-size:.9rem; background: var(--muted); padding: 10px 12px; border-radius: 8px; display:flex; justify-content:space-between; align-items:center; }
      .meta-list strong { font-weight:600; opacity:.9; }
      .preview { font-size:.85rem; line-height:1.35rem; white-space:pre-wrap; background:#0f172a; color:#e2e8f0; padding:12px 14px; border-radius:8px; max-height:240px; overflow:auto; border: 1px solid #1f2937; }
      .badge { display:inline-block; padding:.35rem .6rem; font-size:.65rem; font-weight:700; letter-spacing:.6px; text-transform:uppercase; border-radius:6px; background: var(--muted); color: var(--fg-muted); border:1px solid var(--border); }
      .badge.pending { background: #f59e0b22; color:#b45309; border-color:#f59e0b44; }
      .badge.confirmed { background:#16a34a22; color:#15803d; border-color:#16a34a44; }
      .badge.error { background:#dc262622; color:#b91c1c; border-color:#dc262644; }
      .code-box { font-family: ui-monospace, Menlo, Consolas, monospace; background:#111827; color:#fff; padding:8px 10px; border-radius:8px; font-size:.9rem; border:1px solid #1f2937; }
      .row { display:flex; gap:10px; align-items:center; flex-wrap: wrap; }
      .actions { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; }
      .btn { display:inline-flex; align-items:center; gap:8px; border:1px solid var(--border); border-radius:8px; background:var(--card); color:var(--fg); padding:8px 12px; font-weight:600; cursor:pointer; transition: all .15s ease; text-decoration:none; }
      .btn:hover { background: var(--muted); }
      .btn-primary { background: var(--brand); color:#fff; border-color: var(--brand-600); }
      .btn-primary:hover { filter: brightness(.95); }
      .btn-ghost { background: transparent; border-color: var(--border); }
      .input { border:1px solid var(--border); border-radius:8px; padding:8px 10px; min-width: 220px; background: var(--card); color: var(--fg); }
      label { font-size:.75rem; letter-spacing:.4px; text-transform:uppercase; font-weight:700; color: var(--fg-muted); display:block; margin-bottom:6px; }
      small { color: var(--fg-muted); }
      footer { margin-top:18px; font-size:.7rem; color: var(--fg-muted); }
      @media (max-width:640px){ .surface { padding:16px; } }
    </style>
    <script>
      function toggleTheme(){document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'}
    </script>
  </head>
  <body>
    <nav class='container nav'>
      <div class='brand-title'>Secure Confirmation</div>
      <button onclick='toggleTheme()' class='btn btn-ghost' aria-label='Toggle dark mode'>Theme</button>
    </nav>
    <main class='container'>${inner}</main>
    <footer class='container'>Outlook MCP • Human verification layer</footer>
  </body></html>`;
}

app.get('/confirm/:actionId', (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions[actionId];
  if (!action) {
    return res.status(404).send(shell('Not Found', "<section class='surface'><h2 style='margin-top:0;'>Action Not Found</h2><p style='color:var(--fg-muted)'>Expired or invalid action.</p></section>"));
  }
  // Simplified view: show truncated JSON payload only
  const previewBody = (action.body || '').slice(0, 1000) || 'No body content.';
  const payload = {
    action: 'send-email',
    to: action.to || null,
    subject: action.subject || null,
    bodyPreview: previewBody
  };
  const jsonEscaped = JSON.stringify(payload, null, 2).replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');
  const html = shell('Secure Confirmation', `
    <section class='surface'>
      <div style='display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:.85rem;'>
        <h1 class='title-gradient' style='margin:0; font-size:1.15rem;'>Confirm Action</h1>
        <span class='badge pending'>Pending</span>
      </div>
      <div class='preview' aria-label='Action JSON'><pre style='all:unset; font-family:inherit; white-space:pre-wrap;'>${jsonEscaped}</pre></div>
      <form method='POST' style='margin-top:1.2rem;'>
        <label for='code'>Confirmation Code</label>
        <div class='row'>
          <span id='confirm-code' class='code-box' aria-live='polite'>${action.code}</span>
          <input id='code' name='code' required placeholder='Enter code shown above' aria-required='true' class='input' />
        </div>
        <div class='actions'>
          <button type='submit' class='btn btn-primary'>Confirm</button>
        </div>
        <small style='display:block; margin-top:.6rem;'>Verify the JSON matches your intent before confirming.</small>
      </form>
    </section>`);
  res.send(html);
});

// Handle confirmation submission
app.post('/confirm/:actionId', (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions[actionId];
  if (!action) return res.status(404).send(shell('Not Found', "<section class='surface'><h2 style='margin-top:0;'>Action Not Found</h2><p style='color:var(--fg-muted)'>Expired or invalid action.</p></section>"));
  const userCode = (req.body.code || '').trim();
  if (userCode === action.code) {
    action.confirmed = true;
    return res.send(shell('Confirmed', `<section class='surface'><div style='display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem;'>
      <h1 class='title-gradient' style='margin:0; font-size:1.3rem;'>Action Confirmed</h1><span class='badge confirmed'>Confirmed</span></div>
      <p style='font-size:.95rem; color: var(--fg-muted);'>Your email has been approved and will be sent.</p>
      <p style='font-size:.8rem; color: var(--fg-muted);'>You may close this window.</p></section>`));
  }
  res.send(shell('Retry Confirmation', `<section class='surface'><div style='display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem;'>
    <h1 style='margin:0; font-size:1.2rem; color:var(--danger);'>Incorrect Code</h1><span class='badge error'>Error</span></div>
    <p style='font-size:.95rem; color: var(--fg-muted);'>The code you entered does not match. Please retry.</p>
    <p><a href='/confirm/${actionId}' class='btn'>Try Again</a></p>
  </section>`));
});

// API to create a pending confirmation (called by MCP email flow)
app.post('/api/create-confirmation', bodyParser.json(), (req, res) => {
  const { to, subject, body } = req.body;
  const actionId = crypto.randomBytes(8).toString('hex');
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  pendingActions[actionId] = { to, subject, body, code, confirmed: false };
  res.json({ actionId, code, confirmUrl: `${SECURE_CONFIRM_SERVER_BASE_URL}/confirm/${actionId}` });
});

// API to check confirmation status
app.get('/api/confirmation-status/:actionId', (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions[actionId];
  if (!action) return res.json({ confirmed: false });
  res.json({ confirmed: !!action.confirmed });
});

const serverInstance = app.listen(PORT, () => {
  // This log is captured by the main process and routed to the logger.
  process.stdout.write(`Secure Confirmation Server running at ${SECURE_CONFIRM_SERVER_BASE_URL}\n`);
});

module.exports = { app, serverInstance, pendingActions };
