// Mask email addresses and simple PII patterns
function maskPII(input) {
  if (typeof input !== 'string') return input;
  // Mask email addresses
  let masked = input.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  // Mask simple names (e.g., John Doe)
  masked = masked.replace(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g, '[name]');
  return masked;
}

function maskPIIinObject(obj) {
  if (typeof obj === 'string') return maskPII(obj);
  if (Array.isArray(obj)) return obj.map(maskPIIinObject);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k in obj) out[k] = maskPIIinObject(obj[k]);
    return out;
  }
  return obj;
}

module.exports.maskPII = maskPII;
module.exports.maskPIIinObject = maskPIIinObject;
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
  let sanitized = input.slice(0, maxLength);
  // Remove suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[filtered]');
  }
  // Escape angle brackets
  sanitized = sanitized.replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');
  return sanitized;
}

function isSuspicious(input) {
  if (typeof input !== 'string') return false;
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
}

module.exports = {
  sanitizeText,
  isSuspicious
};
