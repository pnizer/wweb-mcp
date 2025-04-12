import axios, { AxiosInstance } from 'axios';
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

// Helper function to convert errors to strings
function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class WhatsAppApiClient {
  private baseUrl: string;
  private apiKey: string;
  private axiosInstance: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  async getStatus(): Promise<StatusResponse> {
    try {
      const response = await this.axiosInstance.get('/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get client status: ${errorToString(error)}`);
    }
  }

  async getContacts(): Promise<ContactResponse[]> {
    try {
      const response = await this.axiosInstance.get('/contacts');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch contacts: ${errorToString(error)}`);
    }
  }

  async searchContacts(query: string): Promise<ContactResponse[]> {
    try {
      const response = await this.axiosInstance.get('/contacts/search', {
        params: { query },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search contacts: ${errorToString(error)}`);
    }
  }

  async getChats(): Promise<ChatResponse[]> {
    try {
      const response = await this.axiosInstance.get('/chats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${errorToString(error)}`);
    }
  }

  async getMessages(number: string, limit: number = 10): Promise<MessageResponse[]> {
    try {
      const response = await this.axiosInstance.get(`/messages/${number}`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${errorToString(error)}`);
    }
  }

  async sendMessage(number: string, message: string): Promise<SendMessageResponse> {
    try {
      const response = await this.axiosInstance.post('/send', {
        number,
        message,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send message: ${errorToString(error)}`);
    }
  }

  async createGroup(name: string, participants: string[]): Promise<CreateGroupResponse> {
    try {
      const response = await this.axiosInstance.post('/groups', {
        name,
        participants,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create group: ${errorToString(error)}`);
    }
  }

  async addParticipantsToGroup(
    groupId: string,
    participants: string[],
  ): Promise<AddParticipantsResponse> {
    try {
      const response = await this.axiosInstance.post(`/groups/${groupId}/participants/add`, {
        participants,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to add participants to group: ${errorToString(error)}`);
    }
  }

  async getGroupMessages(groupId: string, limit: number = 10): Promise<MessageResponse[]> {
    try {
      const response = await this.axiosInstance.get(`/groups/${groupId}/messages`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch group messages: ${errorToString(error)}`);
    }
  }

  async sendGroupMessage(groupId: string, message: string): Promise<SendMessageResponse> {
    try {
      const response = await this.axiosInstance.post(`/groups/${groupId}/send`, {
        message,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send group message: ${errorToString(error)}`);
    }
  }

  async getGroups(): Promise<GroupResponse[]> {
    try {
      const response = await this.axiosInstance.get('/groups');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch groups: ${errorToString(error)}`);
    }
  }

  async getGroupById(groupId: string): Promise<GroupResponse> {
    try {
      const response = await this.axiosInstance.get(`/groups/${groupId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch group by ID: ${errorToString(error)}`);
    }
  }

  async searchGroups(query: string): Promise<GroupResponse[]> {
    try {
      const response = await this.axiosInstance.get(
        `/groups/search?query=${encodeURIComponent(query)}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search groups: ${errorToString(error)}`);
    }
  }

  async downloadMediaFromMessage(messageId: string): Promise<MediaResponse> {
    try {
      const response = await this.axiosInstance.post(`/messages/${messageId}/media/download`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to download media from message: ${errorToString(error)}`);
    }
  }

  async sendMediaMessage({
    number,
    source,
    caption,
  }: SendMediaMessageParams): Promise<SendMediaMessageResponse> {
    try {
      const response = await this.axiosInstance.post('/send/media', {
        number,
        source,
        caption,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send media message: ${errorToString(error)}`);
    }
  }
}
