const path = require('path');

/**
 * @typedef {object} LogConfig
 * @property {string} logFile - Absolute path to the log file.
 * @property {'error' | 'warn' | 'info' | 'debug'} logLevel - The level of logs to capture.
 * @property {number} retentionDays - How many days to keep log files.
 * @property {string|null} siemEndpoint - Placeholder for future SIEM integration endpoint.
 */

/** @type {LogConfig} */
const logConfig = {
  // Store logs in a /logs directory in the project root
  logFile: path.join(process.cwd(), 'logs', 'app.log'),

  // Log level can be controlled by environment variable
  logLevel: process.env.LOG_LEVEL || 'info',

  // Per NIST AU-11 and ISO A.8.15 recommendations from the audit
  retentionDays: 90,

  // Placeholder for future SIEM integration (P0 gap)
  siemEndpoint: process.env.SIEM_ENDPOINT || null,
};

module.exports = logConfig;
