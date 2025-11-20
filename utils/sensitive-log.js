/**
 * Sensitive action logging and alerting utility
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { maskPIIinObject } = require('./sanitize');

const LOG_PATH = process.env.SENSITIVE_ACTION_LOG || path.join(os.homedir(), 'outlook-mcp-sensitive-actions.log');
const ALERT_THRESHOLD = 3; // Number of suspicious attempts before alert
const ALERT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// In-memory tracker for suspicious attempts
const suspiciousAttempts = {};


function logSensitiveAction(action, args, user = 'unknown', suspicious = false) {
  const maskedArgs = maskPIIinObject(args);
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    user,
    args: maskedArgs,
    suspicious
  };
  fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`);
  try {
    fs.chmodSync(LOG_PATH, 0o600);
  } catch (e) {
    // Ignore errors if file permissions can't be set
  }

  // Track and alert on repeated suspicious activity
  if (suspicious) {
    const key = `${user}:${action}`;
    const now = Date.now();
    if (!suspiciousAttempts[key]) suspiciousAttempts[key] = [];
    suspiciousAttempts[key].push(now);
    // Remove old attempts
    suspiciousAttempts[key] = suspiciousAttempts[key].filter(ts => now - ts < ALERT_WINDOW_MS);
    if (suspiciousAttempts[key].length >= ALERT_THRESHOLD) {
      // Alert: log a special entry
      fs.appendFileSync(LOG_PATH, `${JSON.stringify({
        timestamp: new Date().toISOString(),
        alert: true,
        message: `ALERT: ${suspiciousAttempts[key].length} suspicious attempts for action ${action} by user ${user} in last 10 minutes.`
      })}\n`);
      try {
        fs.chmodSync(LOG_PATH, 0o600);
      } catch (e) {
        // Ignore errors if file permissions can't be set
      }
      // Optionally, trigger external alerting here
    }
  }
}

module.exports = {
  logSensitiveAction
};
