const https = require('https');
const config = require('../config');
const logger = require('../utils/logger');

function shipToSIEM(logData) {
  const { SIEM_ENDPOINT, SIEM_API_KEY } = config;

  if (!SIEM_ENDPOINT) {
    return; // SIEM integration is not configured
  }

  const postData = JSON.stringify(logData);

  const options = {
    hostname: new URL(SIEM_ENDPOINT).hostname,
    path: new URL(SIEM_ENDPOINT).pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${SIEM_API_KEY}`
    }
  };

  const req = https.request(options, (res) => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      logger.error('Error shipping log to SIEM', { statusCode: res.statusCode });
    }
  });

  req.on('error', (e) => {
    logger.error('Error shipping log to SIEM', { error: e.message });
  });

  req.write(postData);
  req.end();
}

module.exports = { shipToSIEM };
