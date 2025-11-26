/**
 * List emails functionality
 */
const config = require('../config');
const { callGraphAPIPaginated } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { resolveFolderPath } = require('./folder-utils');
const { maskPII } = require('../utils/sanitize'); // optional masking for args.mask

/**
 * List emails handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleListEmails(args) {
  const folder = args.folder || 'inbox';
  const requestedCount = args.count || 10;
  
  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Resolve the folder path
    const endpoint = await resolveFolderPath(accessToken, folder);
    
    // Add query parameters
    const queryParams = {
      $top: Math.min(50, requestedCount), // Use 50 per page for efficiency
      $orderby: 'receivedDateTime desc',
      $select: config.EMAIL_SELECT_FIELDS
    };

    const response = await callGraphAPIPaginated(accessToken, 'GET', endpoint, queryParams, requestedCount);
    
    if (!response.value || response.value.length === 0) {
      return {
        content: [{ 
          type: 'text', 
          text: `No emails found in ${folder}.`
        }]
      };
    }
    
    // Format results with original sender and subject for usability; diagnostics retained
    const emailList = response.value.map((email, index) => {
      const sender = email.from ? email.from.emailAddress : { name: 'Unknown', address: 'unknown' };
      const date = new Date(email.receivedDateTime).toLocaleString();
      const readStatus = email.isRead ? '' : '[UNREAD] ';
      const id = email.id || 'UNKNOWN_ID';
      const folderId = email.parentFolderId || 'UNKNOWN_FOLDER';
      const hasCompositePattern = /AAAAAAEMA/.test(id);
      const lengthMod = id.length % 4;
      const paddingHint = lengthMod === 0 ? '' : ` (suspect: missing padding, len%4=${lengthMod})`;
      const patternHint = hasCompositePattern ? '' : ' (no-composite-pattern)';
      const diag = `${paddingHint}${patternHint}`.trim();
      const diagSuffix = diag ? ` Diagnostics:${diag}` : '';
      let entry = `${index + 1}. ${readStatus}${date} - From: ${sender.name} <${sender.address}>\nSubject: ${email.subject || '(no subject)'}\nID: ${id}${diagSuffix}\nFolder: ${folderId}`;
      if (args.mask) entry = maskPII(entry);
      return entry;
    }).join('\n\n');
    
    return {
      content: [{ 
        type: 'text', 
        text: `Found ${response.value.length} emails in ${folder}:\n\n${emailList}`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{ 
          type: 'text', 
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }
    
    return {
      content: [{ 
        type: 'text', 
        text: `Error listing emails: ${error.message}`
      }]
    };
  }
}

module.exports = handleListEmails;
