const fs = require('fs');
const path = require('path');
const { maskPIIinObject, sanitizeObjectForLogging } = require('./sanitize');
const logConfig = require('../log-config');

// Ensure the log directory exists
const logDir = path.dirname(logConfig.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Simple log rotation (daily)
const getLogStream = () => {
  const today = new Date().toISOString().split('T')[0];
  const currentLogFile = `${logConfig.logFile}.${today}`;
  return fs.createWriteStream(currentLogFile, { flags: 'a' });
};

// Placeholder for SIEM integration
const shipToSIEM = (logEntry) => {
  if (logConfig.siemEndpoint) {
    // In a real implementation, this would be an HTTP POST to the SIEM endpoint
    // For now, we'll just log that we would have sent it.
    console.log(`[SIEM_SHIP_PLACEHOLDER] Would send to ${logConfig.siemEndpoint}: ${logEntry}`);
  }
};

function baseLog(level, message, details = {}) {
  const sanitizedDetails = sanitizeObjectForLogging(details);
  const masked = maskPIIinObject(sanitizedDetails);
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...masked
  };

  const logString = JSON.stringify(entry);

  // Write to file
  const stream = getLogStream();
  stream.write(logString + '\n');
  stream.end();

  // Also write to stderr for MCP compliance and real-time viewing
  console.error(logString);

  // Ship to SIEM if configured
  shipToSIEM(logString);
}

// --- Log Retention ---
// Deletes log files older than the configured retention period.
const cleanupOldLogs = () => {
  fs.readdir(logDir, (err, files) => {
    if (err) {
      console.error(JSON.stringify({ level: 'error', message: 'Failed to read log directory for cleanup', error: err.message }));
      return;
    }

    const now = new Date();
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const fileDateMatch = file.match(/\.(\d{4}-\d{2}-\d{2})$/);
      if (!fileDateMatch) return;

      const fileDate = new Date(fileDateMatch[1]);
      const ageInDays = (now - fileDate) / (1000 * 60 * 60 * 24);

      if (ageInDays > logConfig.retentionDays) {
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(JSON.stringify({ level: 'error', message: 'Failed to delete old log file', file: filePath, error: unlinkErr.message }));
          } else {
            console.error(JSON.stringify({ level: 'info', message: 'Deleted old log file', file: filePath }));
          }
        });
      }
    });
  });
};

// Run cleanup once on startup and then every 24 hours
cleanupOldLogs();
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
  info: (m, d) => baseLog('info', m, d),
  debug: (m, d) => baseLog('debug', m, d),
  warn: (m, d) => baseLog('warn', m, d),
  error: (m, d) => baseLog('error', m, d),
  baseLog
};
