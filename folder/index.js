/**
 * Folder management module for Outlook MCP server
 * FIXED: Added confirmationToken parameter for secure actions
 */
const handleListFolders = require('./list');
const handleCreateFolder = require('./create');
const handleMoveEmails = require('./move');

// Folder management tool definitions
const folderTools = [
  {
    name: 'list-folders',
    description: 'Lists mail folders in your Outlook account',
    requiredScopes: ['Mail.Read'],
    inputSchema: {
      type: 'object',
      properties: {
        includeItemCounts: {
          type: 'boolean',
          description: 'Include counts of total and unread items'
        },
        includeChildren: {
          type: 'boolean',
          description: 'Include child folders in hierarchy'
        }
      },
      required: []
    },
    handler: handleListFolders
  },
  {
    name: 'create-folder',
    description: 'Creates a new mail folder. When secure mode is enabled, requires human confirmation.',
    requiredScopes: ['Mail.ReadWrite'],
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the folder to create'
        },
        parentFolder: {
          type: 'string',
          description: 'Optional parent folder name (default is root)'
        },
        confirmationToken: {
          type: 'string',
          description: 'Security confirmation token (required when prompted). After receiving a confirmation prompt with a token, collect this token from the user and include it to complete the action.'
        }
      },
      required: ['name']
    },
    handler: handleCreateFolder
  },
  {
    name: 'move-emails',
    description: 'Moves emails from one folder to another. When secure mode is enabled, requires human confirmation.',
    requiredScopes: ['Mail.ReadWrite'],
    inputSchema: {
      type: 'object',
      properties: {
        emailIds: {
          type: 'string',
          description: 'Comma-separated list of email IDs to move'
        },
        targetFolder: {
          type: 'string',
          description: 'Name of the folder to move emails to'
        },
        sourceFolder: {
          type: 'string',
          description: 'Optional name of the source folder (default is inbox)'
        },
        confirmationToken: {
          type: 'string',
          description: 'Security confirmation token (required when prompted). After receiving a confirmation prompt with a token, collect this token from the user and include it to complete the action.'
        }
      },
      required: ['emailIds', 'targetFolder']
    },
    handler: handleMoveEmails
  }
];

module.exports = {
  folderTools,
  handleListFolders,
  handleCreateFolder,
  handleMoveEmails
};