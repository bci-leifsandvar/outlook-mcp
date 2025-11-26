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
│   ├── sanitize.js            # Input sanitization helpers
│   ├── sensitive-log.js       # Sensitive action logging/alerting
│   └── crypto.js              # Token encryption/decryption helpers
├── test-encryption.js         # (Optional) Test script for encryption/logging
```

## Features

- **Modular Design**: Functionality is cleanly separated into modules (`auth`, `email`, `calendar`, etc.).
- **Secure Authentication**: Uses OAuth 2.0 for secure, token-based access to Microsoft Graph.
- **Comprehensive API Coverage**:
  - **Email**: List, read, search, and send.
  - **Calendar**: List, create, and manage events.
  - **Contacts**: List, create, and manage contacts.
  - **Folders & Rules**: Manage email folders and mailbox rules.
- **Test Mode**: Includes a test mode with mock data for development and testing without hitting live APIs.
- **Secure by Default**: Implements confirmation prompts for sensitive actions.

## Prerequisites

- **Node.js** (v16.x or later recommended)
- **npm** or **yarn**
- An **Azure Account** with permissions to register applications.

## 1. Installation

Clone the repository and install the dependencies.

```bash
git clone <repository-url>
cd outlook-mcp
npm install
```

## 2. Azure App Registration

You must register an application in the Azure Portal to get the necessary client credentials.

1.  **Navigate to Azure Portal**: Go to [portal.azure.com](https://portal.azure.com/) and sign in.
2.  **App registrations**: Find and select "App registrations".
3.  **New registration**:
    -   Give it a name (e.g., `Claude-Outlook-Assistant`).
    -   Select **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**.
    -   Set the **Redirect URI**:
        -   Select **Web** as the platform.
        -   Enter `http://localhost:3333/auth/callback`.
4.  **Copy Client ID**: From your app's **Overview** page, copy the **Application (client) ID**.
5.  **Create Client Secret**:
    -   Go to **Certificates & secrets**.
    -   Click **New client secret**.
    -   Give it a description and set an expiration (e.g., 24 months).
    -   **Immediately copy the secret's `Value`**. You will not see it again.

## 3. Configuration

This project uses a `.env` file for local development and relies on the client (e.g., Claude Desktop) to inject environment variables in production.

### Local Development (`.env` file)

Create a `.env` file in the project root:

```env
# Get these from your Azure App Registration
MS_CLIENT_ID="<your-application-client-id>"
MS_CLIENT_SECRET="<your-client-secret-value>"

# Optional: Set to 'true' to use mock data without API calls
USE_TEST_MODE=false
```

### Claude Desktop (`claude_desktop_config.json`)

Update your Claude Desktop configuration to launch the server and provide the environment variables.

```json
{
  "mcpServers": {
    "outlook-assistant": {
      "command": "node",
      "args": [
        "C:/absolute/path/to/outlook-mcp/index.js"
      ],
      "env": {
        "USE_TEST_MODE": "false",
        "DISABLE_AUTH_SUBSERVER": "inline", // Recommended: Run auth server in the same process
        "OUTLOOK_CLIENT_ID": "<your-application-client-id>",
        "OUTLOOK_CLIENT_SECRET": "<your-client-secret-value>"
      }
    }
  }
}
```

### 3. Advanced Configuration (Optional)

To configure server behavior, you can edit `config.js` to change:

- Server name and version
- Test mode settings
- Authentication parameters
- Email field selections
- API endpoints

## Usage with Claude Desktop

1. **Configure Claude Desktop**: Add the server configuration (see Configuration section above)
2. **Restart Claude Desktop**: Close and reopen Claude Desktop to load the new MCP server
3. **Start Authentication Server**: Open a terminal and run `npm run auth-server`
4. **Authenticate**: In Claude Desktop, use the `authenticate` tool to get an OAuth URL

**Confirmation Prompts (Secure Confirmation):**
Sensitive actions route through a secure confirmation step. The confirmation page shows a truncated JSON payload of the pending action and a confirmation code. Provide the token/actionId to proceed. This avoids blocking while ensuring human oversight.
5. **Complete OAuth Flow**: Visit the URL in your browser and sign in with Microsoft
6. **Start Using**: Once authenticated, you can use all the Outlook tools in Claude!

## Running Standalone

You can test the server using:

```bash
./test-modular-server.sh
```

This will use the MCP Inspector to directly connect to the server and let you test the available tools.

## Authentication Flow

The authentication process requires two steps:

### Step 1: Start the Authentication Server
```bash
npm run auth-server
```
This starts a local server on port 3333 that handles the OAuth callback from Microsoft.

**⚠️ Important**: The auth server MUST be running before you try to authenticate. The authentication URL will not work if the server isn't running.

### Step 2: Authenticate with Microsoft
1. In Claude Desktop, use the `authenticate` tool
2. Claude will provide a URL like: `http://localhost:3333/auth?client_id=your-client-id`
3. Visit this URL in your browser
4. Sign in with your Microsoft account
5. Grant the requested permissions
6. You'll be redirected back to a success page
7. Tokens are automatically stored in `~/.outlook-mcp-tokens.json`

The authentication server can be stopped after successful authentication (tokens are saved). However, you'll need to restart it if you need to re-authenticate.

## Troubleshooting

#### Error: `listen EADDRINUSE: address already in use :::3333`

A process is already using the authentication port.

**Fix**: Find and terminate the process.

```powershell
# Find and kill the process on port 3333
npx kill-port 3333
```

Then, restart your MCP client.

#### Authentication Fails with "Configuration Error"

This means the auth server process is not receiving the client ID and secret.

1.  **Verify `.env` file**: Ensure `MS_CLIENT_ID` and `MS_CLIENT_SECRET` are correct in the `.env` file at the project root.
2.  **Verify Claude Config**: Ensure `OUTLOOK_CLIENT_ID` and `OUTLOOK_CLIENT_SECRET` are correct in your `claude_desktop_config.json`.
3.  **Check for Zombie Processes**: Use `npx kill-port 3333` to ensure an old, misconfigured server isn't running.
4.  **Use Diagnostic Endpoint**: After starting the server, visit `http://localhost:3333/env-diagnostic` in your browser. It should show `"clientIdPresent": true`. If not, the environment variables are not being loaded correctly.

#### Invalid Client Secret (Error AADSTS7000215)

You copied the "Secret ID" instead of the "Value" from Azure.

**Fix**: Go back to **Certificates & secrets** in your Azure app, create a new secret, and copy the **Value**. Update your `.env` and/or Claude config and restart.
