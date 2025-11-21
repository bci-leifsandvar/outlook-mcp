const { maskPIIinObject } = require('./sanitize');

function baseLog(level, message, details = {}) {
  const masked = maskPIIinObject(details);
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...masked
  };
  // Use stderr for structured logs
  console.error(JSON.stringify(entry));
}

module.exports = {
  info: (m, d) => baseLog('info', m, d),
  debug: (m, d) => baseLog('debug', m, d),
  warn: (m, d) => baseLog('warn', m, d),
  error: (m, d) => baseLog('error', m, d),
  baseLog
};
