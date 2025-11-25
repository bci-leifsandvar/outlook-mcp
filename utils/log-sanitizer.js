/**
 * Sanitizes objects for logging by removing or redacting sensitive fields.
 */

/**
 * Recursively sanitizes an object by removing sensitive keys.
 * @param {any} data - The data to sanitize.
 * @returns {any} - The sanitized data.
 */
function sanitizeForLogging(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForLogging);
  }

  const sanitized = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (key === 'body' || key === 'bodyPreview') {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(data[key]);
      }
    }
  }
  return sanitized;
}

module.exports = {
  sanitizeForLogging
};
