# ⚠️ Fork Notice

This repository is a fork. Any certifications, badges, or compliance claims from the upstream project (including MCPHub or MseeP.ai) are **not valid** for this fork. Use at your own risk and verify all security and compliance independently.

## Security: Data Protection, Logging & Monitoring

**Privacy Policy:**
- See `PRIVACY-POLICY.md` for details on data collection, consent, and user rights.

**Consent Tracking:**
- User consent events (timestamp, scopes) are recorded in `~/.outlook-mcp-consent.json` for audit and compliance.

**Token Encryption at Rest:**
- All tokens are encrypted using AES-256-GCM before being saved to disk. The encryption key must be set via the `MCP_TOKEN_KEY` environment variable (64 hex characters).

**PII Masking in Logs (not in outputs):**
- Tool responses to the model return raw data by default. PII masking is applied only in logs. You can opt-in masking in tool outputs via `mask:true` on supported tools (e.g., `email/read`, `email/list`).

**Suspicious Event Detection & Logging:**
- Sensitive actions (send, create, delete, move, rule create) are monitored for prompt injection and abuse patterns. The following are considered suspicious:
  - Inputs containing `user:`, `assistant:`, code block markers (```), triple hash (`###`), or `<script>` tags
  - Any pattern listed in `utils/sanitize.js` SUSPICIOUS_PATTERNS
- If a suspicious pattern is detected:
  - The action is still prompted for human confirmation (no hard block), unless configuration explicitly disables confirmation
  - The attempt is logged in `~/outlook-mcp-sensitive-actions.log` (with PII masked)
  - Repeated suspicious attempts (3+ in 10 minutes) trigger an alert entry in the log

You can tune patterns in `utils/sanitize.js` and adjust logging in `utils/sensitive-log.js`.
[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/ryaker-outlook-mcp-badge.png)](https://mseep.ai/app/ryaker-outlook-mcp)

# Modular Outlook MCP Server

This is a modular implementation of the Outlook MCP (Model Context Protocol) server that connects Claude with Microsoft Outlook through the Microsoft Graph API.
Certified by MCPHub https://mcphub.com/mcp-servers/ryaker/outlook-mcp

## Directory Structure

```
├── index.js                   # Main entry point
├── config.js                  # Configuration settings
├── .env.example               # Example environment config
├── MCP-WORKFLOW-EXPLAINER.md  # Workflow and architecture explainer
├── CHANGELOG.md               # Changelog for this fork
├── README.md                  # Project documentation
├── auth/
│   ├── index.js               # Authentication exports
│   ├── token-manager.js       # Token storage and refresh
│   └── tools.js               # Auth-related tools
├── calendar/
│   ├── index.js               # Calendar exports
│   ├── list.js                # List events
│   ├── create.js              # Create event
│   ├── delete.js              # Delete event
│   ├── cancel.js              # Cancel
│   ├── accept.js              # Accept event
│   ├── tentative.js           # Tentatively accept event
│   ├── decline.js             # Decline event
├── email/
│   ├── index.js               # Email exports
│   ├── list.js                # List emails
│   ├── search.js              # Search emails
│   ├── read.js                # Read email
│   └── send.js                # Send email
├── folder/
│   ├── index.js               # Folder exports
│   ├── list.js                # List folders
│   ├── create.js              # Create folder
│   └── move.js                # Move emails
├── rules/
│   ├── index.js               # Rules exports
│   ├── list.js                # List rules
│   └── create.js              # Create rule
├── utils/
│   ├── graph-api.js           # Microsoft Graph API helper
│   ├── odata-helpers.js       # OData query building
│   ├── mock-data.js           # Test mode data
<div align="center">

## Outlook MCP Server (Fork)

Lightweight Model Context Protocol server giving a Claude session secure, auditable access to Outlook data (Mail, Calendar, Contacts, Folders, Rules) via Microsoft Graph.

</div>

---
### ⚠️ Fork & Trust Notice
This is a fork; any upstream badges, certifications, or security attestations **do not apply here**. Perform your own review (code, permissions, logging, network constraints) before production use.

---
## 1. Key Features
- Modular tool sets: `email`, `calendar`, `contacts`, `folder`, `rules`, `auth`.
- Secure confirmation layer: human token-based gate for sensitive actions (send, move, rule create, calendar changes).
- Raw data outputs: No automatic PII stripping in tool responses; optional `mask:true` argument when needed.
- Encrypted tokens at rest (AES‑256‑GCM) via `MCP_TOKEN_KEY` (64 hex chars).
- Structured logging of sensitive actions with risk flagging (no hard blocks by default).
- Fallback & resilience: fuzzy email ID recovery, graceful error hints, non-empty result summaries.
- Test mode (`USE_TEST_MODE=true`) with mock data for local development.

## 2. Security & Privacy Model
| Aspect | Behavior |
| ------ | -------- |
| Token Storage | AES‑256‑GCM encrypted on disk (see `utils/crypto.js`). |
| Output Privacy | Raw Graph data returned. Opt-in masking: pass `mask:true`. |
| Log Privacy | PII (emails, simple names) masked/excluded before writing. |
| Suspicious Pattern Detection | Patterns (e.g. `user:`, `assistant:`, code fences, `<script>`). Logged; still routed to confirmation (not blocked). |
| Secure Confirmation | Browser or token mode renders truncated JSON payload + code. User supplies `confirmationToken` to proceed. |
| Rate Limiting | Basic per-user throttling for high-impact actions (e.g. send email). |

Tune patterns in `utils/sanitize.js`; adjust logging in `utils/sensitive-log.js`.

## 3. Secure Confirmation Flow
1. Tool called (e.g. `sendEmail`).
2. Server returns a prompt with `requiresConfirmation: true` and a URL (captcha mode) or code (token mode).
3. User reviews JSON payload (truncated body preview up to 1000 chars).
4. User re-invokes tool with `confirmationToken` (actionId / short code).
5. Action executes; structured summary returned.

Environment switches between modes using `SECURE_CONFIRM_MODE=captcha|token`.

## 4. Directory Overview
```
auth/      OAuth, token handling
calendar/  Event CRUD + RSVP tools
contacts/  Contact list/create/update/delete
email/     List, read, search, send, move (via folder tools)
folder/    Folder list/create/move emails
rules/     List + create message rules
utils/     Graph client, sanitize, crypto, logging, confirmation
```

## 5. Installation
```bash
git clone <repo>
cd outlook-mcp
npm install
```
Minimal required deps: `@modelcontextprotocol/sdk`, `dotenv`, `sanitize-html`.

## 6. Azure App Registration (Condensed)
1. Register app → set redirect: `http://localhost:3333/auth/callback`.
2. Capture Client ID & Secret VALUE (not ID).
3. Add delegated permissions you actually need (e.g. Mail.Read, Mail.Send, Calendars.Read). Principle of least privilege.
4. Grant admin consent if required.

## 7. Configuration (.env)
```bash
MS_CLIENT_ID=xxxxx
MS_CLIENT_SECRET=xxxxx
MCP_TOKEN_KEY=<64 hex chars>
OUTLOOK_SCOPES="Mail.Read,User.Read,Calendars.Read"
USE_TEST_MODE=false
SECURE_PROMPT_MODE=true
SECURE_CONFIRM_MODE=captcha   # or token
```
Invalid or disallowed scopes fall back to a safe baseline.

## 8. Claude Desktop Integration
`claude-config.json` snippet:
```json
{
  "mcpServers": {
    "outlook": {
      "command": "node",
      "args": ["/abs/path/outlook-mcp/index.js"],
      "env": {
        "OUTLOOK_CLIENT_ID": "...",
        "OUTLOOK_CLIENT_SECRET": "..."
      }
    }
  }
}
```
Start auth helper: `npm run auth-server` then run `authenticate` tool.

## 9. Tool Catalog (Abbreviated)
| Domain | Tool | Notes |
| ------ | ---- | ----- |
| auth | authenticate | Returns OAuth URL & monitors callback |
| email | listEmails (mask?) | `count`, `folder`, optional `mask:true` |
| email | readEmail (mask?) | `id`, optional `mask:true` |
| email | sendEmail | Secure confirmation; HTML sanitized, preview truncated |
| folder | moveEmails | Confirmation; structured JSON summary |
| folder | createFolder | Creates child folder in mailbox |
| calendar | listEvents | Time-frame & pagination helpers |
| calendar | createEvent / acceptEvent / declineEvent / cancelEvent | Decline gives organizer guidance |
| contacts | listContacts | Includes `id` for update/delete follow-up |
| rules | listRules | Shows sequence + rule `id`; `includeDetails:true` expands |
| rules | createRule | Confirmation required |

Use inspector (`npx @modelcontextprotocol/inspector node index.js`) for full schema.

## 10. Privacy & Masking
- Default: raw content (better model context quality).
- Opt-in: add `mask:true` in supported tools to obfuscate emails, names, phone numbers.
- Logs: always sanitized; large bodies excluded.

## 11. Troubleshooting (Quick Matrix)
| Issue | Cause | Fix |
| ----- | ----- | ---- |
| Empty rule list | Missing permission | Add Mail.ReadWrite or Mail.Read & re-auth |
| Decline fails (organizer) | Organizer self-decline | Use `cancelEvent` |
| Move returns no info | Older version | Upgrade to ≥1.1.0 for structured summary |
| Auth 7000215 | Secret ID used | Use secret VALUE; regenerate if lost |
| Port busy 3333 | Stale process | `npx kill-port 3333` then restart |

## 12. Extending
1. Create module directory.
2. Add tool handlers exporting a function returning MCP `content` array.
3. Register in `index.js` TOOLS list.
4. Add tests (mock Graph responses if needed).

## 13. Release & Versioning
- Semantic-ish: minor bumps add tools/security improvements.
- See `CHANGELOG.md` for recent changes (latest: 1.1.0).

## 14. Security Review Tips
| Area | File | Action |
| ---- | ---- | ------ |
| Encryption | `utils/crypto.js` | Verify key length & GCM parameters |
| Confirmation | `utils/secure-confirmation.js` / server | Check token lifetime & store isolation |
| Logging | `utils/sensitive-log.js` | Ensure no bodies/PII leak |
| Sanitization | `utils/sanitize.js` | Confirm patterns & absence of over-blocking |

## 15. Disclaimer
Provided "as is" without warranty. Always verify permissions granted to the Azure app and constrain runtime environment.

---
Enjoy building safer Outlook-integrated workflows ✨
