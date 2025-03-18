import { Client, Contact, GroupChat } from 'whatsapp-web.js';
// @ts-expect-error - ImportType not exported in whatsapp-web.js but needed for GroupChat functionality
import _GroupChat from 'whatsapp-web.js/src/structures/GroupChat';
import {
  StatusResponse,
  ContactResponse,
  ChatResponse,
  MessageResponse,
  SendMessageResponse,
  GroupResponse,
  CreateGroupResponse,
  AddParticipantsResponse,
} from './types';
import logger from './logger';

export function timestampToIso(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

export class WhatsAppService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async getStatus(): Promise<StatusResponse> {
    try {
      const status = this.client.info ? 'connected' : 'disconnected';

      return {
        status,
        info: this.client.info,
      };
    } catch (error) {
      throw new Error(
        `Failed to get client status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getContacts(): Promise<ContactResponse[]> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      const contacts = await this.client.getContacts();

      const filteredContacts = contacts.filter(
        (contact: Contact) => contact.isUser && contact.id.server === 'c.us' && !contact.isMe,
      );

      return filteredContacts.map((contact: Contact) => ({
        name: contact.pushname || 'Unknown',
        number: contact.number,
      }));
    } catch (error) {
      throw new Error(
        `Failed to fetch contacts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async searchContacts(query: string): Promise<ContactResponse[]> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      const contacts = await this.client.getContacts();

      const filteredContacts = contacts.filter(
        (contact: Contact) =>
          contact.isUser &&
          contact.id.server === 'c.us' &&
          !contact.isMe &&
          ((contact.pushname && contact.pushname.toLowerCase().includes(query.toLowerCase())) ||
            (contact.number && contact.number.includes(query))),
      );

      return filteredContacts.map((contact: Contact) => ({
        name: contact.pushname || 'Unknown',
        number: contact.number,
      }));
    } catch (error) {
      throw new Error(
        `Failed to search contacts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getChats(): Promise<ChatResponse[]> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      const chats = await this.client.getChats();
      return chats.map(chat => {
        const lastMessageTimestamp = chat.lastMessage
          ? timestampToIso(chat.lastMessage.timestamp)
          : '';
        return {
          id: chat.id._serialized,
          name: chat.name,
          unreadCount: chat.unreadCount,
          timestamp: lastMessageTimestamp,
          lastMessage: chat.lastMessage ? chat.lastMessage.body : '',
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to fetch chats: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getMessages(number: string, limit: number = 10): Promise<MessageResponse[]> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Ensure number is a string
      if (typeof number !== 'string' || number.trim() === '') {
        throw new Error('Invalid phone number');
      }

      // Format the chat ID
      const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

      // Get the chat
      const chat = await this.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });

      return messages.map(message => ({
        id: message.id.id,
        body: message.body,
        fromMe: message.fromMe,
        timestamp: timestampToIso(message.timestamp),
        contact: message.fromMe ? undefined : chat.name,
      }));
    } catch (error) {
      throw new Error(
        `Failed to fetch messages: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendMessage(number: string, message: string): Promise<SendMessageResponse> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Ensure number is a string
      if (typeof number !== 'string' || number.trim() === '') {
        throw new Error('Invalid phone number');
      }

      // Format the chat ID
      const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

      // Send the message
      const result = await this.client.sendMessage(chatId, message);

      return {
        messageId: result.id.id,
      };
    } catch (error) {
      throw new Error(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async createGroup(name: string, participants: string[]): Promise<CreateGroupResponse> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Ensure name is valid
      if (typeof name !== 'string' || name.trim() === '') {
        throw new Error('Invalid group name');
      }

      // Format participant IDs
      const formattedParticipants = participants.map(p => (p.includes('@c.us') ? p : `${p}@c.us`));

      // Create the group
      const result = await this.client.createGroup(name, formattedParticipants);

      // Handle both string and object return types
      let groupId = '';
      let inviteCode = undefined;

      if (typeof result === 'string') {
        groupId = result;
      } else if (result && typeof result === 'object') {
        // Safely access properties
        groupId = result.gid && result.gid._serialized ? result.gid._serialized : '';
        // The inviteCode property is not guaranteed in the type definitions,
        // but may exist in the actual implementation
        inviteCode = (result as any).inviteCode;
      }

      return {
        groupId,
        inviteCode,
      };
    } catch (error) {
      throw new Error(
        `Failed to create group: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async addParticipantsToGroup(
    groupId: string,
    participants: string[],
  ): Promise<AddParticipantsResponse> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      if (typeof groupId !== 'string' || groupId.trim() === '') {
        throw new Error('Invalid group ID');
      }

      const formattedGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
      const formattedParticipants = participants.map(p => (p.includes('@c.us') ? p : `${p}@c.us`));

      // @ts-expect-error - Using raw API to access methods not exposed in the Client type
      const rawChat = await this.client.pupPage.evaluate(async chatId => {
        // @ts-expect-error - Accessing window.WWebJS which is not typed but exists at runtime
        return await window.WWebJS.getChat(chatId);
      }, formattedGroupId);

      // Check if it's a group chat
      if (!rawChat.groupMetadata) {
        throw new Error('The provided ID is not a group chat');
      }

      const chat = new _GroupChat(this.client, rawChat);

      // Use addParticipants method from GroupChat if available
      const chatAny = chat as GroupChat & {
        addParticipants?: (participants: string[]) => Promise<Record<string, boolean> | unknown>;
      };

      // Add participants using the addParticipants method if available
      const resultMap: Record<string, boolean> = {};

      try {
        const results = await chatAny.addParticipants(formattedParticipants);

        // Handle different return types
        if (typeof results === 'object') {
          for (const [id, success] of Object.entries(results)) {
            resultMap[id] = Boolean(success);
          }
        } else {
          // If the result is not an object, assume success for all participants
          for (const participant of formattedParticipants) {
            resultMap[participant] = true;
          }
        }
      } catch (err) {
        console.error('Error adding participants:', err);
        // Handle the error by marking all as failed
        for (const participant of formattedParticipants) {
          resultMap[participant] = false;
        }
      }

      // Process results
      const added: string[] = [];
      const failed: { number: string; reason: string }[] = [];

      for (const [id, success] of Object.entries(resultMap)) {
        const number = id.split('@')[0];
        if (success) {
          added.push(number);
        } else {
          failed.push({ number, reason: 'Failed to add participant' });
        }
      }

      return {
        success: failed.length === 0,
        added,
        failed: failed.length > 0 ? failed : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to add participants to group: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getGroupMessages(groupId: string, limit: number = 10): Promise<MessageResponse[]> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Ensure groupId is valid
      if (typeof groupId !== 'string' || groupId.trim() === '') {
        throw new Error('Invalid group ID');
      }

      // Format the group ID
      const formattedGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;

      // Get the chat
      const chat = await this.client.getChatById(formattedGroupId);
      const messages = await chat.fetchMessages({ limit });

      return messages.map(message => ({
        id: message.id.id,
        body: message.body,
        fromMe: message.fromMe,
        timestamp: timestampToIso(message.timestamp),
        contact: message.fromMe ? undefined : message.author?.split('@')[0],
        type: message.type,
      }));
    } catch (error) {
      throw new Error(
        `Failed to fetch group messages: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendGroupMessage(groupId: string, message: string): Promise<SendMessageResponse> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Ensure groupId is valid
      if (typeof groupId !== 'string' || groupId.trim() === '') {
        throw new Error('Invalid group ID');
      }

      // Format the group ID
      const formattedGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;

      // Send the message
      const result = await this.client.sendMessage(formattedGroupId, message);

      return {
        messageId: result.id.id,
      };
    } catch (error) {
      throw new Error(
        `Failed to send group message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getGroups(): Promise<GroupResponse[]> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Get all chats
      // @ts-expect-error - Using raw API to access methods not exposed in the Client type
      const rawChats = await this.client.pupPage.evaluate(async () => {
        // @ts-expect-error - Accessing window.WWebJS which is not typed but exists at runtime
        return await window.WWebJS.getChats();
      });
      const groupChats: GroupChat[] = rawChats
        .filter((chat: any) => chat.groupMetadata)
        .map((chat: any) => {
          chat.isGroup = true;
          return new _GroupChat(this.client, chat);
        });

      logger.info(`Found ${groupChats.length} groups`);

      const groups: GroupResponse[] = groupChats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        description: ((chat as any).groupMetadata || {}).subject || '',
        participants: chat.participants.map(participant => ({
          id: participant.id._serialized,
          number: participant.id.user,
          isAdmin: participant.isAdmin,
        })),
        createdAt: chat.timestamp ? timestampToIso(chat.timestamp) : new Date().toISOString(),
      }));

      return groups;
    } catch (error) {
      throw new Error(
        `Failed to fetch groups: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async searchGroups(query: string): Promise<GroupResponse[]> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      const allGroups = await this.getGroups();

      const lowerQuery = query.toLowerCase();
      const matchingGroups = allGroups.filter(group => {
        if (group.name.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        if (group.description && group.description.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        return false;
      });

      return matchingGroups;
    } catch (error) {
      throw new Error(
        `Failed to search groups: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
