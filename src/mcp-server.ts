import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WhatsAppService } from "./whatsapp-service";
import { WhatsAppApiClient } from "./whatsapp-api-client";
import { createWhatsAppClient, WhatsAppConfig } from "./whatsapp-client";

// Configuration interface
export interface McpConfig {
  qrCodeFile?: string;
  useApiClient?: boolean;
  apiBaseUrl?: string;
  whatsappConfig?: WhatsAppConfig;
}

/**
 * Creates an MCP server that exposes WhatsApp functionality through the Model Context Protocol
 * This allows AI models like Claude to interact with WhatsApp through a standardized interface
 * 
 * @param mcpConfig Configuration for the MCP server
 * @returns The configured MCP server
 */
export function createMcpServer(config: McpConfig = {}) {
  const server = new McpServer({
    name: "WhatsApp-Web-MCP",
    version: "1.0.0",
    description: "WhatsApp Web API exposed through Model Context Protocol"
  });


  let service: WhatsAppApiClient | WhatsAppService;
  
  if (config.useApiClient) { 
    service = new WhatsAppApiClient(config.apiBaseUrl)
  } else {
    const client = createWhatsAppClient(config.whatsappConfig);
    client.initialize();
    service = new WhatsAppService(client);
  }

  // Resource to list contacts
  server.resource(
    "contacts",
    "whatsapp://contacts",
    async (uri) => {
      try {
        const contacts = await service.getContacts();

        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(contacts, null, 2)
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
      try {
        // Ensure number is a string
        const phoneNumber = Array.isArray(number) ? number[0] : number;
        const messages = await service.getMessages(phoneNumber, 10);

        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(messages, null, 2)
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
      try {
        const chats = await service.getChats();

        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(chats, null, 2)
          }]
        };
      } catch (error) {
        throw new Error(`Failed to fetch chats: ${error}`);
      }
    }
  );

  // Tool to get WhatsApp connection status
  server.tool(
    "get_status",
    {},
    async () => {
      try {
        const status = await service.getStatus();
        
        return {
          content: [{ 
            type: "text", 
            text: `WhatsApp connection status: ${status.status}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting status: ${error}` 
          }],
          isError: true
        };
      }
    }
  );

  // Tool to search contacts
  server.tool(
    "search_contacts",
    {
      query: z.string().describe("Search query to find contacts by name or number")
    },
    async ({ query }) => {
      try {
        const contacts = await service.searchContacts(query);
        
        return {
          content: [{ 
            type: "text", 
            text: `Found ${contacts.length} contacts matching "${query}":\n${JSON.stringify(contacts, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error searching contacts: ${error}` 
          }],
          isError: true
        };
      }
    }
  );

  // Tool to get messages from a specific chat
  server.tool(
    "get_messages",
    {
      number: z.string().describe("The phone number to get messages from"),
      limit: z.number().optional().describe("The number of messages to get (default: 10)")
    },
    async ({ number, limit = 10 }) => {
      try {
        const messages = await service.getMessages(number, limit);
        
        return {
          content: [{ 
            type: "text", 
            text: `Retrieved ${messages.length} messages from ${number}:\n${JSON.stringify(messages, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting messages: ${error}` 
          }],
          isError: true
        };
      }
    }
  );

  // Tool to get all chats
  server.tool(
    "get_chats",
    {},
    async () => {
      try {
        const chats = await service.getChats();
        
        return {
          content: [{ 
            type: "text", 
            text: `Retrieved ${chats.length} chats:\n${JSON.stringify(chats, null, 2)}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting chats: ${error}` 
          }],
          isError: true
        };
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
      try {
        const result = await service.sendMessage(number, message);
        
        return {
          content: [{ 
            type: "text", 
            text: `Message sent successfully to ${number}. Message ID: ${result.messageId}` 
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