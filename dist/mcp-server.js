"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.createMcpServer = createMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const whatsapp_client_1 = require("./whatsapp-client");
let clientPromise;
let config = {};
// Export the getClient function so it can be used in the API
async function getClient() {
    if (!clientPromise) {
        clientPromise = new Promise((resolve, reject) => {
            const client = (0, whatsapp_client_1.createWhatsAppClient)({ qrCodeFile: config.qrCodeFile });
            // Initialize WhatsApp client
            console.error('Initializing WhatsApp client...');
            client.initialize().then(() => resolve(client)).catch(reject);
        });
    }
    return await clientPromise;
}
/**
 * Creates an MCP server that exposes WhatsApp functionality through the Model Context Protocol
 * This allows AI models like Claude to interact with WhatsApp through a standardized interface
 *
 * @param mcpConfig Configuration for the MCP server
 * @returns The configured MCP server
 */
function createMcpServer(mcpConfig = {}) {
    // Store the configuration
    config = mcpConfig;
    // Initialize client eagerly if specified
    if (config.eagerlyInitializeClient) {
        getClient();
    }
    const server = new mcp_js_1.McpServer({
        name: "WhatsApp-Web-MCP",
        version: "1.0.0",
        description: "WhatsApp Web API exposed through Model Context Protocol"
    });
    // Check if client is ready
    const ensureClientReady = async () => {
        if (!(await getClient()).info) {
            throw new Error("WhatsApp client not ready. Please try again later.");
        }
    };
    // Resource to list contacts
    server.resource("contacts", "whatsapp://contacts", async (uri) => {
        ensureClientReady();
        try {
            const contacts = await (await getClient()).getContacts();
            const filteredContacts = contacts.filter((contact) => contact.isUser &&
                contact.id.server === 'c.us' &&
                !contact.isMe);
            const formattedContacts = filteredContacts.map((contact) => ({
                name: contact.pushname || "Unknown",
                number: contact.number,
            }));
            return {
                contents: [{
                        uri: uri.href,
                        text: JSON.stringify(formattedContacts, null, 2)
                    }]
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch contacts: ${error}`);
        }
    });
    // Resource to get chat messages
    server.resource("messages", new mcp_js_1.ResourceTemplate("whatsapp://messages/{number}", { list: undefined }), async (uri, { number }) => {
        ensureClientReady();
        try {
            const sanitized_number = number.toString().replace(/[- )(]/g, "");
            const number_details = await (await getClient()).getNumberId(sanitized_number);
            if (!number_details) {
                throw new Error('Mobile number is not registered on WhatsApp');
            }
            const chat = await (await getClient()).getChatById(number_details._serialized);
            const messages = await chat.fetchMessages({ limit: 10 });
            const formattedMessages = messages.map((message) => ({
                id: message.id.id,
                body: message.body,
                fromMe: message.fromMe,
                timestamp: message.timestamp,
                type: message.type
            }));
            return {
                contents: [{
                        uri: uri.href,
                        text: JSON.stringify(formattedMessages, null, 2)
                    }]
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch messages: ${error}`);
        }
    });
    // Resource to get chat list
    server.resource("chats", "whatsapp://chats", async (uri) => {
        ensureClientReady();
        try {
            const chats = await (await getClient()).getChats();
            const formattedChats = chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp,
                pinned: chat.pinned
            }));
            return {
                contents: [{
                        uri: uri.href,
                        text: JSON.stringify(formattedChats, null, 2)
                    }]
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch chats: ${error}`);
        }
    });
    // Tool to send a message
    server.tool("send_message", {
        number: zod_1.z.string().describe("The phone number to send the message to"),
        message: zod_1.z.string().describe("The message content to send")
    }, async ({ number, message }) => {
        ensureClientReady();
        try {
            const sanitized_number = number.toString().replace(/[- )(]/g, "");
            const number_details = await (await getClient()).getNumberId(sanitized_number);
            if (!number_details) {
                return {
                    content: [{
                            type: "text",
                            text: `Error: Mobile number ${number} is not registered on WhatsApp`
                        }],
                    isError: true
                };
            }
            const sendMessageData = await (await getClient()).sendMessage(number_details._serialized, message);
            return {
                content: [{
                        type: "text",
                        text: `Message sent successfully to ${number}. Message ID: ${sendMessageData.id.id}`
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: `Error sending message: ${error}`
                    }],
                isError: true
            };
        }
    });
    return server;
}
//# sourceMappingURL=mcp-server.js.map