import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Client, Contact, Message } from 'whatsapp-web.js';
import { createWhatsAppClient } from "./whatsapp-client";

let clientPromise: Promise<Client>;

async function getClient() {
  if (!clientPromise) {  
    clientPromise = new Promise<Client>((resolve, reject) => {
      const qrCodeFileName = process.env.QR_CODE_FILE_NAME || undefined;
      const client = createWhatsAppClient(qrCodeFileName);
      // Initialize WhatsApp client
      console.error('Initializing WhatsApp client...');
      client.initialize().then(() => resolve(client)).catch(reject);
    });
  }

  return await clientPromise;
}

if (process.env.EAGERLY_INITIALIZE_CLIENT) {
  getClient();
}

/**
 * Creates an MCP server that exposes WhatsApp functionality through the Model Context Protocol
 * This allows AI models like Claude to interact with WhatsApp through a standardized interface
 * 
 * @param client The WhatsApp Web.js client
 * @returns The configured MCP server
 */
export function createMcpServer() {
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

  // Tool to get client status
  server.tool(
    "get_status",
    {},
    async () => {
      const status = (await getClient()).info ? 'connected' : 'disconnected';
      
      return {
        content: [{ 
          type: "text", 
          text: `WhatsApp client status: ${status}` 
        }]
      };
    }
  );

  // Tool to search for contacts
  server.tool(
    "search_contacts",
    {
      query: z.string().describe("Search query to find contacts by name or number")
    },
    async ({ query }) => {
      ensureClientReady();
      
      try {
        const contacts = await (await getClient()).getContacts();
        
        const filteredContacts = contacts.filter((contact: Contact) => 
          contact.isUser && 
          contact.id.server === 'c.us' && 
          !contact.isMe &&
          (
            (contact.pushname && contact.pushname.toLowerCase().includes(query.toLowerCase())) ||
            (contact.number && contact.number.includes(query))
          )
        );

        const formattedContacts = filteredContacts.map((contact: Contact) => ({
          name: contact.pushname || "Unknown",
          number: contact.number,
        }));
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(formattedContacts, null, 2)
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

  // Tool to get messages from a chat
  server.tool(
    "get_messages",
    {
      number: z.string().describe("The phone number to get messages from"),
      limit: z.number().describe("The number of messages to get")
    },
    async ({ number, limit }) => {
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

        const chat = await (await getClient()).getChatById(number_details._serialized);
        const messages = await chat.fetchMessages({ limit });

        const formattedMessages = messages.map((message: Message) => ({
            id: message.id.id,
            body: message.body,
            fromMe: message.fromMe,
            timestamp: message.timestamp,
            type: message.type
        }));

        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(formattedMessages, null, 2)
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
  

  // Prompt for composing a message
  server.prompt(
    "compose_message",
    {
      context: z.string().describe("Context or purpose of the message"),
      tone: z.string().optional().describe("Desired tone of the message (formal, friendly, etc.)"),
      length: z.string().optional().describe("Desired length (short, medium, long)")
    },
    ({ context, tone = "friendly", length = "medium" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please compose a WhatsApp message with the following requirements:
          
Context/Purpose: ${context}
Tone: ${tone}
Length: ${length}

The message should be appropriate for WhatsApp and ready to send without further editing.`
        }
      }]
    })
  );

  // Prompt for analyzing a conversation
  server.prompt(
    "analyze_conversation",
    {
      number: z.string().describe("The phone number to analyze conversation with")
    },
    async ({ number }) => {
      ensureClientReady();
      
      try {
        const sanitized_number = number.toString().replace(/[- )(]/g, "");
        const number_details = await (await getClient()).getNumberId(sanitized_number);

        if (!number_details) {
          throw new Error('Mobile number is not registered on WhatsApp');
        }

        const chat = await (await getClient()).getChatById(number_details._serialized);
        const messages = await chat.fetchMessages({ limit: 20 });

        const formattedMessages = messages.map((message: Message) => 
          `${message.fromMe ? 'You' : 'Contact'}: ${message.body} [${new Date(message.timestamp * 1000).toLocaleString()}]`
        ).join('\n');

        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Please analyze this WhatsApp conversation and provide insights:

${formattedMessages}

Please provide:
1. A summary of the conversation
2. Key topics discussed
3. Any action items or follow-ups needed
4. The overall tone of the conversation`
            }
          }]
        };
      } catch (error) {
        throw new Error(`Failed to analyze conversation: ${error}`);
      }
    }
  );

  return server;
} 