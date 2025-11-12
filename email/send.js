/**
 * Send email functionality
 */
const config = require('../config');
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Send email handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleSendEmail(args) {
  const { sanitizeText, isSuspicious } = require('../utils/sanitize');
  require('../config').ensureConfigSafe();
  const { to, cc, bcc, subject, body, importance = 'normal', saveToSentItems = true, confirm } = args;
  // Secure prompting mode (from config)
  const { SECURE_PROMPT_MODE } = require('../config');
  if (SECURE_PROMPT_MODE && !confirm) {
    // Sanitize and check for suspicious input
    const safeSubject = sanitizeText(subject);
    const safeTo = sanitizeText(to);
    const safeCc = sanitizeText(cc);
    const safeBcc = sanitizeText(bcc);
    if ([subject, to, cc, bcc].some(isSuspicious)) {
      return {
        content: [{
          type: "text",
          text: "Suspicious input detected in email fields. Action blocked."
        }],
        requiresConfirmation: false
      };
    }
    return {
      content: [{
        type: "text",
        text: `Are you sure you want to send this email?\nSubject: ${safeSubject}\nTo: ${safeTo}${cc ? `\nCC: ${safeCc}` : ''}${bcc ? `\nBCC: ${safeBcc}` : ''}\n\nReply with confirm=true to proceed.`
      }],
      requiresConfirmation: true
    };
  }
  
  // Validate required parameters
  if (!to) {
    return {
      content: [{ 
        type: "text", 
        text: "Recipient (to) is required."
      }]
    };
  }
  
  if (!subject) {
    return {
      content: [{ 
        type: "text", 
        text: "Subject is required."
      }]
    };
  }
  
  if (!body) {
    return {
      content: [{ 
        type: "text", 
        text: "Body content is required."
      }]
    };
  }
  
  try {
    // Get access token
    const accessToken = await ensureAuthenticated();
    
    // Format recipients
    const toRecipients = to.split(',').map(email => {
      email = email.trim();
      return {
        emailAddress: {
          address: email
        }
      };
    });
    
    const ccRecipients = cc ? cc.split(',').map(email => {
      email = email.trim();
      return {
        emailAddress: {
          address: email
        }
      };
    }) : [];
    
    const bccRecipients = bcc ? bcc.split(',').map(email => {
      email = email.trim();
      return {
        emailAddress: {
          address: email
        }
      };
    }) : [];
    
    // Prepare email object
    const emailObject = {
      message: {
        subject,
        body: {
          contentType: body.includes('<html') ? 'html' : 'text',
          content: body
        },
        toRecipients,
        ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
        bccRecipients: bccRecipients.length > 0 ? bccRecipients : undefined,
        importance
      },
      saveToSentItems
    };
    
    // Make API call to send email
    await callGraphAPI(accessToken, 'POST', 'me/sendMail', emailObject);
    
    return {
      content: [{ 
        type: "text", 
        text: `Email sent successfully!\n\nSubject: ${subject}\nRecipients: ${toRecipients.length}${ccRecipients.length > 0 ? ` + ${ccRecipients.length} CC` : ''}${bccRecipients.length > 0 ? ` + ${bccRecipients.length} BCC` : ''}\nMessage Length: ${body.length} characters`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{ 
          type: "text", 
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }
    
    return {
      content: [{ 
        type: "text", 
        text: `Error sending email: ${error.message}`
      }]
    };
  }
}

module.exports = handleSendEmail;
