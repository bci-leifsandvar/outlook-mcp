/**
 * Calendar module for Outlook MCP server
 * FIXED: Added confirmationToken parameter for secure actions
 */
const handleListEvents = require('./list');
const handleDeclineEvent = require('./decline');
const handleCreateEvent = require('./create');
const handleCancelEvent = require('./cancel');
const handleDeleteEvent = require('./delete');

// Calendar tool definitions
const calendarTools = [
  {
    name: 'list-events',
    description: 'Lists upcoming events from your calendar',
    requiredScopes: ['Calendars.Read'],
    inputSchema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of events to retrieve (default: 10, max: 50)'
        }
      },
      required: []
    },
    handler: handleListEvents
  },
  {
    name: 'decline-event',
    description: 'Declines a calendar event',
    requiredScopes: ['Calendars.ReadWrite'],
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to decline'
        },
        comment: {
          type: 'string',
          description: 'Optional comment for declining the event'
        },
        confirmationToken: {
          type: 'string',
          description: 'Security confirmation token (required when prompted). After receiving a confirmation prompt, include the token provided by the user.'
        }
      },
      required: ['eventId']
    },
    handler: handleDeclineEvent
  },
  {
    name: 'create-event',
    description: 'Creates a new calendar event. When secure mode is enabled, requires human confirmation.',
    requiredScopes: ['Calendars.ReadWrite'],
    inputSchema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'The subject of the event'
        },
        start: {
          type: 'string',
          description: 'The start time of the event in ISO 8601 format'
        },
        end: {
          type: 'string',
          description: 'The end time of the event in ISO 8601 format'
        },
        attendees: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'List of attendee email addresses'
        },
        body: {
          type: 'string',
          description: 'Optional body content for the event'
        },
        confirmationToken: {
          type: 'string',
          description: 'Security confirmation token (required when prompted). After receiving a confirmation prompt with a token, collect this token from the user and include it to complete the action.'
        }
      },
      required: ['subject', 'start', 'end']
    },
    handler: handleCreateEvent
  },
  {
    name: 'cancel-event',
    description: 'Cancels a calendar event. When secure mode is enabled, requires human confirmation.',
    requiredScopes: ['Calendars.ReadWrite'],
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to cancel'
        },
        comment: {
          type: 'string',
          description: 'Optional comment for cancelling the event'
        },
        confirmationToken: {
          type: 'string',
          description: 'Security confirmation token (required when prompted). After receiving a confirmation prompt with a token, collect this token from the user and include it to complete the action.'
        }
      },
      required: ['eventId']
    },
    handler: handleCancelEvent
  },
  {
    name: 'delete-event',
    description: 'Deletes a calendar event. When secure mode is enabled, requires human confirmation.',
    requiredScopes: ['Calendars.ReadWrite'],
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to delete'
        },
        confirmationToken: {
          type: 'string',
          description: 'Security confirmation token (required when prompted). After receiving a confirmation prompt with a token, collect this token from the user and include it to complete the action.'
        }
      },
      required: ['eventId']
    },
    handler: handleDeleteEvent
  }
];

module.exports = {
  calendarTools,
  handleListEvents,
  handleDeclineEvent,
  handleCreateEvent,
  handleCancelEvent,
  handleDeleteEvent
};