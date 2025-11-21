const handleGetMailboxSettings = require('./get-settings');
const handleSetAutoReply = require('./set-auto-reply');

const mailboxTools = [
  {
    name: 'get-mailbox-settings',
    description: 'Retrieve mailbox settings including time zone and auto-reply configuration.',
    inputSchema: { type: 'object', properties: {} },
    handler: handleGetMailboxSettings
  },
  {
    name: 'set-auto-reply',
    description: 'Configure mailbox automatic replies (out-of-office). Requires MailboxSettings.ReadWrite.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['disabled', 'alwaysEnabled', 'scheduled'], default: 'scheduled' },
        internalMessage: { type: 'string' },
        externalMessage: { type: 'string' },
        externalAudience: { type: 'string', enum: ['none', 'contactsOnly', 'all'], default: 'contactsOnly' },
        startDateTime: { type: 'string', description: 'ISO datetime if status=scheduled' },
        endDateTime: { type: 'string', description: 'ISO datetime if status=scheduled' },
        confirmationToken: { type: 'string', description: 'Secure confirmation token when prompted' }
      },
      required: ['status']
    },
    handler: handleSetAutoReply
  }
];

module.exports = { mailboxTools };
