const sanitizeHtml = require('sanitize-html');

// Mask email addresses and simple PII patterns
function maskPII(input) {
  if (typeof input !== 'string') return input;
  // Mask email addresses
  let masked = input.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  // Mask common name formats (e.g., John Doe, John, Doe)
  masked = masked.replace(/\b([A-Z][a-z]+(\s[A-Z][a-z]+)?)\b/g, '[name]');
  // Mask phone numbers (North American format)
  masked = masked.replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone]');
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

module.exports = {
  maskPII,
  maskPIIinObject,
  sanitizeText,
  isSuspicious
};
