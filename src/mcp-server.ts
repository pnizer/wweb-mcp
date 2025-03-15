import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Client, Contact, Message } from 'whatsapp-web.js';
import { createWhatsAppClient } from "./whatsapp-client";

// Configuration interface
export interface McpConfig {
  qrCodeFile?: string;
  eagerlyInitializeClient?: boolean;
}

let clientPromise: Promise<Client>;
let config: McpConfig = {};

// Export the getClient function so it can be used in the API
export async function getClient() {
  if (!clientPromise) {  
    clientPromise = new Promise<Client>((resolve, reject) => {
      const client = createWhatsAppClient({qrCodeFile: config.qrCodeFile});
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
export function createMcpServer(mcpConfig: McpConfig = {}) {
  // Store the configuration
  config = mcpConfig;
  
  // Initialize client eagerly if specified
  if (config.eagerlyInitializeClient) {
    getClient();
  }
  
  const server = new McpServer({
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
  server.resource(
    "contacts",
    "whatsapp://contacts",
    async (uri) => {
      ensureClientReady();
      
      try {
        const contacts = await (await getClient()).getContacts();
        
        const filteredContacts = contacts.filter((contact: Contact) => 
          contact.isUser && 
          contact.id.server === 'c.us' && 
          !contact.isMe
        );

        const formattedContacts = filteredContacts.map((contact: Contact) => ({
          name: contact.pushname || "Unknown",
          number: contact.number,
        }));

        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(formattedContacts, null, 2)
          }]
        };
      } catch (error) {
        throw new Error(`Failed to fetch contacts: ${error}`);
      }
    }
  );

  // Resource to get chat messages
  server.resource(
    "messages",
    new ResourceTemplate("whatsapp://messages/{number}", { list: undefined }),
    async (uri, { number }) => {
      ensureClientReady();
      
      try {
        const sanitized_number = number.toString().replace(/[- )(]/g, "");
        const number_details = await (await getClient()).getNumberId(sanitized_number);

        if (!number_details) {
          throw new Error('Mobile number is not registered on WhatsApp');
        }

        const chat = await (await getClient()).getChatById(number_details._serialized);
        const messages = await chat.fetchMessages({ limit: 10 });

        const formattedMessages = messages.map((message: Message) => ({
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
      } catch (error) {
        throw new Error(`Failed to fetch messages: ${error}`);
      }
    }
  );

  // Resource to get chat list
  server.resource(
    "chats",
    "whatsapp://chats",
    async (uri) => {
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
      } catch (error) {
        throw new Error(`Failed to fetch chats: ${error}`);
      }
    }
  );

  // Tool to send a message
  server.tool(
    "send_message",
    {
      number: z.string().describe("The phone number to send the message to"),
      message: z.string().describe("The message content to send")
    },
    async ({ number, message }) => {
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
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error sending message: ${error}` 
          }],
          isError: true
        };
      }
    }
  );

  return server;
}