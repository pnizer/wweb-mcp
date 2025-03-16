"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMcpServer = createMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const whatsapp_service_1 = require("./whatsapp-service");
const whatsapp_api_client_1 = require("./whatsapp-api-client");
/**
 * Creates an MCP server that exposes WhatsApp functionality through the Model Context Protocol
 * This allows AI models like Claude to interact with WhatsApp through a standardized interface
 *
 * @param mcpConfig Configuration for the MCP server
 * @returns The configured MCP server
 */
function createMcpServer(config = {}, client = null) {
    const server = new mcp_js_1.McpServer({
        name: 'WhatsApp-Web-MCP',
        version: '1.0.0',
        description: 'WhatsApp Web API exposed through Model Context Protocol',
    });
    let service;
    if (config.useApiClient) {
        if (!config.apiBaseUrl) {
            throw new Error('API base URL is required when useApiClient is true');
        }
        service = new whatsapp_api_client_1.WhatsAppApiClient(config.apiBaseUrl, config.apiKey || '');
    }
    else {
        if (!client) {
            throw new Error('WhatsApp client is required when useApiClient is false');
        }
        service = new whatsapp_service_1.WhatsAppService(client);
    }
    // Resource to list contacts
    server.resource('contacts', 'whatsapp://contacts', async (uri) => {
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
        }
        catch (error) {
            throw new Error(`Failed to fetch contacts: ${error}`);
        }
    });
    // Resource to get chat messages
    server.resource('messages', new mcp_js_1.ResourceTemplate('whatsapp://messages/{number}', { list: undefined }), async (uri, { number }) => {
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
        }
        catch (error) {
            throw new Error(`Failed to fetch messages: ${error}`);
        }
    });
    // Resource to get chat list
    server.resource('chats', 'whatsapp://chats', async (uri) => {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
    server.tool('search_contacts', {
        query: zod_1.z.string().describe('Search query to find contacts by name or number'),
    }, async ({ query }) => {
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
        }
        catch (error) {
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
    });
    // Tool to get messages from a specific chat
    server.tool('get_messages', {
        number: zod_1.z.string().describe('The phone number to get messages from'),
        limit: zod_1.z.number().optional().describe('The number of messages to get (default: 10)'),
    }, async ({ number, limit = 10 }) => {
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
        }
        catch (error) {
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
    });
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
        }
        catch (error) {
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
    server.tool('send_message', {
        number: zod_1.z.string().describe('The phone number to send the message to'),
        message: zod_1.z.string().describe('The message content to send'),
    }, async ({ number, message }) => {
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
        }
        catch (error) {
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
    });
    return server;
}
//# sourceMappingURL=mcp-server.js.map