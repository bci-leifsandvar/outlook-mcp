## [1.1.0] - 2025-11-25
- Secure confirmation: simplified JSON preview, improved styling, removed copy button
- Confirmation flow now prompts instead of blocking; suspicious input no longer hard-blocks
- Email tools: removed PII masking from outputs; added optional `mask:true` flag
- List emails: shows real sender, subject, IDs; diagnostics retained
- Move emails: unified secure confirmation, structured logging, non-empty summary output
- Contacts list: includes contact IDs for update/delete usability
- Calendar decline: clearer organizer error guidance, preflight detection
- Rules list: robust error handling with hints; includes rule IDs
- Sanitization: fixed false-positive double newline check
- Misc: UI polish, minor documentation updates

## [Unreleased]
- Tokens are now encrypted at rest using AES-256-GCM; key set via MCP_TOKEN_KEY
- Sensitive action logs now mask/redact PII (emails, names) before writing
- Added utils/crypto.js for encryption/decryption helpers
- Added test-encryption.js for local encryption/logging tests
- Updated .gitignore to cover all common npm, build, and sensitive files
## [Unreleased]
- Changed default timezone from "Central European Standard Time" to "Pacific Standard Time" (PST)
# Changelog for outlook-mcp (Fork)

## [Unreleased]
- Forked from upstream project (ryaker/outlook-mcp)
- Invalidated all upstream certifications and badges (see README fork notice)
- Added explicit user consent for all sensitive actions (send, create, delete, move, rule create)
- Introduced SECURE_PROMPT_MODE (enabled by default) for confirmation of sensitive actions
- Made OAuth scopes configurable via OUTLOOK_SCOPES environment variable, with validation and secure defaults
- Fail-closed: server and sensitive actions refuse to run if required config is missing
- Input sanitization and suspicious pattern checks for all sensitive actions to mitigate prompt injection
- Logging of all sensitive actions and arguments, with alerting on repeated suspicious or abusive attempts
- Documented all security changes and fork status in README

## [Upstream]
- See upstream changelog and commit history for original features and fixes
