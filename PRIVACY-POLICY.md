# Outlook MCP Server Privacy Policy

**Effective Date:** November 18, 2025

## Introduction
This Privacy Policy describes how the Outlook MCP Server ("the Application") collects, uses, and protects personal information in compliance with SOC 2, PIPEDA, NIST SP 800-53, and ISO/IEC 27001:2022.

## Data Collection
- The Application only collects data necessary for authentication and access to Microsoft Outlook via Microsoft Graph API.
- No email or calendar data is stored locally; all data is accessed in real-time and passed through.

## Consent
- Users must explicitly grant consent via Microsoft OAuth 2.0 before any data is accessed.
- The Application records the timestamp and scope of user consent for audit purposes.
- Users may revoke consent at any time via Microsoft Entra ID or by contacting IT support.

## Data Use
- Data is used solely for the purposes specified in the consent screen and privacy policy.
- No data is shared with third parties.

## Data Security
- All communications are encrypted in transit (TLS 1.3).
- OAuth tokens are stored encrypted at rest using AES-256.
- Access is restricted to authorized users only.

## User Rights
The Application provides the following mechanisms to support user rights:

- **Access to Personal Data:** Users can view all personal data processed by the Application (such as emails and calendar events) directly through the Outlook MCP interface, which retrieves data in real-time from Microsoft Graph API. No personal data is stored locally except for authentication tokens and consent history, which can be provided to users upon request.

- **Deletion of Tokens and Revocation of Access:** Users may delete their authentication tokens and consent history at any time by using the application's logout or token removal feature, which permanently deletes these files from local storage. Users may also revoke application access via Microsoft Entra ID (Azure portal), which invalidates all OAuth tokens and disconnects the Application. For additional assurance, users may contact IT support (privacy@bci.com) to request manual deletion or audit of any locally stored authentication artifacts.

## Data Handling and Privacy Notes

### Local Logging and Data Storage
- The Outlook MCP application does **not** log or persist user data locally. Only minimal operational logs (such as authentication events) are kept, and no email or calendar content is stored on disk.
- Data is passed transiently between tools/modules and is not retained. The MCP server acts as a proxy, not a data store.

### User Control and LLM Agents
- As a local application, user data remains on the user's device and is not transmitted to third parties except Microsoft Graph (and, if used, an LLM agent).
- Any data passed to an LLM agent (e.g., Claude) can be managed or deleted via that agent’s own portal/settings. Users should refer to the LLM provider’s privacy and complaint mechanisms for further control.

### Formal Complaint Mechanism
- For local applications, a formal complaint process is not typical. Users retain full control over their data, and any issues regarding data passed to an LLM agent should be managed through the LLM provider’s portal.

## Contact
For privacy concerns or requests, contact: privacy@bci.com

## Updates
This policy will be reviewed annually or upon significant changes to the Application.

---
