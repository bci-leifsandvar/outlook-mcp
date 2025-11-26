/**
 * Send email functionality
 */
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
  const userKey = `${args.from || 'unknown'}:${args.user || 'unknown'}`;
  const now = Date.now();
  if (!rateLimitStore[userKey]) rateLimitStore[userKey] = [];
  // Remove timestamps older than window
  rateLimitStore[userKey] = rateLimitStore[userKey].filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (rateLimitStore[userKey].length >= RATE_LIMIT_MAX) {
    return {
      content: [{ type: 'text', text: `Rate limit exceeded: Max ${RATE_LIMIT_MAX} emails per minute. Please wait before sending more.` }],
      isError: true
    };
  }
  // Add current timestamp
  rateLimitStore[userKey].push(now);
  const { logSensitiveAction } = require('../utils/sensitive-log');
  // Log attempt (before confirmation) with risk flag
  const { isSuspicious } = require('../utils/sanitize');
  require('../config').ensureConfigSafe();
  const { to, cc, bcc, subject, body, importance = 'normal', saveToSentItems = true, confirmationToken } = args;
  logSensitiveAction('sendEmail', args, 'unknown', [subject, to, cc, bcc].some(isSuspicious));
  const { SECURE_PROMPT_MODE } = require('../config');
  const { handleSecureConfirmation } = require('../utils/secure-confirmation');
  const sanitizeHtml = require('sanitize-html');
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (SECURE_PROMPT_MODE) {
    // Provide a more useful preview (strip scripts, allow up to 1000 chars, keep text/HTML sans tags)
    const previewBody = (body || '')
      .replace(/<script.*?>[\s\S]*?<\/script>/gi, '')
      .slice(0, 1000);
    const confirmationResult = await handleSecureConfirmation({
      actionType: 'send-email',
      fields: [to || '', subject || '', previewBody],
      safeFields: [to || '', subject || '', previewBody],
      confirmationToken,
      globalTokenStore: '__sendEmailTokens',
      promptText: `SECURE ACTION: Human confirmation required.\nAction: send-email\nTo: ${to}\nSubject: ${subject}\nBody length: ${(body || '').length} chars (preview shows first ${previewBody.length} chars)\nIf you approve, provide the confirmation token.`
    });
    // Block unless we have an explicit acceptance object
    if (!confirmationResult || confirmationResult.confirmationAccepted !== true) {
      return confirmationResult || {
        content: [{ type: 'text', text: 'Confirmation pending. Re-run with the provided token or actionId.' }],
        requiresConfirmation: true
      };
    }
    // Proceed after explicit confirmationAccepted === true
  }
  
  // Validate required parameters
  if (!to) {
    return {
      content: [{ type: 'text', text: 'Recipient (to) is required.' }]
    };
  }
  if (!subject) {
    return {
      content: [{ type: 'text', text: 'Subject is required.' }]
    };
  }
  if (!body) {
    return {
      content: [{ type: 'text', text: 'Body content is required.' }]
    };
  }
  // Validate email addresses
  const allEmails = [...(to ? to.split(',') : []), ...(cc ? cc.split(',') : []), ...(bcc ? bcc.split(',') : [])];
  for (const email of allEmails) {
    if (email.trim() && !emailRegex.test(email.trim())) {
      return {
        content: [{ type: 'text', text: `Invalid email address detected: ${email.trim()}` }]
      };
    }
  }
  
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
      type: 'text', 
      text: `Email sent successfully!\n\nSubject: ${subject}\nRecipients: ${toRecipients.length}${ccRecipients.length > 0 ? ` + ${ccRecipients.length} CC` : ''}${bccRecipients.length > 0 ? ` + ${bccRecipients.length} BCC` : ''}\nMessage Length: ${sanitizedBody.length} characters`
    }]
  };
}

module.exports = handleSendEmail;
