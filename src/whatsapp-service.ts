import { Client, Contact, GroupChat, GroupParticipant, MessageMedia } from 'whatsapp-web.js';
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
  MediaResponse,
  SendMediaMessageParams,
  SendMediaMessageResponse,
} from './types';
import logger from './logger';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

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
        id: message.id._serialized,
        body: message.body,
        fromMe: message.fromMe,
        timestamp: timestampToIso(message.timestamp),
        contact: message.fromMe ? undefined : message.author?.split('@')[0],
        type: message.type,
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

      if (typeof name !== 'string' || name.trim() === '') {
        throw new Error('Invalid group name');
      }

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

      const formattedParticipants = participants.map(p => (p.includes('@c.us') ? p : `${p}@c.us`));
      const chat = await this.getRawGroup(groupId);

      const results = (await chat.addParticipants(formattedParticipants)) as
        | Record<string, { code: number; message: string; isInviteV4Sent: boolean }>
        | string;

      const resultMap: Record<string, { code: number; message: string; isInviteV4Sent: boolean }> =
        {};
      if (typeof results === 'object') {
        for (const [id, result] of Object.entries(results)) {
          resultMap[id] = result;
        }
      } else {
        // If the result is not an object, string is a error message
        throw new Error(results);
      }

      // Process results
      const added: string[] = [];
      const failed: { number: string; reason: string }[] = [];

      for (const [id, success] of Object.entries(resultMap)) {
        const number = id.split('@')[0];
        if (success.code === 200) {
          added.push(number);
        } else {
          failed.push({ number, reason: success.message });
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
        id: message.id._serialized,
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

  async getUserName(id: string): Promise<string | undefined> {
    const contact = await this.client.getContactById(id);
    return contact.pushname || contact.name || undefined;
  }

  async getGroups(): Promise<GroupResponse[]> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Get all chats
      // It's not possible to use getGroups because WhatsApp Client is not setting the isGroup property
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

      const groups: GroupResponse[] = await Promise.all(
        groupChats.map(async chat => ({
          id: chat.id._serialized,
          name: chat.name,
          description: ((chat as any).groupMetadata || {}).subject || '',
          participants: await Promise.all(
            chat.participants.map(async participant => ({
              id: participant.id._serialized,
              number: participant.id.user,
              isAdmin: participant.isAdmin,
              name: await this.getUserName(participant.id._serialized),
            })),
          ),
          createdAt: chat.timestamp ? timestampToIso(chat.timestamp) : new Date().toISOString(),
        })),
      );

      return groups;
    } catch (error) {
      throw new Error(
        `Failed to fetch groups: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getGroupById(groupId: string): Promise<GroupResponse> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Ensure groupId is valid
      if (typeof groupId !== 'string' || groupId.trim() === '') {
        throw new Error('Invalid group ID');
      }

      // It's not possible to use getChatById because WhatsApp Client is not setting the isGroup property
      const chat = await this.getRawGroup(groupId);

      return {
        id: chat.id._serialized,
        name: chat.name,
        description: ((chat as any).groupMetadata || {}).subject || '',
        participants: await Promise.all(
          chat.participants.map(async (participant: GroupParticipant) => ({
            id: participant.id._serialized,
            number: participant.id.user,
            isAdmin: participant.isAdmin,
            name: await this.getUserName(participant.id._serialized),
          })),
        ),
        createdAt: chat.timestamp ? timestampToIso(chat.timestamp) : new Date().toISOString(),
      };
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

  private async getRawGroup(groupId: string): Promise<_GroupChat> {
    // Clean up the group ID if it doesn't have the suffix
    const formattedGroupId = groupId.endsWith('@g.us') ? groupId : `${groupId}@g.us`;

    // @ts-expect-error - Using raw API to access methods not exposed in the Client type
    const rawChat = await this.client.pupPage.evaluate(async chatId => {
      // @ts-expect-error - Accessing window.WWebJS which is not typed but exists at runtime
      return await window.WWebJS.getChat(chatId);
    }, formattedGroupId);

    // Check if it's a group chat
    if (!rawChat.groupMetadata) {
      throw new Error('The provided ID is not a group chat');
    }

    return new _GroupChat(this.client, rawChat);
  }

  // Download media from a message
  async downloadMediaFromMessage(
    messageId: string,
    mediaStoragePath: string,
  ): Promise<MediaResponse> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      const message = await this.client.getMessageById(messageId);
      if (!message) {
        throw new Error(`Message with ID ${messageId} not found`);
      }
      if (!message.hasMedia) {
        throw new Error(`Message with ID ${messageId} does not contain media`);
      }

      const media = await message.downloadMedia();
      if (!media) {
        throw new Error(`Failed to download media from message ${messageId}`);
      }

      // Generate a unique filename based on messageId
      const extension = mime.extension(media.mimetype) || 'bin';
      const filename = `${messageId.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      const relativePath = path.join(mediaStoragePath, filename);

      // Convert to absolute path
      const absolutePath = path.resolve(relativePath);

      // Write the media to a file asynchronously
      const buffer = Buffer.from(media.data, 'base64');
      await fs.promises.writeFile(absolutePath, buffer);

      // Get file size asynchronously
      const stats = await fs.promises.stat(absolutePath);

      return {
        filePath: absolutePath, // Return the absolute path
        mimetype: media.mimetype,
        filename,
        filesize: stats.size,
        messageId, // This is already the serialized messageId as you fixed
      };
    } catch (error) {
      logger.error('Failed to download media', { error });
      throw new Error(
        `Failed to download media: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendMediaMessage({
    number,
    source,
    caption,
  }: SendMediaMessageParams): Promise<SendMediaMessageResponse> {
    try {
      if (!this.client.info) {
        throw new Error('WhatsApp client not ready. Please try again later.');
      }

      // Validate number
      if (typeof number !== 'string' || number.trim() === '') {
        throw new Error('Invalid phone number');
      }

      // Format the chat ID
      const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

      // Create MessageMedia based on source URI scheme
      let media: MessageMedia;
      try {
        if (source.startsWith('http://') || source.startsWith('https://')) {
          // URL source
          media = await MessageMedia.fromUrl(source);
        } else if (source.startsWith('file://')) {
          // Local file source (remove file:// prefix)
          const filePath = source.replace(/^file:\/\//, '');
          media = await MessageMedia.fromFilePath(filePath);
        } else {
          throw new Error('Invalid source format. URLs must use http:// or https:// prefixes (e.g., https://example.com/image.jpg), local files must use file:// prefix (e.g., file:///path/to/image.jpg)');
        }
      } catch (error) {
        throw new Error(
          `Failed to load media from ${source}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      // Validate media type (ensure it's an image)
      if (!media.mimetype.startsWith('image/')) {
        throw new Error('Only image files are supported at this time');
      }

      // Send the media message
      const messageOptions = caption ? { caption } : undefined;
      const result = await this.client.sendMessage(chatId, media, messageOptions);

      return {
        messageId: result.id.id,
        mediaInfo: {
          mimetype: media.mimetype,
          filename: media.filename || 'unknown',
          size: media.data.length, // Base64 length as approximate size
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to send media message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
