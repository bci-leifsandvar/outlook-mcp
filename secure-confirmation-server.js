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
    <link rel='stylesheet' href='https://unpkg.com/@picocss/pico@2.0.6/css/pico.min.css'>
    <style>
      :root {
        --brand-gradient: linear-gradient(135deg,#0ea5e9,#6366f1);
        --brand-color: #0ea5e9;
        --danger-color: #dc2626;
        --ok-color: #16a34a;
      }
      body { padding:2.5rem 0 2rem; }
      header.nav { margin-bottom:2rem; }
      .container { max-width:820px; }
      h1.brand { background:var(--brand-gradient); -webkit-background-clip:text; color:transparent; font-weight:600; letter-spacing:.5px; }
      .surface { border:1px solid var(--pico-muted-border-color); border-radius:1rem; padding:1.75rem 2rem; box-shadow:0 6px 28px -6px rgba(0,0,0,.15),0 2px 10px -4px rgba(0,0,0,.07); backdrop-filter:saturate(180%) blur(4px); }
      .meta-list { list-style:none; padding:0; margin:0 0 1rem; display:grid; gap:.5rem; }
      .meta-list li { font-size:.85rem; background:var(--pico-muted-color); padding:.5rem .75rem; border-radius:.5rem; display:flex; justify-content:space-between; align-items:center; }
      .meta-list strong { font-weight:600; opacity:.9; }
      .preview { font-size:.75rem; line-height:1.25rem; white-space:pre-wrap; background:#0f172a; color:#f1f5f9; padding:.9rem 1rem; border-radius:.6rem; max-height:220px; overflow:auto; }
      .badge { display:inline-block; padding:.35rem .6rem; font-size:.6rem; font-weight:600; letter-spacing:.8px; text-transform:uppercase; border-radius:.4rem; background:var(--pico-muted-border-color); }
      .badge.pending { background:#f59e0b22; color:#b45309; }
      .badge.confirmed { background:#16a34a22; color:#15803d; }
      .badge.error { background:#dc262622; color:#b91c1c; }
      .code-box { font-family:monospace; background:#1e293b; color:#fff; padding:.55rem .75rem; border-radius:.4rem; font-size:.85rem; letter-spacing:.5px; }
      .flex-row { display:flex; gap:.6rem; align-items:center; }
      .actions { display:flex; justify-content:flex-end; gap:.6rem; margin-top:1rem; }
      .copy-btn { cursor:pointer; font-size:.65rem; border:none; background:var(--brand-color); color:#fff; padding:.35rem .65rem; border-radius:.35rem; }
      .copy-btn:hover { filter:brightness(.9); }
      footer { margin-top:2rem; font-size:.6rem; opacity:.55; }
      @media (max-width:640px){ .surface { padding:1.25rem 1.25rem; } .meta-list { grid-template-columns:1fr; } }
    </style>
    <script>
      function toggleTheme(){document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'}
      function copyCode(){const el=document.getElementById('confirm-code'); if(!el) return; navigator.clipboard.writeText(el.textContent.trim()).then(()=>{const b=document.getElementById('copy-indicator'); if(b){b.textContent='Copied'; setTimeout(()=>b.textContent='Copy',1500);}})}
    </script>
  </head>
  <body>
    <nav class='container nav'>
      <ul><li><strong>Secure Confirmation</strong></li></ul>
      <ul><li><button onclick='toggleTheme()' class='secondary' aria-label='Toggle dark mode'>Theme</button></li></ul>
    </nav>
    <main class='container'>${inner}</main>
    <footer class='container'>Outlook MCP • Human verification layer</footer>
  </body></html>`;
}

app.get('/confirm/:actionId', (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions[actionId];
  if (!action) {
    return res.status(404).send(shell('Not Found', "<div class='card w-full max-w-md text-center'><h2 class='text-xl font-semibold mb-2'>Action Not Found</h2><p class='text-sm text-slate-600 dark:text-slate-300'>The requested confirmation has expired or is invalid.</p></div>"));
  }
  const preview = (action.body || '').slice(0, 320) || 'No body preview.';
  const html = shell('Secure Confirmation', `
    <section class='surface'>
      <div style='display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:.75rem;'>
        <h1 class='brand' style='margin:0;'>Confirm Email Send</h1>
        <span class='badge pending'>PENDING</span>
      </div>
      <p style='margin-top:0; font-size:.85rem;'>Review payload and enter the confirmation code to authorize dispatch.</p>
      <ul class='meta-list'>
        <li><strong>To</strong><span>${action.to ? action.to : '<em>Unknown</em>'}</span></li>
        <li><strong>Subject</strong><span>${action.subject ? action.subject : '<em>(no subject)</em>'}</span></li>
      </ul>
      <div class='preview' aria-label='Email preview'>${preview.replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;')}</div>
      <form method='POST' style='margin-top:1.2rem;'>
        <label for='code' style='font-size:.75rem; letter-spacing:.5px; text-transform:uppercase; font-weight:600;'>Confirmation Code</label>
        <div class='flex-row'>
          <span id='confirm-code' class='code-box' aria-live='polite'>${action.code}</span>
          <button type='button' id='copy-indicator' class='copy-btn' onclick='copyCode()'>Copy</button>
          <input id='code' name='code' required placeholder='Enter code' aria-required='true' />
        </div>
        <div class='actions'>
          <button type='submit'>Confirm & Send</button>
        </div>
        <small style='display:block; margin-top:.6rem;'>Manual confirmation prevents unauthorized automated dispatch.</small>
      </form>
    </section>`);
  res.send(html);
});

// Handle confirmation submission
app.post('/confirm/:actionId', (req, res) => {
  const { actionId } = req.params;
  const action = pendingActions[actionId];
  if (!action) return res.status(404).send(shell('Not Found', '<article><h2>Action Not Found</h2><p>Expired or invalid action.</p></article>'));
  const userCode = (req.body.code || '').trim();
  if (userCode === action.code) {
    action.confirmed = true;
    return res.send(shell('Confirmed', `<section class='surface'><div style='display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem;'>
      <h1 class='brand' style='margin:0; font-size:1.4rem;'>Action Confirmed</h1><span class='badge confirmed'>CONFIRMED</span></div>
      <p style='font-size:.85rem;'>Your email has been approved and will be sent.</p>
      <p style='font-size:.7rem; opacity:.7;'>You may close this window.</p></section>`));
  }
  res.send(shell('Retry Confirmation', `<section class='surface'><div style='display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem;'>
    <h1 style='margin:0; font-size:1.3rem; color:var(--danger-color);'>Incorrect Code</h1><span class='badge error'>ERROR</span></div>
    <p style='font-size:.85rem;'>The code you entered does not match. Please retry.</p>
    <p><a href='/confirm/${actionId}' role='button'>Try Again</a></p>
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
