# Privacy Policy

Effective Date: November 17, 2025

## Introduction
This Privacy Policy describes how the Outlook MCP server collects, uses, stores, and protects your personal information when integrating with Microsoft Outlook via the Microsoft Graph API.

## Information Collected
- OAuth tokens (access, refresh) for Microsoft Graph API
- Email, calendar, and folder metadata
- User identifiers (email address, name)
- Log entries (with PII masked)

## Use of Information
- Authenticate and authorize access to Microsoft Outlook resources
- Provide calendar, email, and folder management features
- Log security and compliance events (with masking)

## Data Protection
- Tokens are encrypted at rest using AES-256
- Sensitive fields in logs are masked
- Access is restricted to authorized users only

## Consent
- Users must explicitly authorize access via Microsoft OAuth consent screen
- Consent is tracked and stored with token metadata
- Users may revoke consent at any time via Microsoft account settings

## Data Retention
- Tokens and logs are retained only as long as necessary for operation and compliance
- Users may request deletion of their data by contacting the administrator

## Third-Party Services
- Microsoft Graph API (Microsoft 365)
- No other third-party data sharing

## Changes to Policy
- Policy updates will be posted in this repository

## Contact
For privacy concerns, contact the administrator at privacy@outlook-mcp.local
