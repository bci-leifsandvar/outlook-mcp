# Custom Outlook MCP Server Documentation
## BCI Environment
**Setup Date:** November 2025  
**Administrator:** L (IT Support/Service Desk Operations)  
**Organization:** British Columbia Investment Corporation (BCI)  
**Status:** ⚠️ Operational with Known Limitations

---

## Executive Summary

**Setup Status:** ⚠️ PARTIALLY OPERATIONAL  
The custom Outlook MCP Server has been successfully deployed and core functionality tested at BCI. Authentication and basic read operations confirmed working.

**Tested Capabilities: 8 of 13 ✓**

✅ **Authentication** - Working  
✅ **Email Listing** - Working  
✅ **Email Reading** - Working  
✅ **Email Search** - Working  
✅ **Folder Management (Read)** - Working  
✅ **Calendar Event Listing** - Working  
✅ **Server Information** - Working  
✅ **Authentication Status Check** - Working  

⚠️ **Send Email** - Requires confirmation workflow fix  
⚠️ **Create Calendar Event** - Requires confirmation workflow fix  
❌ **Mark Email as Read/Unread** - 403 Permission Error  
❌ **Create Folder** - 403 Permission Error  
❌ **Inbox Rules Management** - Implementation Bug  

### ⚠️ Critical Findings

1. **Confirmation Workflow Gap** - Secure actions (send-email, create-event, decline-event, cancel-event) lack mechanism to submit confirmation tokens
3. **Implementation Bug** - list-rules tool handler not properly configured

---

## Overview

This document tracks the deployment and testing of a custom-built Outlook MCP (Model Context Protocol) Server at BCI. The server provides Claude with 19 tools for Microsoft Graph API integration, enabling comprehensive Outlook management including email operations, calendar management, folder organization, and inbox rules automation.

### Server Architecture

**Type:** Custom Node.js MCP Server  
**Protocol:** JSON-RPC 2.0 over stdio  
**API Integration:** Microsoft Graph API  
**Authentication:** OAuth 2.0 with device code flow  
**Local Server:** http://localhost:3333

### Design Goals

- Modular architecture for improved maintainability
- Comprehensive Microsoft Graph API coverage for Outlook operations
- Secure action confirmation for write operations
- Support for institutional investment email validation workflows

---

## Prerequisites

- [x] Claude Team or Enterprise plan with MCP support
- [x] Microsoft 365 tenant with user access
- [x] Microsoft Graph API permissions
- [x] Node.js runtime environment
- [x] Local development environment for MCP server
- [x] Network access through corporate Zscaler proxy

---

## Server Components

### Core Files

**Server Implementation:**
- Main server file with 19 tool definitions
- Modular handler architecture
- OAuth authentication flow
- Token management system

**Configuration:**
- Client ID: 61b7386a-06f8-4271-8407-098c606ef306
- Auth endpoint: http://localhost:3333/auth
- Microsoft Graph API base URL

---

## Available Tools (19 Tools)

### Authentication Tools (2)
1. **authenticate** - Initiate OAuth flow with Microsoft Graph API
2. **check-auth-status** - Verify current authentication state

### Email Management Tools (6)
3. **list-emails** - List recent emails from specified folder
4. **search-emails** - Search emails with filters (query, from, to, subject, unread, attachments)
5. **read-email** - Read complete content of specific email
6. **send-email** - Compose and send new email (requires confirmation)
7. **mark-as-read** - Mark email as read or unread
8. **move-emails** - Move emails between folders

### Calendar Tools (5)
9. **list-events** - List upcoming calendar events
10. **create-event** - Create new calendar event (requires confirmation)
11. **decline-event** - Decline calendar event (requires confirmation)
12. **cancel-event** - Cancel calendar event (requires confirmation)
13. **delete-event** - Delete calendar event

### Folder Management Tools (3)
14. **list-folders** - List mail folders with hierarchy and counts
15. **create-folder** - Create new mail folder
16. **move-emails** - Move emails to different folders

### Inbox Rules Tools (3)
17. **list-rules** - List inbox rules with details
18. **create-rule** - Create new inbox rule
19. **edit-rule-sequence** - Modify rule execution order

### Utility Tools (1)
20. **about** - Display server information and version

---

## Testing Status

### Date Tested: November 18, 2025
**Tester:** L (IT Support)  
**Environment:** BCI Corporate Network with Zscaler

---

## Completed Tests ✓

### 1. Authentication System ✓ WORKING
**Status:** Successfully tested  
**Tools Tested:**
- authenticate
- check-auth-status

**Test Results:**
- OAuth device code flow initiates correctly
- Authentication URL generated: http://localhost:3333/auth?client_id=...
- Token acquisition successful after user consent
- Authentication state properly tracked

**Notes:** Authentication must be completed before any API operations

---

### 2. Email Listing ✓ WORKING
**Status:** Successfully tested  
**Tools Tested:**
- list-emails (inbox)
- list-emails (sent)

**Test Results:**
```
Inbox: 23 items (23 unread)
Sent Items: 5 items
```

**Sample Output:**
- Displays sender, subject, date, read status
- Includes message ID for further operations
- Shows undeliverable messages from recent send attempts

**Notes:** Successfully retrieves email metadata from specified folders

---

### 3. Email Reading ✓ WORKING
**Status:** Successfully tested  
**Tools Tested:**
- read-email

**Test Results:**
- Successfully retrieved full email content
- Displays headers (From, To, Subject, Date, Importance)
- Shows attachment status
- Returns complete body content

**Sample Email Read:**
- Undeliverable notification email
- Complete diagnostic information retrieved
- Headers properly parsed

**Notes:** Provides comprehensive email detail including technical headers

---

### 4. Email Search ✓ WORKING
**Status:** Successfully tested  
**Tools Tested:**
- search-emails

**Test Parameters:**
- Query: "MCP Server"
- Count: 3
- Results: 3 matching emails found

**Search Capabilities Confirmed:**
- Keyword search functional
- Results include all standard metadata
- Proper result limiting

**Notes:** Search works across email content and metadata

---

### 5. Folder Management (Read) ✓ WORKING
**Status:** Successfully tested  
**Tools Tested:**
- list-folders (with hierarchy and item counts)

**Test Results:**
```
Archive - 0 items
Conversation History - 0 items
Deleted Items - 0 items
Drafts - 0 items
Inbox - 23 items (23 unread)
Junk Email - 0 items
Outbox - 0 items
Sent Items - 5 items
```

**Features Confirmed:**
- Hierarchical folder display
- Item counts per folder
- Unread item counts
- Standard Exchange folders visible

**Notes:** Read operations fully functional

---

### 6. Calendar Event Listing ✓ WORKING
**Status:** Successfully tested  
**Tools Tested:**
- list-events

**Test Results:**
- Query executed successfully
- Result: "No calendar events found."
- Proper handling of empty calendar

**Notes:** Calendar integration functional, awaiting events for fuller testing

---

### 7. Server Information ✓ WORKING
**Status:** Successfully tested  
**Tools Tested:**
- about

**Server Response:**
```
MODULAR Outlook Assistant MCP Server v1.0.0
Provides access to Microsoft Outlook email, calendar, and contacts 
through Microsoft Graph API.
Implemented with a modular architecture for improved maintainability.
```

**Notes:** Server metadata properly exposed

---

### 8. Authentication Status Check ✓ WORKING
**Status:** Successfully tested  
**Tools Tested:**
- check-auth-status

**States Confirmed:**
- "Not authenticated" - before auth flow
- "Authenticated and ready" - after successful auth

**Notes:** Reliable authentication state tracking

---

## Tests with Issues ⚠️

### 9. Send Email ⚠️ CONFIRMATION WORKFLOW INCOMPLETE
**Status:** Partially working - requires enhancement  
**Tools Tested:**
- send-email

**Current Behavior:**
1. Tool call generates email draft
2. System requests confirmation token (e.g., "B90AFD", "A7FF4B")
3. User provides token
4. Subsequent tool call returns `null`
5. Email NOT actually sent

**Root Cause:**
- No parameter in send-email function to accept confirmation token
- No separate confirm-send-email tool exists
- Confirmation mechanism not implemented

**Required Fix:**
Add one of:
- Token parameter to send-email function
- Separate confirmation tool (e.g., confirm-email-send)
- Modify secure action handling workflow

**Priority:** HIGH - Blocks primary use case

---

### 10. Create Calendar Event ⚠️ CONFIRMATION WORKFLOW INCOMPLETE
**Status:** Partially working - requires enhancement  
**Tools Tested:**
- create-event

**Test Details:**
```
Subject: Test MCP Server Event
Start: 2025-11-19T10:00:00
End: 2025-11-19T11:00:00
Confirmation Token Required: BA01B8
```

**Current Behavior:**
- Event parameters accepted
- Confirmation token generated
- No mechanism to submit confirmation
- Event not created

**Root Cause:** Same as send-email - missing confirmation submission mechanism

**Required Fix:** Implement confirmation workflow for all secure calendar actions:
- create-event
- decline-event
- cancel-event

**Priority:** MEDIUM - Important for calendar management

---

### 11. Mark Email as Read/Unread ❌ PERMISSION DENIED
**Status:** Not working - insufficient permissions  
**Tools Tested:**
- mark-as-read

**Error Response:**
```json
{
  "error": {
    "code": "ErrorAccessDenied",
    "message": "Access is denied. Check credentials and try again."
  }
}
```

**HTTP Status:** 403 Forbidden

**Root Cause:**
- Missing Mail.ReadWrite permission scope
- Current permissions likely limited to Mail.Read only

**Required Permission:**
- Mail.ReadWrite - Required to modify email properties

**Required Fix:**
1. Add Mail.ReadWrite to app registration
2. Update OAuth scope requests
3. Trigger admin consent for new permission
4. Re-authenticate users

**Priority:** MEDIUM - Useful but not critical functionality

---

### 12. Create Folder ❌ PERMISSION DENIED
**Status:** Not working - insufficient permissions  
**Tools Tested:**
- create-folder

**Test Parameters:**
- Folder Name: "Test MCP Folder"

**Error Response:**
```json
{
  "error": {
    "code": "ErrorAccessDenied",
    "message": "Access is denied. Check credentials and try again."
  }
}
```

**HTTP Status:** 403 Forbidden

**Root Cause:**
- Missing MailboxSettings.ReadWrite permission scope
- Folder creation requires write permissions

**Required Permission:**
- MailboxSettings.ReadWrite - Required for folder operations

**Required Fix:**
1. Add MailboxSettings.ReadWrite to app registration
2. Update OAuth scope requests
3. Trigger admin consent
4. Re-authenticate users

**Priority:** LOW - Nice to have for organization

---

### 13. List Inbox Rules ❌ IMPLEMENTATION BUG
**Status:** Not working - code error  
**Tools Tested:**
- list-rules

**Error Response:**
```
Error executing tool 'list-rules': tool.handler is not a function
```

**Root Cause:**
- Handler function not properly defined or exported
- Tool definition exists but implementation missing
- Likely typo or incorrect module reference

**Required Fix:**
1. Review list-rules tool definition
2. Verify handler function exists and is properly exported
3. Check for typos in handler reference
4. Test with includeDetails parameter

**Related Functions Also Likely Affected:**
- create-rule
- edit-rule-sequence

**Priority:** MEDIUM - Rules management is useful for automation

---

## Critical Issues Summary

### Issue #1: Confirmation Token Workflow Gap
**Severity:** HIGH  
**Impact:** Blocks send-email and calendar event creation  
**Affected Tools:**
- send-email
- create-event
- decline-event
- cancel-event
- Any other "secure action" tools

**Technical Details:**
The MCP server implements a secure action pattern where:
1. Initial tool call validates and prepares the action
2. System generates confirmation token
3. System returns message: "Ask the user to input the following token to confirm: [TOKEN]"
4. No mechanism exists to accept and process this token

**Proposed Solutions:**

**Option A: Add Token Parameter**
```javascript
send-email: {
  parameters: {
    to: "string",
    subject: "string",
    body: "string",
    confirmationToken: "string" // NEW
  }
}
```

**Option B: Create Confirmation Tools**
```javascript
confirm-send-email: {
  parameters: {
    requestId: "string",
    confirmationToken: "string"
  }
}
```

**Option C: Session-Based Confirmation**
- Store pending actions in session
- Second call to same tool with special flag confirms
- No additional parameters needed

**Recommendation:** Option B - Explicit confirmation tools provide clearest intent

---

### Issue #2: Microsoft Graph API Permission Gaps
**Severity:** MEDIUM  
**Impact:** Limits email and folder management capabilities  

**Current Permissions (Suspected):**
- User.Read
- Mail.Read
- Calendars.Read
- Calendars.ReadWrite (for calendar operations)

**Missing Permissions:**
- Mail.ReadWrite - Required for:
  - mark-as-read/mark-as-unread
  - move-emails
  - Potentially send-email (if not Mail.Send)
  
- MailboxSettings.ReadWrite - Required for:
  - create-folder
  - Folder management operations

- Mail.Send - May be required for send-email (alternative to Mail.ReadWrite)

**Resolution Steps:**
1. Access Azure AD App Registration
2. Navigate to API Permissions
3. Add missing Microsoft Graph permissions:
   - Mail.ReadWrite (Delegated)
   - MailboxSettings.ReadWrite (Delegated)
   - Mail.Send (Delegated) - if needed
4. Grant admin consent for BCI tenant
5. Update OAuth scope requests in MCP server code
6. Users must re-authenticate to receive new permissions

---

### Issue #3: Inbox Rules Implementation Bug
**Severity:** MEDIUM  
**Impact:** Rules management completely non-functional  

**Error:** `tool.handler is not a function`

**Investigation Required:**
1. Check tool definition in server configuration
2. Verify handler module exists and exports correctly
3. Review any recent changes to rules-related code
4. Compare working tools (e.g., list-folders) vs broken tool structure

**Likely Causes:**
- Typo in handler function name
- Missing export statement
- Incorrect module path
- Handler not yet implemented despite tool being defined

---

### Issue #4: SSL Certificate Verification (Zscaler)
**Severity:** LOW (Documented, workaround available)  
**Impact:** Connection issues in BCI corporate environment  

**Context:**
BCI uses Zscaler proxy which performs SSL inspection, causing certificate verification failures for external API calls.

**Symptoms:**
- SSL certificate errors when connecting to Microsoft Graph API
- Connection timeouts or rejections
- "Certificate verify failed" errors

**Workarounds:**
1. Add Zscaler root certificate to Node.js certificate store
2. Configure corporate proxy settings
3. Set NODE_EXTRA_CA_CERTS environment variable
4. For development only: NODE_TLS_REJECT_UNAUTHORIZED=0 (not for production)

**Proper Solution:**
Install Zscaler certificate bundle in development environment using existing Intune remediation scripts.

---

## Microsoft Graph API Permissions

### Current Permissions (Estimated)
Based on working functionality:
- User.Read
- Mail.Read
- Calendars.Read
- Calendars.ReadWrite

### Required Additional Permissions

#### For Email Management
```
Mail.ReadWrite (Delegated)
Description: Allows the app to read, update, create, and delete email in user mailboxes
Required for: mark-as-read, move-emails
```

```
Mail.Send (Delegated)
Description: Allows the app to send mail as the signed-in user
Required for: send-email
```

#### For Folder Management
```
MailboxSettings.ReadWrite (Delegated)
Description: Allows the app to read, update, create, and delete mailbox settings
Required for: create-folder, folder operations
```

#### For Rules Management
```
MailboxSettings.ReadWrite (Delegated)
Description: Already listed above, also covers rules management
Required for: list-rules, create-rule, edit-rule-sequence
```

### Permission Update Process

**Step 1: Update App Registration**
1. Navigate to Azure Portal → App Registrations
2. Select application: 61b7386a-06f8-4271-8407-098c606ef306
3. Go to API Permissions
4. Click "Add a permission"
5. Select Microsoft Graph → Delegated permissions
6. Add:
   - Mail.ReadWrite
   - Mail.Send
   - MailboxSettings.ReadWrite
7. Click "Add permissions"

**Step 2: Grant Admin Consent**
1. Click "Grant admin consent for [BCI]"
2. Confirm the action
3. Verify all permissions show "Granted" status

**Step 3: Update MCP Server Code**
Update OAuth scope requests to include new permissions:
```javascript
const scopes = [
  'User.Read',
  'Mail.Read',
  'Mail.ReadWrite',  // NEW
  'Mail.Send',       // NEW
  'Calendars.Read',
  'Calendars.ReadWrite',
  'MailboxSettings.ReadWrite'  // NEW
];
```

**Step 4: User Re-authentication**
All users must re-authenticate to receive new permissions:
1. Call check-auth-status
2. If previously authenticated, authentication state may be invalid
3. Call authenticate to initiate new OAuth flow
4. User consents to updated permissions
5. New token issued with expanded scopes

---

## Security Considerations

### Token Storage
- Tokens stored locally during session
- No persistent token storage implemented
- Users must re-authenticate periodically
- Consider implementing secure token refresh

### Data Access Model
- Delegated permissions only
- Users can only access their own data
- No admin or application-level permissions
- Read operations generally safer than write operations

### Secure Actions
- Write operations require confirmation tokens
- Prevents accidental data modification
- User explicitly confirms before:
  - Sending emails
  - Creating calendar events
  - Declining/canceling events

### Corporate Environment
- Operates within BCI network security policies
- Subject to Zscaler SSL inspection
- No external data storage by MCP server
- Real-time API calls only

---

## Testing Recommendations

### Immediate Priority Tests

**1. Fix and Test Confirmation Workflow**
Once confirmation mechanism implemented:
- Test send-email with confirmation
- Test create-event with confirmation
- Verify decline-event and cancel-event
- Confirm secure action pattern works consistently

**2. Add Permissions and Retest**
After permissions updated:
- Retry mark-as-read operation
- Test mark-as-unread
- Retry create-folder operation
- Test move-emails between folders

**3. Fix and Test Inbox Rules**
After handler bug resolved:
- Test list-rules with and without details
- Test create-rule with various conditions
- Test edit-rule-sequence
- Verify rules actually apply to incoming mail

### Comprehensive Use Case Testing

**Email Management Workflow**
```
1. Search for emails from specific sender
2. Read email content
3. Mark as read
4. Move to specific folder
5. Reply to email (if reply functionality added)
```

**Calendar Management Workflow**
```
1. List upcoming events
2. Create new meeting
3. Invite attendees
4. Decline conflicting event
5. Cancel event if needed
```

**Folder Organization Workflow**
```
1. List existing folders
2. Create project-specific folders
3. Create rules to auto-file emails
4. Move existing emails to folders
5. Verify folder hierarchy
```

**Institutional Email Validation** (Your specific use case)
```
1. Search for emails from institutional investors
2. Read and validate email authentication headers
3. Check SPF, DKIM, DMARC status
4. Flag suspicious emails
5. Move validated emails to appropriate folders
```

---

## Next Steps

### Critical Path (Must Do)

- [ ] **Implement confirmation token mechanism**
  - Choose solution approach (token parameter vs confirmation tools)
  - Update affected tools: send-email, create-event, decline-event, cancel-event
  - Test workflow end-to-end
  - Document new confirmation process

- [ ] **Add missing Microsoft Graph permissions**
  - Update Azure AD app registration
  - Add Mail.ReadWrite, Mail.Send, MailboxSettings.ReadWrite
  - Grant admin consent
  - Update OAuth scope requests in code
  - Test that new permissions are acquired

- [ ] **Fix inbox rules handler bug**
  - Debug list-rules tool handler
  - Fix implementation error
  - Test all three rules tools
  - Verify rules actually work in practice

### High Priority (Should Do)

- [ ] **Comprehensive permission testing**
  - Retest mark-as-read after permission update
  - Test create-folder after permission update
  - Test move-emails functionality
  - Document any remaining permission issues

- [ ] **Expand calendar testing**
  - Create actual calendar events
  - Test with multiple attendees
  - Test decline and cancel workflows
  - Verify calendar sync

- [ ] **Email validation workflow implementation**
  - Develop institutional investment email validation
  - Test SPF/DKIM/DMARC header checking
  - Create automation for email authentication
  - Document validation process

### Medium Priority (Nice to Have)

- [ ] **Add reply and forward functionality**
  - Implement reply-email tool
  - Implement forward-email tool
  - Test with threading and attachments

- [ ] **Enhance search capabilities**
  - Test advanced search filters
  - Implement date range filtering
  - Add importance level filtering
  - Test combination filters

- [ ] **Implement contact management**
  - Add list-contacts tool
  - Add search-contacts tool
  - Add create-contact tool
  - Integrate with email operations

- [ ] **Error handling improvements**
  - Better error messages for permission issues
  - Retry logic for transient failures
  - Validation before API calls
  - User-friendly error responses

### Future Enhancements

- [ ] **Attachment management**
  - Download attachments
  - Upload attachments to emails
  - Attachment scanning/validation
  - Virus checking integration

- [ ] **Batch operations**
  - Bulk email operations
  - Mass folder moves
  - Batch rule creation
  - Performance optimization

- [ ] **Advanced automation**
  - Email template system
  - Scheduled email sending
  - Complex rule conditions
  - Integration with ServiceDesk Toolbox

- [ ] **Monitoring and logging**
  - Usage analytics
  - Performance metrics
  - Error tracking
  - Audit logging for compliance

---

## Troubleshooting Guide

### Authentication Issues

**Problem: "Not authenticated" after completing auth flow**
```
Solution:
1. Check if auth token expired
2. Verify redirect URL configuration
3. Check if http://localhost:3333 is accessible
4. Restart MCP server if needed
5. Re-run authenticate tool
```

**Problem: Authentication URL not opening**
```
Solution:
1. Copy URL manually and paste in browser
2. Check if port 3333 is available
3. Verify no firewall blocking localhost
4. Check MCP server logs for errors
```

### Permission Errors (403 Forbidden)

**Problem: "Access is denied" errors**
```
Diagnosis:
1. Note which tool is failing
2. Check error message for specific permission needed
3. Verify app registration permissions

Solution:
1. Add required permission to Azure AD app
2. Grant admin consent
3. Update OAuth scopes in code
4. Users must re-authenticate
```

### Connection Issues

**Problem: SSL certificate verification failures**
```
Context: Zscaler SSL inspection in BCI environment

Solution:
1. Install Zscaler root certificate
2. Set NODE_EXTRA_CA_CERTS environment variable
3. Update certificate bundle using Intune scripts
4. For dev only: NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Problem: Timeout connecting to Graph API**
```
Solution:
1. Check internet connectivity
2. Verify proxy settings
3. Check if Graph API is accessible: https://graph.microsoft.com/v1.0/me
4. Review network logs
5. Contact IT if persistent
```

### Tool-Specific Issues

**Problem: send-email returns null**
```
Known Issue: Confirmation workflow incomplete
Status: Fix in progress
Workaround: None currently - feature unavailable
```

**Problem: list-rules shows "handler is not a function"**
```
Known Issue: Implementation bug
Status: Under investigation
Workaround: None - feature unavailable
```

**Problem: No emails returned from list-emails**
```
Diagnosis:
1. Verify you have emails in the specified folder
2. Check if folder name is correct (case-sensitive)
3. Verify authentication token is valid

Solution:
1. Test with folder="inbox" first
2. Check folder list with list-folders
3. Re-authenticate if token expired
```

---

## Integration with BCI Systems

### ServiceDesk Toolbox Integration
Potential integration points with your existing PowerShell automation:

**Email Automation**
- Trigger PowerShell scripts based on email rules
- Send automated status emails via MCP
- Email notifications for AD changes
- ServiceNow ticket updates via email

**Adobe License Management**
- Email notifications for license allocations
- Send license reports to stakeholders
- Alert on license threshold violations

**Active Directory Operations**
- Email confirmations for user provisioning
- Send group membership reports
- Alert on True Up discrepancies
- Notification for security group changes

### Workflow Examples

**User Onboarding Notification**
```
PowerShell creates new AD account
→ MCP server sends welcome email with credentials
→ Calendar event created for orientation
```

**License Alert System**
```
PowerShell checks Adobe license usage
→ Threshold exceeded
→ MCP server sends alert email to management
→ Creates follow-up calendar reminder
```

**Report Distribution**
```
PowerShell generates report
→ MCP server sends to distribution list
→ Creates rule to file responses
→ Organizes feedback in folder
```

---

## Known Limitations

### Current Limitations

1. **Confirmation Workflow Incomplete**
   - Cannot complete send-email operations
   - Cannot create calendar events with attendees
   - Secure actions remain non-functional

2. **Limited Write Permissions**
   - Cannot mark emails as read/unread
   - Cannot create folders
   - Cannot modify email properties

3. **Rules Management Non-Functional**
   - Cannot list existing rules
   - Cannot create automation rules
   - Cannot reorder rule execution

4. **No Attachment Support**
   - Cannot read attachment contents
   - Cannot send emails with attachments
   - Cannot download attachments

5. **No Reply/Forward Functions**
   - Must compose new emails only
   - Cannot maintain email threads
   - No conversation tracking

6. **No Contact Management**
   - Cannot access contacts
   - Cannot create/update contacts
   - No contact lookup integration

### Architectural Limitations

1. **Session-Based Authentication**
   - No persistent token storage
   - Must re-authenticate periodically
   - No automatic token refresh

2. **Single User Context**
   - Cannot impersonate other users
   - No shared mailbox support
   - No admin-level operations

3. **Synchronous Operations Only**
   - No batch processing
   - No background tasks
   - Sequential API calls only

4. **Local Server Dependency**
   - Requires localhost:3333 accessible
   - No remote deployment option
   - Single instance limitation

---

## Comparison with Anthropic M365 MCP

### Advantages of Custom Solution

**Tailored Functionality**
- Focused specifically on Outlook operations
- Optimized for BCI workflows
- Customizable tool implementations
- Faster iteration on feature requests

**Security Control**
- Full control over authentication flow
- Custom secure action patterns
- Audit logging implementation possible
- Data handling fully transparent

**Integration Capability**
- Can integrate with ServiceDesk Toolbox
- Custom validation logic for institutional emails
- PowerShell script triggering possible
- BCI-specific automation workflows

### Advantages of Anthropic M365 MCP

**Broader Coverage**
- SharePoint integration
- Teams chat access
- OneDrive files
- Meeting transcripts
- Cross-platform search

**Managed Solution**
- Maintained by Anthropic
- Regular updates
- Enterprise support
- Proven at scale

**Immediate Availability**
- No development required
- Standard authentication
- Comprehensive permissions
- Full documentation

### Recommendation

**Use Custom Outlook MCP for:**
- Email-centric workflows
- BCI-specific automation
- Integration with existing PowerShell tools
- Custom validation requirements
- Lightweight operations

**Use Anthropic M365 MCP for:**
- Cross-platform searches
- SharePoint document access
- Teams collaboration
- Meeting transcripts
- Broader organizational needs

**Optimal Approach:**
- Deploy both MCPs simultaneously
- Use custom MCP for Outlook-specific tasks
- Use Anthropic MCP for broader M365 integration
- Coordinate between tools as needed

---

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2025-11 | Initial custom MCP server development | L |
| 2025-11 | Resolved JSON-RPC communication issues | L |
| 2025-11 | Fixed schema validation problems | L |
| 2025-11 | Implemented email authentication validation | L |
| 2025-11 | Addressed Zscaler SSL certificate issues | L |
| 2025-11-18 | Completed comprehensive functionality testing | L |
| 2025-11-18 | Documented confirmation workflow limitation | L |
| 2025-11-18 | Identified missing API permissions | L |
| 2025-11-18 | Documented list-rules implementation bug | L |
| 2025-11-18 | Created comprehensive documentation | L |

---

## Appendix A: Tool Reference

### Complete Tool Catalog

#### Authentication Tools
```
authenticate
  Parameters: force (boolean, optional)
  Returns: Auth URL
  Status: Working

check-auth-status
  Parameters: None
  Returns: Authentication state
  Status: Working
```

#### Email Tools
```
list-emails
  Parameters: count (1-50), folder (string)
  Returns: Email list with metadata
  Status: Working

search-emails
  Parameters: query, from, to, subject, unreadOnly, hasAttachments, folder, count
  Returns: Matching emails
  Status: Working

read-email
  Parameters: id (string)
  Returns: Complete email content
  Status: Working

send-email
  Parameters: to, cc, bcc, subject, body, importance, saveToSentItems
  Returns: Confirmation request
  Status: Partially working - needs confirmation fix

mark-as-read
  Parameters: id (string), isRead (boolean)
  Returns: Success/failure
  Status: Not working - permission denied

move-emails
  Parameters: emailIds, targetFolder, sourceFolder
  Returns: Success/failure
  Status: Unknown - needs testing
```

#### Calendar Tools
```
list-events
  Parameters: count (1-50)
  Returns: Event list
  Status: Working

create-event
  Parameters: subject, start, end, attendees, body
  Returns: Confirmation request
  Status: Partially working - needs confirmation fix

decline-event
  Parameters: eventId, comment
  Returns: Confirmation request
  Status: Needs testing

cancel-event
  Parameters: eventId, comment
  Returns: Confirmation request
  Status: Needs testing

delete-event
  Parameters: eventId
  Returns: Success/failure
  Status: Needs testing
```

#### Folder Tools
```
list-folders
  Parameters: includeChildren, includeItemCounts
  Returns: Folder hierarchy
  Status: Working

create-folder
  Parameters: name, parentFolder
  Returns: Success/failure
  Status: Not working - permission denied
```

#### Rules Tools
```
list-rules
  Parameters: includeDetails
  Returns: Rules list
  Status: Not working - implementation bug

create-rule
  Parameters: name, fromAddresses, containsSubject, hasAttachments, 
             moveToFolder, markAsRead, isEnabled, sequence
  Returns: Success/failure
  Status: Unknown - needs testing

edit-rule-sequence
  Parameters: ruleName, sequence
  Returns: Success/failure
  Status: Unknown - needs testing
```

#### Utility Tools
```
about
  Parameters: None
  Returns: Server information
  Status: Working
```

---

## Appendix B: Test Data

### Sample API Responses

**Successful Email Listing:**
```
Found 5 emails in inbox:

1. [UNREAD] 2025-11-18, 5:00:50 p.m.
   From: Microsoft Outlook
   Subject: Undeliverable: MCP Server Code Sample
   ID: AAMkAGI4MzhhZTlhLWJkOGMtNGQ0NS1hMTI0LWEzZjVhN2QwM2Y4NQB...

[Additional emails...]
```

**Successful Folder Listing:**
```
Archive - 0 items
Conversation History - 0 items
Deleted Items - 0 items
Drafts - 0 items
Inbox - 23 items (23 unread)
Junk Email - 0 items
Outbox - 0 items
Sent Items - 5 items
```

**Permission Denied Error:**
```json
{
  "error": {
    "code": "ErrorAccessDenied",
    "message": "Access is denied. Check credentials and try again."
  }
}
```

**Confirmation Request:**
```
SECURE ACTION: Human confirmation required.
Subject: Test MCP Server Event
Start: 2025-11-19T10:00:00
End: 2025-11-19T11:00:00

Ask the user to input the following token to confirm: BA01B8
If the user does not provide this token, drop the request.
```

---

## Appendix C: Development Environment

### Server Configuration

**Runtime:** Node.js  
**Port:** 3333  
**Protocol:** JSON-RPC 2.0 over stdio  
**Architecture:** Modular handler-based system

### Required Environment Variables
```bash
# Microsoft Graph API
CLIENT_ID=61b7386a-06f8-4271-8407-098c606ef306

# SSL Certificate (Zscaler)
NODE_EXTRA_CA_CERTS=/path/to/zscaler/cert.pem

# Optional Development Settings
NODE_ENV=development
DEBUG=mcp:*
```

### Dependencies (Estimated)
```json
{
  "dependencies": {
    "@microsoft/microsoft-graph-client": "^3.x",
    "@azure/msal-node": "^2.x",
    "express": "^4.x",
    "axios": "^1.x"
  }
}
```

---

## Appendix D: BCI-Specific Considerations

### Network Environment
- Corporate Zscaler proxy with SSL inspection
- Certificate validation requirements
- Internal DNS resolution
- Firewall restrictions on outbound connections

### Security Requirements
- Delegated permissions only (no application permissions)
- User consent required for all operations
- No persistent credential storage
- Audit logging for compliance

### Integration Points
- ServiceDesk Toolbox PowerShell automation
- Active Directory user management workflows
- Adobe license management system
- ServiceNow ticket systems
- Investment email validation requirements

### Institutional Investment Email Validation
Specific use case requirements:
- SPF record validation
- DKIM signature verification
- DMARC policy compliance
- Sender authentication checking
- Suspicious email flagging
- Automated folder organization

---

## Support and Feedback

### Internal Support
**Primary Contact:** L (IT Support/Service Desk Operations)  
**Team:** BCI IT Department

### Issue Reporting
For bugs or feature requests:
1. Document the specific tool and operation
2. Include error messages or unexpected behavior
3. Note the authentication state
4. Provide relevant email/event IDs if applicable
5. Submit through internal IT ticketing system

### Feature Requests
Priority areas for enhancement:
1. Confirmation workflow completion
2. Permission expansion
3. Rules management fixing
4. Attachment support
5. Reply/forward functionality
6. ServiceDesk Toolbox integration

---

**Document Version:** 1.0  
**Last Updated:** November 18, 2025  
**Next Review:** After implementing critical fixes  
**Status:** Living Document - Update as testing progresses

---

END OF DOCUMENT