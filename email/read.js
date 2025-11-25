/**
 * Read email functionality
 */
const config = require('../config');
const { callGraphAPI, callGraphAPIPaginated } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { sanitizeEmail } = require('../utils/pii-sanitizer');
const logger = require('../utils/logger');
// (No folder utils needed yet; retain minimal imports)

// Cache for fuzzy ID matches (shortId -> fullId)
const fuzzyIdCache = new Map();

/**
 * Read email handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleReadEmail(args) {
  const emailId = args.id;
  if (!emailId) {
    return { content: [{ type: 'text', text: 'Email ID is required.' }] };
  }

  try {
    const accessToken = await ensureAuthenticated();
    const queryParams = { $select: config.EMAIL_DETAIL_FIELDS };
    const buildEndpoint = (id) => `me/messages/${encodeURIComponent(id)}`;

    // Attempt fetch with layered fallbacks
    let attemptedId = emailId;
    let email;
    let fallbackNote = '';

    const tryDirect = (id) => {
      logger.debug('ReadEmail: Direct attempt', { id });
      return callGraphAPI(accessToken, 'GET', buildEndpoint(id), null, queryParams);
    };

    const cached = fuzzyIdCache.get(emailId);
    if (cached) {
      attemptedId = cached;
      logger.info('ReadEmail: Using cached resolved ID', { original: emailId, cached });
    }

    try {
      email = await tryDirect(attemptedId);
    } catch (e) {
      const code = extractGraphErrorCode(e);
      logger.warn('ReadEmail: Direct attempt failed', { attemptedId, error: e.message, code });
      if (isMalformedIdError(code, e.message)) {
        // Padding correction path
        const core = attemptedId.replace(/=+$/, '');
        const base64ish = /^[A-Za-z0-9+/]+$/.test(core);
        const needsPadding = base64ish && (core.length % 4 !== 0);
        if (needsPadding) {
          const padded = core + '='.repeat((4 - (core.length % 4)) % 4);
          logger.info('ReadEmail: Attempting padding recovery', { original: attemptedId, padded });
          try {
            email = await tryDirect(padded);
            attemptedId = padded;
            fallbackNote = '(Recovered via padding correction)';
          } catch (padErr) {
            const padCode = extractGraphErrorCode(padErr);
            logger.warn('ReadEmail: Padding recovery failed', { padded, error: padErr.message, code: padCode });
            // Fuzzy reconstruction
            email = await attemptFuzzyReconstruction(emailId, accessToken);
            if (email && email._resolvedId) {
              fuzzyIdCache.set(emailId, email._resolvedId);
              attemptedId = email._resolvedId;
              fallbackNote = '(Recovered via fuzzy ID match)';
              logger.info('ReadEmail: Fuzzy reconstruction succeeded', { resolvedId: attemptedId });
            } else {
              logger.error('ReadEmail: Fuzzy reconstruction failed after padding recovery');
              throw padErr;
            }
          }
        } else {
          logger.info('ReadEmail: Attempting fuzzy reconstruction (no padding needed)', { attemptedId });
          email = await attemptFuzzyReconstruction(emailId, accessToken);
          if (email && email._resolvedId) {
            fuzzyIdCache.set(emailId, email._resolvedId);
            attemptedId = email._resolvedId;
            fallbackNote = '(Recovered via fuzzy ID match)';
            logger.info('ReadEmail: Fuzzy reconstruction succeeded', { resolvedId: attemptedId });
          } else {
            logger.error('ReadEmail: Fuzzy reconstruction failed');
            throw e;
          }
        }
      } else {
        throw e;
      }
    }

    if (!email) {
      return { content: [{ type: 'text', text: `Email with ID ${attemptedId} not found.` }] };
    }

    const sender = email.from ? `${email.from.emailAddress.name} (${email.from.emailAddress.address})` : 'Unknown';
    const to = email.toRecipients ? email.toRecipients.map(r => `${r.emailAddress.name} (${r.emailAddress.address})`).join(', ') : 'None';
    const cc = email.ccRecipients && email.ccRecipients.length > 0 ? email.ccRecipients.map(r => `${r.emailAddress.name} (${r.emailAddress.address})`).join(', ') : 'None';
    const bcc = email.bccRecipients && email.bccRecipients.length > 0 ? email.bccRecipients.map(r => `${r.emailAddress.name} (${r.emailAddress.address})`).join(', ') : 'None';
    const date = new Date(email.receivedDateTime).toLocaleString();
    let body = '';
    if (email.body) {
      body = email.body.contentType === 'html' ? email.body.content.replace(/<[^>]*>/g, '') : email.body.content;
    } else {
      body = email.bodyPreview || 'No content';
    }

    const formattedEmail = `From: ${sender}
  To: ${to}
  ${cc !== 'None' ? `CC: ${cc}\n` : ''}${bcc !== 'None' ? `BCC: ${bcc}\n` : ''}Subject: ${email.subject}
  Date: ${date}
  Importance: ${email.importance || 'normal'}
  Has Attachments: ${email.hasAttachments ? 'Yes' : 'No'}
  ID Used: ${attemptedId} ${fallbackNote}

  ${body}`;

    return { content: [{ type: 'text', text: sanitizeEmail(formattedEmail) }] };
  } catch (error) {
    const code = extractGraphErrorCode(error);
    if (error.message === 'Authentication required') {
      return { content: [{ type: 'text', text: "Authentication required. Please use the 'authenticate' tool first." }] };
    }
    if (isMalformedIdError(code, error.message)) {
      return { content: [{ type: 'text', text: 'Failed to read email: The provided ID appears malformed. Attempted padding and fuzzy recovery but no match was found.' }], isError: true };
    }
    if (error.message.includes("doesn't belong to the targeted mailbox")) {
      return { content: [{ type: 'text', text: 'The email ID seems invalid or doesn\'t belong to your mailbox. Please try with a different email ID.' }] };
    }
    const logger = require('../utils/logger');
    logger.error('Failed to read email', { error: error.message, stack: error.stack });
    return { content: [{ type: 'text', text: 'An unexpected error occurred while reading the email.' }], isError: true };
  }
}

module.exports = handleReadEmail;

/**
 * Attempt fuzzy reconstruction of a malformed ID by listing recent messages and finding best prefix match.
 * @param {string} originalId
 * @param {string} accessToken
 * @param {object} queryParams
 * @returns {Promise<object|null>}
 */
async function attemptFuzzyReconstruction(originalId, accessToken) {
  try {
    // Fetch recent inbox messages (limit to 75 for breadth)
    const inboxPath = 'me/mailFolders/inbox/messages';
    const listResp = await callGraphAPIPaginated(accessToken, 'GET', inboxPath, {
      $top: 75,
      $orderby: 'receivedDateTime desc',
      $select: 'id,subject,receivedDateTime'
    }, 75);
    if (!listResp.value || listResp.value.length === 0) {
      return null;
    }

    const candidates = listResp.value.map(m => m.id).filter(Boolean);
    // Adjusted heuristic: remove earlier prefixSampleLen requirement; use dynamic threshold below.

    let best = null;
    for (const cid of candidates) {
      const commonLen = commonPrefixLength(originalId, cid);
      const compositeScore = /AAAAAAEMA/.test(cid) ? 12 : 0;
      const lengthPenalty = Math.abs(cid.length - originalId.length);
      const score = commonLen * 2 + compositeScore - lengthPenalty; // weight prefix more heavily
      if (!best || score > best.score) {
        best = { id: cid, score, commonLen };
      }
    }

    // Require meaningful prefix overlap
    if (!best || best.commonLen < Math.min(25, Math.floor(originalId.length * 0.5))) {
      return null;
    }

    // Try fetching with best candidate ID
    try {
      const email = await callGraphAPI(accessToken, 'GET', `me/messages/${encodeURIComponent(best.id)}`, null, { $select: config.EMAIL_DETAIL_FIELDS });
      if (email) {
        email._resolvedId = best.id;
      }
      return email;
    } catch (candidateErr) {
      return null;
    }
  } catch (err) {
    return null;
  }
}

function commonPrefixLength(a, b) {
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[i] === b[i]) i++;
  return i;
}

function extractGraphErrorCode(err) {
  if (!err || !err.message) return null;
  const match = err.message.match(/"code"\s*:\s*"([A-Za-z0-9_.]+)"/);
  return match ? match[1] : null;
}

function isMalformedIdError(code, message) {
  return (code === 'ErrorInvalidIdMalformed') || (message && message.includes('ErrorInvalidIdMalformed'));
}
