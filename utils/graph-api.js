/**
 * Microsoft Graph API helper functions (native fetch refactor)
 */
const config = require('../config');
const logger = require('./logger');
const mockData = require('./mock-data');

/**
 * Makes a request to the Microsoft Graph API
 * @param {string} accessToken - The access token for authentication
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API endpoint path
 * @param {object} data - Data to send for POST/PUT requests
 * @param {object} queryParams - Query parameters
 * @returns {Promise<object>} - The API response
 */
function callGraphAPI(accessToken, method, path, data = null, queryParams = {}) {
  // Test mode simulation
  if (config.USE_TEST_MODE && accessToken.startsWith('test_access_token_')) {
    logger.debug('TEST MODE: Simulating API call', { method, path, data, queryParams });
    return mockData.simulateGraphAPIResponse(method, path, data, queryParams);
  }
  // Mock server routing (still builds full URL from GRAPH_API_ENDPOINT)
  if (config.USE_MOCK_GRAPH_API) {
    logger.debug('MOCK GRAPH API MODE: Routing API call', { method, path, endpoint: config.GRAPH_API_ENDPOINT });
  }

  logger.info('Making real API call', { method, path });

  // Build URL: absolute nextLink vs relative path
  const isAbsolute = /^https?:\/\//i.test(path);
  let finalUrl = isAbsolute ? path : `${config.GRAPH_API_ENDPOINT}${path}`;

  // Append query params if not already present (avoid mutating nextLink URLs)
  if (!finalUrl.includes('?') && Object.keys(queryParams).length > 0) {
    const urlObj = new URL(finalUrl);
    Object.entries(queryParams).forEach(([k, v]) => urlObj.searchParams.append(k, v));
    finalUrl = urlObj.toString();
  }
  logger.debug('Graph API full URL', { finalUrl });

  // Timeout control
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  return fetch(finalUrl, {
    method: method.toUpperCase(),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'IdType="ImmutableId"'
    },
    body: data && (method === 'POST' || method === 'PATCH' || method === 'PUT') ? JSON.stringify(data) : undefined,
    signal: controller.signal
  })
    .then(async res => {
      clearTimeout(timeout);
      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Error parsing API response: ${e.message}`);
      }
      if (res.ok) return json;
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      throw new Error(`API call failed with status ${res.status}: ${JSON.stringify(json)}`);
    })
    .catch(err => {
      if (err.name === 'AbortError') {
        throw new Error('Network timeout during API call');
      }
      throw new Error(`Network error during API call: ${err.message}`);
    });
}

/**
 * Calls Graph API with pagination support to retrieve all results up to maxCount
 * @param {string} accessToken - The access token for authentication
 * @param {string} method - HTTP method (GET only for pagination)
 * @param {string} path - API endpoint path
 * @param {object} queryParams - Initial query parameters
 * @param {number} maxCount - Maximum number of items to retrieve (0 = all)
 * @returns {Promise<object>} - Combined API response with all items
 */
async function callGraphAPIPaginated(accessToken, method, path, queryParams = {}, maxCount = 0) {
  if (method !== 'GET') {
    throw new Error('Pagination only supports GET requests');
  }

  const allItems = [];
  let nextLink = null;
  let currentUrl = path;
  let currentParams = queryParams;

  try {
    do {
      // Make API call
      const response = await callGraphAPI(accessToken, method, currentUrl, null, currentParams);
      
      // Add items from this page
      if (response.value && Array.isArray(response.value)) {
        allItems.push(...response.value);
        logger.info('Pagination: Retrieved items', { count: response.value.length, total: allItems.length });
      }

      // Check if we've reached the desired count
      if (maxCount > 0 && allItems.length >= maxCount) {
        logger.info('Pagination: Reached max count, stopping', { maxCount });
        break;
      }

      // Get next page URL
      nextLink = response['@odata.nextLink'];
      
      if (nextLink) {
        // Pass the full nextLink URL directly to callGraphAPI
        currentUrl = nextLink;
        currentParams = {}; // nextLink already contains all params
        logger.debug('Pagination: Following nextLink', { total: allItems.length });
      }
    } while (nextLink);

    // Trim to exact count if needed
    const finalItems = maxCount > 0 ? allItems.slice(0, maxCount) : allItems;

    logger.info('Pagination complete', { total: finalItems.length });
    return {
      value: finalItems,
      '@odata.count': finalItems.length
    };
  } catch (error) {
    logger.error('Error during pagination', { error: error.stack });
    throw error;
  }
}

module.exports = {
  callGraphAPI,
  callGraphAPIPaginated
};
