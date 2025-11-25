const sanitizeHtml = require('sanitize-html');

const SAFE_WORDS = new Set(['Test', 'Email', 'Please', 'Ignore', 'Simulated', 'Sender', 'Recipient', 'Name', 'Subject', 'Contact', 'My', 'Hello', 'This', 'The']);

// Mask email addresses and simple PII patterns
function maskPII(input) {
  if (typeof input !== 'string') return input;

  // Mask email addresses first
  let masked = input.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');

  // Mask phone numbers (North American format)
  masked = masked.replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone]');

  // Process word by word for potential names
  const words = masked.split(' ');
  const processedWords = words.map(word => {
    // Strip punctuation for safe word checking
    const cleanWord = word.replace(/[.,!?;:]$/, '');
    if (/^[A-Z]/.test(cleanWord) && !SAFE_WORDS.has(cleanWord)) {
      return word.replace(cleanWord, '[name]');
    }
    return word;
  });
  
  masked = processedWords.join(' ');

  // Collapse consecutive [name] tags
  masked = masked.replace(/(\[name\]\s+)+\[name\]/g, '[name]');

  return masked;
}

function maskPIIinObject(obj) {
  if (typeof obj === 'string') return maskPII(obj);
  if (Array.isArray(obj)) return obj.map(maskPIIinObject);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k in obj) {
      if (k === 'subject') {
        out[k] = '[meeting subject]';
      } else {
        out[k] = maskPIIinObject(obj[k]);
      }
    }
    return out;
  }
  return obj;
}

/**
 * Input sanitization and escaping utilities for prompt injection defense
 */

const SUSPICIOUS_PATTERNS = [
  /\buser:/i,
  /\bassistant:/i,
  /```/g,
  /\n\s*\n/g, // double newlines
  /###/g,
  /<script.*?>/gi,
  /<\/script>/gi
];

function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  const truncated = input.slice(0, maxLength);
  const sanitized = sanitizeHtml(truncated, {
    allowedTags: [],
    allowedAttributes: {}
  });
  return sanitized;
}

function isSuspicious(input) {
  if (typeof input !== 'string') return false;
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Recursively sanitizes an object for logging by redacting sensitive keys.
 * This prevents leaking sensitive data like email bodies into logs.
 * @param {any} data - The data to sanitize.
 * @returns {any} - The sanitized data.
 */
function sanitizeObjectForLogging(data) {
  if (typeof data !== 'object' || data === null) {
    // For log injection, we also want to sanitize strings at this stage.
    if (typeof data === 'string') {
      return data.replace(/[\r\n]/g, ' ');
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeObjectForLogging);
  }

  const sanitized = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // Redact keys that are known to contain large, sensitive content
      if (key === 'body' || key === 'bodyPreview') {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObjectForLogging(data[key]);
      }
    }
  }
  return sanitized;
}

module.exports = {
  maskPII,
  maskPIIinObject,
  sanitizeObjectForLogging,
  sanitizeText,
  isSuspicious
};
