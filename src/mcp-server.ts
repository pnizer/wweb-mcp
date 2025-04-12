import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WhatsAppService } from './whatsapp-service';
import { WhatsAppApiClient } from './whatsapp-api-client';
import { WhatsAppConfig } from './whatsapp-client';
import { Client } from 'whatsapp-web.js';

// Configuration interface
export interface McpConfig {
  useApiClient?: boolean;
  apiBaseUrl?: string;
  apiKey?: string;
  whatsappConfig?: WhatsAppConfig;
}

/**
 * Creates an MCP server that exposes WhatsApp functionality through the Model Context Protocol
 * This allows AI models like Claude to interact with WhatsApp through a standardized interface
 *
 * @param mcpConfig Configuration for the MCP server
 * @returns The configured MCP server
 */
export function createMcpServer(config: McpConfig = {}, client: Client | null = null): McpServer {
  const server = new McpServer({
    name: 'WhatsApp-Web-MCP',
    version: '1.0.0',
    description: 'WhatsApp Web API exposed through Model Context Protocol',
  });

  let service: WhatsAppApiClient | WhatsAppService;

  if (config.useApiClient) {
    if (!config.apiBaseUrl) {
      throw new Error('API base URL is required when useApiClient is true');
    }
    service = new WhatsAppApiClient(config.apiBaseUrl, config.apiKey || '');
  } else {
    if (!client) {
      throw new Error('WhatsApp client is required when useApiClient is false');
    }
    service = new WhatsAppService(client);
  }

  // Resource to list contacts
  server.resource('contacts', 'whatsapp://contacts', async uri => {
    try {
      const contacts = await service.getContacts();

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(contacts, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch contacts: ${error}`);
    }
  });

  // Resource to get chat messages
  server.resource(
    'messages',
    new ResourceTemplate('whatsapp://messages/{number}', { list: undefined }),
    async (uri, { number }) => {
      try {
        // Ensure number is a string
        const phoneNumber = Array.isArray(number) ? number[0] : number;
        const messages = await service.getMessages(phoneNumber, 10);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(messages, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to fetch messages: ${error}`);
      }
    },
  );

  // Resource to get chat list
  server.resource('chats', 'whatsapp://chats', async uri => {
    try {
      const chats = await service.getChats();

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(chats, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${error}`);
    }
  });

  // Tool to get WhatsApp connection status
  server.tool('get_status', {}, async () => {
    try {
      const status = await service.getStatus();

      return {
        content: [
          {
            type: 'text',
            text: `WhatsApp connection status: ${status.status}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting status: ${error}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Tool to search contacts
  server.tool(
    'search_contacts',
    {
      query: z.string().describe('Search query to find contacts by name or number'),
    },
    async ({ query }) => {
      try {
        const contacts = await service.searchContacts(query);

        return {
          content: [
            {
              type: 'text',
              text: `Found ${contacts.length} contacts matching "${query}":\n${JSON.stringify(contacts, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching contacts: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to get messages from a specific chat
  server.tool(
    'get_messages',
    {
      number: z.string().describe('The phone number to get messages from'),
      limit: z.number().describe('The number of messages to get (default: 10)'),
    },
    async ({ number, limit = 10 }) => {
      try {
        const messages = await service.getMessages(number, limit);

        return {
          content: [
            {
              type: 'text',
              text: `Retrieved ${messages.length} messages from ${number}:\n${JSON.stringify(messages, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting messages: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to get all chats
  server.tool('get_chats', {}, async () => {
    try {
      const chats = await service.getChats();

      return {
        content: [
          {
            type: 'text',
            text: `Retrieved ${chats.length} chats:\n${JSON.stringify(chats, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting chats: ${error}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Tool to send a message
  server.tool(
    'send_message',
    {
      number: z.string().describe('The phone number to send the message to'),
      message: z.string().describe('The message content to send'),
    },
    async ({ number, message }) => {
      try {
        const result = await service.sendMessage(number, message);

        return {
          content: [
            {
              type: 'text',
              text: `Message sent successfully to ${number}. Message ID: ${result.messageId}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending message: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Resource to list groups
  server.resource('groups', 'whatsapp://groups', async uri => {
    try {
      const groups = await service.getGroups();

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(groups, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch groups: ${error}`);
    }
  });

  // Resource to search groups
  server.resource(
    'search_groups',
    new ResourceTemplate('whatsapp://groups/search', { list: undefined }),
    async (uri, _params) => {
      try {
        // Extract query parameter from URL search params
        const queryString = uri.searchParams.get('query') || '';
        const groups = await service.searchGroups(queryString);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(groups, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to search groups: ${error}`);
      }
    },
  );

  // Resource to get group messages
  server.resource(
    'group_messages',
    new ResourceTemplate('whatsapp://groups/{groupId}/messages', { list: undefined }),
    async (uri, { groupId }) => {
      try {
        // Ensure groupId is a string
        const groupIdString = Array.isArray(groupId) ? groupId[0] : groupId;
        const messages = await service.getGroupMessages(groupIdString, 10);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(messages, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to fetch group messages: ${error}`);
      }
    },
  );

  // Tool to create a group
  server.tool(
    'create_group',
    {
      name: z.string().describe('The name of the group to create'),
      participants: z.array(z.string()).describe('Array of phone numbers to add to the group'),
    },
    async ({ name, participants }) => {
      try {
        const result = await service.createGroup(name, participants);

        return {
          content: [
            {
              type: 'text',
              text: `Group created successfully. Group ID: ${result.groupId}${
                result.inviteCode ? `\nInvite code: ${result.inviteCode}` : ''
              }`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating group: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to add participants to a group
  server.tool(
    'add_participants_to_group',
    {
      groupId: z.string().describe('The ID of the group to add participants to'),
      participants: z.array(z.string()).describe('Array of phone numbers to add to the group'),
    },
    async ({ groupId, participants }) => {
      try {
        const result = await service.addParticipantsToGroup(groupId, participants);

        return {
          content: [
            {
              type: 'text',
              text: `Added ${result.added.length} participants to group ${groupId}${
                result.failed && result.failed.length > 0
                  ? `\nFailed to add ${result.failed.length} participants: ${JSON.stringify(
                      result.failed,
                    )}`
                  : ''
              }`,
            },
          ],
        };
      } catch (error) {
        const errorMsg = String(error);

        if (errorMsg.includes('not supported in the current version')) {
          return {
            content: [
              {
                type: 'text',
                text: 'Adding participants to groups is not supported with the current WhatsApp API configuration. This feature requires a newer version of whatsapp-web.js that has native support for adding participants.',
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Error adding participants to group: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to get group messages
  server.tool(
    'get_group_messages',
    {
      groupId: z.string().describe('The ID of the group to get messages from'),
      limit: z.number().describe('The number of messages to get (default: 10)'),
    },
    async ({ groupId, limit = 10 }) => {
      try {
        const messages = await service.getGroupMessages(groupId, limit);

        return {
          content: [
            {
              type: 'text',
              text: `Retrieved ${messages.length} messages from group ${groupId}:\n${JSON.stringify(
                messages,
                null,
                2,
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting group messages: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to send a message to a group
  server.tool(
    'send_group_message',
    {
      groupId: z.string().describe('The ID of the group to send the message to'),
      message: z.string().describe('The message content to send'),
    },
    async ({ groupId, message }) => {
      try {
        const result = await service.sendGroupMessage(groupId, message);

        return {
          content: [
            {
              type: 'text',
              text: `Message sent successfully to group ${groupId}. Message ID: ${result.messageId}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending message to group: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to search groups
  server.tool(
    'search_groups',
    {
      query: z
        .string()
        .describe('Search query to find groups by name, description, or member names'),
    },
    async ({ query }) => {
      try {
        const groups = await service.searchGroups(query);

        let noticeMsg = '';
        if (!config.useApiClient) {
          noticeMsg =
            '\n\nNote: Some group details like descriptions or complete participant lists may be limited due to API restrictions.';
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${groups.length} groups matching "${query}":\n${JSON.stringify(
                groups,
                null,
                2,
              )}${noticeMsg}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching groups: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to get group by ID
  server.tool(
    'get_group_by_id',
    {
      groupId: z.string().describe('The ID of the group to get'),
    },
    async ({ groupId }) => {
      try {
        const group = await service.getGroupById(groupId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(group, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting group by ID: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to download media from a message
  server.tool(
    'download_media_from_message',
    {
      messageId: z.string().describe('The ID of the message containing the media'),
    },
    async ({ messageId }) => {
      try {
        // Get the media storage path from the configuration
        const mediaStoragePath = config.whatsappConfig?.mediaStoragePath || '.wwebjs_auth/media';

        // Download the media
        const mediaInfo = await service.downloadMediaFromMessage(messageId, mediaStoragePath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mediaInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error downloading media: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool to send a media message
  server.tool(
    'send_media_message',
    {
      number: z.string().describe('The phone number to send the message to'),
      source: z.string().describe('The source of the media - URLs must use http:// or https:// prefixes, local files must use file:// prefix'),
      caption: z.string().default('').describe('Caption for the media'),
    },
    async ({ number, source, caption }) => {
      try {
        const result = await service.sendMediaMessage({
          number,
          source,
          caption,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Media message sent successfully to ${number}.\nMessage ID: ${result.messageId}\nMedia Info:\n${JSON.stringify(result.mediaInfo, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending media message: ${error}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
