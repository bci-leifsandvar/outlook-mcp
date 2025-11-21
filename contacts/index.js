const handleListContacts = require('./list');
const handleCreateContact = require('./create');
const handleUpdateContact = require('./update');
const handleDeleteContact = require('./delete');

const contactsTools = [
  {
    name: 'list-contacts',
    description: 'List contacts with basic fields.',
    inputSchema: { type: 'object', properties: { top: { type: 'number', minimum: 1, maximum: 100 } } },
    handler: handleListContacts
  },
  {
    name: 'create-contact',
    description: 'Create a new contact. Requires Contacts.ReadWrite.',
    inputSchema: {
      type: 'object',
      properties: {
        displayName: { type: 'string' },
        email: { type: 'string' },
        companyName: { type: 'string' },
        mobilePhone: { type: 'string' },
        businessPhone: { type: 'string' },
        confirmationToken: { type: 'string' }
      },
      required: ['displayName', 'email']
    },
    handler: handleCreateContact
  },
  {
    name: 'update-contact',
    description: 'Update an existing contact by id. Requires Contacts.ReadWrite.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        displayName: { type: 'string' },
        email: { type: 'string' },
        companyName: { type: 'string' },
        mobilePhone: { type: 'string' },
        businessPhone: { type: 'string' },
        confirmationToken: { type: 'string' }
      },
      required: ['id']
    },
    handler: handleUpdateContact
  },
  {
    name: 'delete-contact',
    description: 'Delete a contact by id. Requires Contacts.ReadWrite.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        confirmationToken: { type: 'string' }
      },
      required: ['id']
    },
    handler: handleDeleteContact
  }
];

module.exports = { contactsTools };
