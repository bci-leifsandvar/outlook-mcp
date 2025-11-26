# Outlook MCP Server

> **⚠️ Notice: Authentication Status**
>
> The authentication flow has been tested and is functional, particularly when using the recommended `inline` mode for the auth server. However, the logic for handling subprocess environment variables and process lifecycle could be tidied up further for improved robustness. The core tool functionality is unaffected.
>
> **Workaround:** For the most reliable experience, run the auth server in `inline` mode. See the updated configuration instructions below.

A modern, modular Model Context Protocol (MCP) server to connect AI assistants like Claude to your Microsoft Outlook account via the Microsoft Graph API.

## Overview

This server acts as a bridge, allowing a large language model to securely access and manage your emails, calendar events, and contacts. It's built with a clean, modular architecture, making it easy to understand, maintain, and extend.

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
*Note: The server is designed to accept both `MS_*` and `OUTLOOK_*` prefixed variables for compatibility.*

## 4. Usage

The server is designed to be launched by an MCP client like Claude Desktop. The client is responsible for starting the `node index.js` process.

### Authentication Flow

1.  **Start the MCP Client** (e.g., Restart Claude Desktop). The client will automatically start the `outlook-mcp` server and its required sub-processes.
2.  **Authenticate in Claude**: Use the `authenticate` tool.
3.  **Browser Sign-in**: Claude will provide a URL. Open it in your browser, sign in to your Microsoft account, and grant the requested permissions.
4.  **Ready**: Upon success, tokens are stored securely in `~/.outlook-mcp-tokens.json`, and you can start using the tools.

## 5. Security and Access Control

### OAuth Scopes

The application requests specific OAuth 2.0 scopes (e.g., `Mail.Read`, `Calendars.ReadWrite`) during the authentication flow. These scopes define the maximum permissions the application is granted. Users must consent to these scopes, ensuring they are aware of what the application can do.

### Secure Confirmation

For sensitive actions such as sending an email or creating a calendar event, the server requires an additional confirmation step. This prevents accidental or unauthorized actions and is enabled by default.

### Role-Based Access Control (RBAC) with Microsoft Entra ID

For enterprise environments, it is highly recommended to manage access control centrally using **Microsoft Entra ID (formerly Azure AD)**.

While this application uses OAuth scopes to define its permissions, Entra ID provides a more granular way to control which *users* or *groups* can use the application. Administrators can configure the Azure App Registration to:

1.  **Require User Assignment**: In the App Registration settings under **Properties**, setting "User assignment required?" to "Yes" ensures that only explicitly assigned users or groups can sign in and use the application.
2.  **Define App Roles**: Under **App roles**, you can create custom roles (e.g., `Email.Reader`, `Calendar.Writer`, `Admin`).
3.  **Assign Users to Roles**: In the corresponding Enterprise Application, you can assign these roles to specific users and groups.

The application can then be extended to check a user's assigned roles from their ID token after they authenticate. This allows for true RBAC, where a user's ability to call a specific tool (like `sendEmail`) is determined by their role assignment in Entra ID, providing centralized, auditable, and secure access management.

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
