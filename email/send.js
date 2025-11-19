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
    // Simple in-memory rate limiting (max 5 emails per minute per user)
    const RATE_LIMIT_MAX = 5;
    const RATE_LIMIT_WINDOW_MS = 60 * 1000;
    const rateLimitStore = global.__sendEmailRateLimit || (global.__sendEmailRateLimit = {});
    const userKey = (args.from || 'unknown') + ':' + (args.user || 'unknown');
    const now = Date.now();
    if (!rateLimitStore[userKey]) rateLimitStore[userKey] = [];
    // Remove timestamps older than window
    rateLimitStore[userKey] = rateLimitStore[userKey].filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (rateLimitStore[userKey].length >= RATE_LIMIT_MAX) {
      return {
        content: [{ type: "text", text: `Rate limit exceeded: Max ${RATE_LIMIT_MAX} emails per minute. Please wait before sending more.` }],
        isError: true
      };
    }
    // Add current timestamp
    rateLimitStore[userKey].push(now);
  const { logSensitiveAction } = require('../utils/sensitive-log');
  // Log attempt (before confirmation)
  const { sanitizeText, isSuspicious } = require('../utils/sanitize');
  require('../config').ensureConfigSafe();
  const { to, cc, bcc, subject, body, importance = 'normal', saveToSentItems = true, confirmationToken } = args;
  logSensitiveAction('sendEmail', args, 'unknown', [subject, to, cc, bcc].some(isSuspicious));
  const { SECURE_PROMPT_MODE } = require('../config');
  const sanitizeHtml = require('sanitize-html');
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (SECURE_PROMPT_MODE) {
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
    // Token-based confirmation logic
    if (!confirmationToken) {
      // Generate a random token and store it in memory for this action
      const crypto = require('crypto');
      const token = crypto.randomBytes(3).toString('hex').toUpperCase();
      if (!global.__sendEmailTokens) global.__sendEmailTokens = {};
      // Use a hash of the email details as the key
      const actionKey = crypto.createHash('sha256').update(`${to}|${cc}|${bcc}|${subject}|${body}`).digest('hex');
      global.__sendEmailTokens[actionKey] = { token, expires: Date.now() + 5 * 60 * 1000 };
      return {
        content: [{
          type: "text",
          text:
            `SECURE ACTION: Human confirmation required.\nSubject: ${safeSubject}\nTo: ${safeTo}${cc ? `\nCC: ${safeCc}` : ''}${bcc ? `\nBCC: ${safeBcc}` : ''}` +
            `\n\nAsk the user to input the following token to confirm sending: ${token}\nIf the user does not provide this token, drop the request.`
        }],
        requiresConfirmation: true,
        confirmationTokenRequired: true
      };
    } else {
      // Validate token
      const crypto = require('crypto');
      const actionKey = crypto.createHash('sha256').update(`${to}|${cc}|${bcc}|${subject}|${body}`).digest('hex');
      const entry = global.__sendEmailTokens && global.__sendEmailTokens[actionKey];
      if (!entry || entry.token !== confirmationToken || Date.now() > entry.expires) {
        return {
          content: [{
            type: "text",
            text: "Invalid or expired confirmation token. Please start the process again."
          }],
          requiresConfirmation: true,
          confirmationTokenRequired: true
        };
      }
      // Token is valid, delete it so it can't be reused
      delete global.__sendEmailTokens[actionKey];
      // Proceed to send
    }
  }
  
  // Validate required parameters
  if (!to) {
    return {
      content: [{ type: "text", text: "Recipient (to) is required." }]
    };
  }
  if (!subject) {
    return {
      content: [{ type: "text", text: "Subject is required." }]
    };
  }
  if (!body) {
    return {
      content: [{ type: "text", text: "Body content is required." }]
    };
  }
  // Validate email addresses
  const allEmails = [ ...(to ? to.split(',') : []), ...(cc ? cc.split(',') : []), ...(bcc ? bcc.split(',') : []) ];
  for (const email of allEmails) {
    if (email.trim() && !emailRegex.test(email.trim())) {
      return {
        content: [{ type: "text", text: `Invalid email address detected: ${email.trim()}` }],
        isError: true
      };
    }
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
    
    // Sanitize HTML body if needed
    let sanitizedBody = body;
    let contentType = 'text';
    if (body.includes('<html') || body.includes('<body') || body.includes('<div')) {
      sanitizedBody = sanitizeHtml(body, {
        allowedTags: sanitizeHtml.defaults.allowedTags,
        allowedAttributes: sanitizeHtml.defaults.allowedAttributes
      });
      contentType = 'html';
    }
    // Prepare email object
    const emailObject = {
      message: {
        subject,
        body: {
          contentType,
          content: sanitizedBody
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
        text: `Email sent successfully!\n\nSubject: ${subject}\nRecipients: ${toRecipients.length}${ccRecipients.length > 0 ? ` + ${ccRecipients.length} CC` : ''}${bccRecipients.length > 0 ? ` + ${bccRecipients.length} BCC` : ''}\nMessage Length: ${sanitizedBody.length} characters`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{ type: "text", text: "Authentication required. Please use the 'authenticate' tool first." }]
      };
    }
    // Sanitize error message for client
    return {
      content: [{ type: "text", text: "Error sending email. Please check your input and try again." }],
      isError: true
    };
  }
}

module.exports = handleSendEmail;
