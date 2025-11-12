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
