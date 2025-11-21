const { ensureAuthenticated } = require('../auth');
const { callGraphAPI } = require('../utils/graph-api');

async function handleListContacts(args = {}) {
  const { top = 20 } = args;
  try {
    const accessToken = await ensureAuthenticated();
    const data = await callGraphAPI(accessToken, 'GET', `me/contacts`, null, { $top: top, $select: 'id,displayName,emailAddresses,companyName' });
    const contacts = data.value || [];
    if (contacts.length === 0) {
      return { content: [{ type: 'text', text: 'No contacts found.' }] };
    }
    const lines = contacts.map(c => `• ${c.displayName || 'Unnamed'} (${(c.emailAddresses && c.emailAddresses[0] && c.emailAddresses[0].address) || 'no-email'})`);
    return { content: [{ type: 'text', text: `Found ${contacts.length} contacts:\n${lines.join('\n')}` }] };
  } catch (e) {
    if (e.message === 'Authentication required') {
      return { content: [{ type: 'text', text: "Authentication required. Please use the 'authenticate' tool first." }], isError: true };
    }
    return { content: [{ type: 'text', text: `Error listing contacts: ${e.message}` }], isError: true };
  }
}

module.exports = handleListContacts;
