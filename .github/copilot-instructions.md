# Copilot Instructions for outlook-mcp

## Project Overview
- Modular MCP (Model Context Protocol) server for integrating Claude with Microsoft Outlook via Microsoft Graph API.
- Functional modules: `auth/`, `calendar/`, `email/`, `folder/`, `rules/`, and `utils/`.
- Main entry: `index.js` (combines all tools, handles MCP protocol).
- Auth server: `outlook-auth-server.js` (OAuth 2.0 flow, runs on port 3333).
- Configuration: `config.js` (API endpoints, field selections, auth settings).

## Key Workflows
- **Install dependencies:** `npm install` (always run first)
- **Start main server:** `npm start`
- **Start OAuth server:** `npm run auth-server` (required for authentication)
- **Test mode:** `npm run test-mode` (uses mock data from `utils/mock-data.js`)
- **Run tests:** `npm test` (Jest)
- **Inspector:** `npm run inspect` (MCP Inspector for interactive testing)
- **Direct/test scripts:** `./test-modular-server.sh`, `./test-direct.sh`
- **Kill port 3333:** `npx kill-port 3333` (if port conflict)

## Authentication & Configuration
- Register Azure app with required permissions (Mail.Read, Mail.Send, Calendars.ReadWrite, etc.).
- Copy `.env.example` to `.env` and fill with Azure credentials (`MS_CLIENT_ID`, `MS_CLIENT_SECRET`).
- Claude Desktop config: use `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`.
- Tokens stored in `~/.outlook-mcp-tokens.json`.
- Use the client secret **VALUE** from Azure, not the Secret ID.

## Patterns & Conventions
- Each module exports a `tools` array; main server aggregates these.
- OData filters are URI-encoded and handled separately in `utils/graph-api.js`.
- Test mode is toggled via `USE_TEST_MODE=true` (mock responses in `utils/mock-data.js`).
- Default timezone: "Central European Standard Time"; default page size: 25, max: 50.
- Error handling: Auth failures return "UNAUTHORIZED"; Graph API errors include status and details; token expiration triggers re-authentication.

## References
- See `README.md` and `CLAUDE.md` for setup, architecture, and troubleshooting.
- Example config: `claude-config-sample.json`.
- Mock/test data: `utils/mock-data.js`.

---

**For AI agents:**
- Always check for required environment variables and running auth server before making API calls.
- Use module boundaries and utility helpers as shown in existing code.
- Follow the modular pattern for adding new features/tools.
- Reference `CLAUDE.md` for common issues and solutions.
