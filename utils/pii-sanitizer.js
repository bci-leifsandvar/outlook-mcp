/**
 * PII (Personally Identifiable Information) Sanitizer
 *
 * This utility provides functions to redact sensitive information like email addresses
 * from text, ensuring that no PII is leaked into logs or client-side displays
 * where it is not explicitly required.
 */

/**
 * Redacts email addresses from a given string.
 *
 * This function uses a regular expression to find patterns that look like email
 * addresses and replaces them with a '[REDACTED EMAIL]' placeholder. It is
 * designed to be conservative to avoid accidentally redacting non-email data.
 *
 * @param {string} text The input string to sanitize.
 * @returns {string} The sanitized string with email addresses redacted.
 */
function sanitizeEmail(text) {
  if (typeof text !== 'string') {
    return text;
  }
  // This regex looks for patterns like 'name@domain.com' or 'Display Name <name@domain.com>'
  // and replaces the email part.
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  return text.replace(emailRegex, '[REDACTED EMAIL]');
}

module.exports = {
  sanitizeEmail
};
