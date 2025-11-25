# Microsoft Graph Permissions Loadout Reference

**Outlook MCP Server**  
**Version:** 1.0  
**Last Updated:** November 2025

---

## Overview

This document provides permission "loadouts" for deploying the Outlook MCP Server with varying levels of access. Select the appropriate loadout based on organizational security requirements and functional needs.

---

## Permission Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Delegated** | Acts on behalf of signed-in user | Standard user access |
| **Application** | Acts as the app itself (no user context) | Background services, automation |

> **Note:** The Outlook MCP Server uses **delegated permissions only**. Users can only access data they already have permissions to in Microsoft 365.

---

## Loadout Configurations

### Loadout 1: Read-Only (Minimal)

**Use Case:** Monitoring, reporting, read-only assistants

**Risk Level:** Low

| Permission | Type | Description |
|------------|------|-------------|
| `User.Read` | Delegated | Sign in and read user profile |
| `Mail.Read` | Delegated | Read user mail |
| `Calendars.Read` | Delegated | Read user calendars |
| `Contacts.Read` | Delegated | Read user contacts |
| `MailboxSettings.Read` | Delegated | Read mailbox settings |

**Enabled Tools:**
- `authenticate`, `check-auth-status`
- `list-emails`, `search-emails`, `read-email`
- `list-events`
- `list-contacts`
- `list-folders`, `list-rules`
- `get-mailbox-settings`

**Disabled Tools:**
- All send/create/update/delete operations

---

### Loadout 2: Email Operations

**Use Case:** Email management without calendar/contact modification

**Risk Level:** Medium

| Permission | Type | Description |
|------------|------|-------------|
| `User.Read` | Delegated | Sign in and read user profile |
| `Mail.Read` | Delegated | Read user mail |
| `Mail.ReadWrite` | Delegated | Read and write user mail |
| `Mail.Send` | Delegated | Send mail as user |
| `MailboxSettings.Read` | Delegated | Read mailbox settings |

**Enabled Tools:**
- `authenticate`, `check-auth-status`
- `list-emails`, `search-emails`, `read-email`
- `send-email`, `mark-as-read`, `move-emails`
- `list-folders`, `create-folder`
- `list-rules`, `create-rule`, `rules_editSequence`
- `get-mailbox-settings`

**Disabled Tools:**
- Calendar operations (create/cancel/delete events)
- Contact operations (create/update/delete)
- `set-auto-reply`

---

### Loadout 3: Calendar Operations

**Use Case:** Scheduling assistants, meeting management

**Risk Level:** Medium

| Permission | Type | Description |
|------------|------|-------------|
| `User.Read` | Delegated | Sign in and read user profile |
| `Mail.Read` | Delegated | Read user mail (for context) |
| `Calendars.Read` | Delegated | Read user calendars |
| `Calendars.ReadWrite` | Delegated | Read and write user calendars |

**Enabled Tools:**
- `authenticate`, `check-auth-status`
- `list-emails`, `search-emails`, `read-email`
- `list-events`, `create-event`, `cancel-event`, `delete-event`, `decline-event`

**Disabled Tools:**
- Email send/write operations
- Contact operations
- Mailbox settings modification

---

### Loadout 4: Standard (Recommended)

**Use Case:** General productivity assistant with full read and selective write

**Risk Level:** Medium

| Permission | Type | Description |
|------------|------|-------------|
| `User.Read` | Delegated | Sign in and read user profile |
| `Mail.Read` | Delegated | Read user mail |
| `Mail.ReadWrite` | Delegated | Read and write user mail |
| `Mail.Send` | Delegated | Send mail as user |
| `Calendars.Read` | Delegated | Read user calendars |
| `Calendars.ReadWrite` | Delegated | Read and write user calendars |
| `Contacts.Read` | Delegated | Read user contacts |
| `MailboxSettings.Read` | Delegated | Read mailbox settings |

**Enabled Tools:**
- All read operations
- Email send and management
- Calendar event management
- Contact read-only
- Mailbox settings read-only

**Disabled Tools:**
- Contact create/update/delete
- `set-auto-reply`

---

### Loadout 5: Full Access

**Use Case:** Complete Outlook management, executive assistants

**Risk Level:** High

| Permission | Type | Description |
|------------|------|-------------|
| `User.Read` | Delegated | Sign in and read user profile |
| `Mail.Read` | Delegated | Read user mail |
| `Mail.ReadWrite` | Delegated | Read and write user mail |
| `Mail.Send` | Delegated | Send mail as user |
| `Calendars.Read` | Delegated | Read user calendars |
| `Calendars.ReadWrite` | Delegated | Read and write user calendars |
| `Contacts.Read` | Delegated | Read user contacts |
| `Contacts.ReadWrite` | Delegated | Read and write user contacts |
| `MailboxSettings.Read` | Delegated | Read mailbox settings |
| `MailboxSettings.ReadWrite` | Delegated | Read and write mailbox settings |

**Enabled Tools:**
- All 19 tools fully operational

---

## Permission Matrix

### By Tool

| Tool | User.Read | Mail.Read | Mail.ReadWrite | Mail.Send | Calendars.Read | Calendars.ReadWrite | Contacts.Read | Contacts.ReadWrite | MailboxSettings.Read | MailboxSettings.ReadWrite |
|------|:---------:|:---------:|:--------------:|:---------:|:--------------:|:-------------------:|:-------------:|:------------------:|:--------------------:|:-------------------------:|
| `authenticate` | Required | - | - | - | - | - | - | - | - | - |
| `check-auth-status` | Required | - | - | - | - | - | - | - | - | - |
| `list-emails` | Required | Required | - | - | - | - | - | - | - | - |
| `search-emails` | Required | Required | - | - | - | - | - | - | - | - |
| `read-email` | Required | Required | - | - | - | - | - | - | - | - |
| `send-email` | Required | - | - | Required | - | - | - | - | - | - |
| `mark-as-read` | Required | - | Required | - | - | - | - | - | - | - |
| `move-emails` | Required | - | Required | - | - | - | - | - | - | - |
| `list-folders` | Required | Required | - | - | - | - | - | - | - | - |
| `create-folder` | Required | - | Required | - | - | - | - | - | - | - |
| `list-events` | Required | - | - | - | Required | - | - | - | - | - |
| `create-event` | Required | - | - | - | - | Required | - | - | - | - |
| `cancel-event` | Required | - | - | - | - | Required | - | - | - | - |
| `delete-event` | Required | - | - | - | - | Required | - | - | - | - |
| `decline-event` | Required | - | - | - | - | Required | - | - | - | - |
| `list-rules` | Required | Required | - | - | - | - | - | - | - | - |
| `create-rule` | Required | - | Required | - | - | - | - | - | - | - |
| `rules_editSequence` | Required | - | Required | - | - | - | - | - | - | - |
| `list-contacts` | Required | - | - | - | - | - | Required | - | - | - |
| `create-contact` | Required | - | - | - | - | - | - | Required | - | - |
| `update-contact` | Required | - | - | - | - | - | - | Required | - | - |
| `delete-contact` | Required | - | - | - | - | - | - | Required | - | - |
| `get-mailbox-settings` | Required | - | - | - | - | - | - | - | Required | - |
| `set-auto-reply` | Required | - | - | - | - | - | - | - | - | Required |

---

## Loadout Comparison

| Feature | Read-Only | Email Ops | Calendar Ops | Standard | Full |
|---------|:---------:|:---------:|:------------:|:--------:|:----:|
| Read emails | Yes | Yes | Yes | Yes | Yes |
| Send emails | No | Yes | No | Yes | Yes |
| Manage folders | No | Yes | No | Yes | Yes |
| Manage rules | No | Yes | No | Yes | Yes |
| Read calendar | No | No | Yes | Yes | Yes |
| Manage events | No | No | Yes | Yes | Yes |
| Read contacts | Yes | No | No | Yes | Yes |
| Manage contacts | No | No | No | No | Yes |
| Read settings | Yes | Yes | No | Yes | Yes |
| Set auto-reply | No | No | No | No | Yes |
| **Total Permissions** | 5 | 5 | 4 | 8 | 10 |
| **Risk Level** | Low | Medium | Medium | Medium | High |

---

## Entra ID App Registration

### Configuring Permissions

1. Navigate to **Azure Portal** > **Entra ID** > **App registrations**
2. Select your Outlook MCP Server app registration
3. Go to **API permissions** > **Add a permission**
4. Select **Microsoft Graph** > **Delegated permissions**
5. Add permissions according to your chosen loadout
6. Click **Grant admin consent** (if required by org policy)

### Example: Standard Loadout via Azure CLI

```bash
# Get the app's service principal object ID
az ad sp list --display-name "Outlook MCP Server" --query "[].id" -o tsv

# Add delegated permissions (Standard Loadout)
az ad app permission add \
  --id <app-id> \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions \
    e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope \
    570282fd-fa5c-430d-a7fd-fc8dc98a9dca=Scope \
    024d486e-b451-40bb-833d-3e66d98c5c73=Scope \
    e383f46e-2787-4529-855e-0e479a3ffac0=Scope \
    465a38f9-76ea-45b9-9f34-9e8b0d4b0b42=Scope \
    662d75ba-a364-42ad-adee-f5f880ea4878=Scope \
    ff74d97f-43af-4b68-9f2a-b77ee6968c5d=Scope \
    87f447af-9fa4-4c32-9dfa-4a57a73d18ce=Scope
```

### Permission GUIDs Reference

| Permission | GUID |
|------------|------|
| `User.Read` | `e1fe6dd8-ba31-4d61-89e7-88639da4683d` |
| `Mail.Read` | `570282fd-fa5c-430d-a7fd-fc8dc98a9dca` |
| `Mail.ReadWrite` | `024d486e-b451-40bb-833d-3e66d98c5c73` |
| `Mail.Send` | `e383f46e-2787-4529-855e-0e479a3ffac0` |
| `Calendars.Read` | `465a38f9-76ea-45b9-9f34-9e8b0d4b0b42` |
| `Calendars.ReadWrite` | `ef54d2bf-783f-4e0f-bca1-3210c0444d99` |
| `Contacts.Read` | `ff74d97f-43af-4b68-9f2a-b77ee6968c5d` |
| `Contacts.ReadWrite` | `d56682ec-c09e-4743-aaf4-1a3aac4caa21` |
| `MailboxSettings.Read` | `87f447af-9fa4-4c32-9dfa-4a57a73d18ce` |
| `MailboxSettings.ReadWrite` | `818c620a-27a9-40bd-a6a5-d96f7d610b4b` |

---

## Security Recommendations

### Principle of Least Privilege

1. Start with **Read-Only** loadout during initial deployment
2. Add write permissions only as specific use cases are validated
3. Use **Standard** loadout for most production scenarios
4. Reserve **Full Access** for designated power users only

### Conditional Access Policies

Consider implementing Entra ID Conditional Access policies:

- Require MFA for Outlook MCP Server authentication
- Restrict access to compliant devices only
- Limit access by IP range or location
- Set session timeouts for sensitive operations

### Monitoring

Enable the following for audit trails:

- Microsoft 365 Unified Audit Log
- Entra ID Sign-in logs
- Graph API activity reports

---

## References

- [Microsoft Graph Permissions Reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Entra ID App Registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Conditional Access Overview](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview)

---

*Document Version: 1.0*  
*Last Updated: November 2025*