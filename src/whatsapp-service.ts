import { Client, Contact, Message } from 'whatsapp-web.js';

export function timestampToIso(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

export class WhatsAppService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async getStatus() {
    try {
      const status = this.client.info ? 'connected' : 'disconnected';
      
      return {
        status,
        info: this.client.info
      };
    } catch (error) {
      throw new Error(`Failed to get client status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getContacts() {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }
      
      const contacts = await this.client.getContacts();
      
      const filteredContacts = contacts.filter((contact: Contact) => 
        contact.isUser && 
        contact.id.server === 'c.us' && 
        !contact.isMe
      );

      return filteredContacts.map((contact: Contact) => ({
        name: contact.pushname || "Unknown",
        number: contact.number,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch contacts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchContacts(query: string) {
    try {
      if (!query) {
        throw new Error('Search query is required');
      }
            
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }
      
      const contacts = await this.client.getContacts();
      
      const filteredContacts = contacts.filter((contact: Contact) => 
        contact.isUser && 
        contact.id.server === 'c.us' && 
        !contact.isMe &&
        (
          (contact.pushname && contact.pushname.toLowerCase().includes(query.toLowerCase())) ||
          (contact.number && contact.number.includes(query))
        )
      );

      return filteredContacts.map((contact: Contact) => ({
        name: contact.pushname || "Unknown",
        number: contact.number,
      }));
    } catch (error) {
      throw new Error(`Failed to search contacts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getChats() {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }
      
      const chats = await this.client.getChats();
      
      return chats.map((chat: any) => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        timestamp: timestampToIso(chat.timestamp),
        pinned: chat.pinned
      }));
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getMessages(number: string, limit: number = 10) {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }
      
      const sanitized_number = number.toString().replace(/[- )(]/g, "");
      const number_details = await this.client.getNumberId(sanitized_number);

      if (!number_details) {
        throw new Error('Mobile number is not registered on WhatsApp');
      }

      const chat = await this.client.getChatById(number_details._serialized);
      const messages = await chat.fetchMessages({ limit });

      return messages.map((message: Message) => ({
        id: message.id.id,
        body: message.body,
        fromMe: message.fromMe,
        timestamp: timestampToIso(message.timestamp),
        type: message.type
      }));
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async sendMessage(number: string, message: string) {
    try {
      if (!number || !message) {
        throw new Error('Number and message are required');
      }
            
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }
      
      const sanitized_number = number.toString().replace(/[- )(]/g, "");
      const number_details = await this.client.getNumberId(sanitized_number);

      if (!number_details) {
        throw new Error(`Mobile number ${number} is not registered on WhatsApp`);
      }

      const sendMessageData = await this.client.sendMessage(number_details._serialized, message);
      
      return {
        success: true,
        messageId: sendMessageData.id.id,
        to: number
      };
    } catch (error) {
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 