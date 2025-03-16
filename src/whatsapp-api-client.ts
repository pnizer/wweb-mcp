import axios, { AxiosInstance } from 'axios';
import {
  StatusResponse,
  ContactResponse,
  ChatResponse,
  MessageResponse,
  SendMessageResponse,
} from './types';

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
      throw new Error(`Failed to get client status: ${error}`);
    }
  }

  async getContacts(): Promise<ContactResponse[]> {
    try {
      const response = await this.axiosInstance.get('/contacts');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch contacts: ${error}`);
    }
  }

  async searchContacts(query: string): Promise<ContactResponse[]> {
    try {
      const response = await this.axiosInstance.get('/contacts/search', {
        params: { query },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search contacts: ${error}`);
    }
  }

  async getChats(): Promise<ChatResponse[]> {
    try {
      const response = await this.axiosInstance.get('/chats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${error}`);
    }
  }

  async getMessages(number: string, limit: number = 10): Promise<MessageResponse[]> {
    try {
      const response = await this.axiosInstance.get(`/messages/${number}`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error}`);
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
      throw new Error(`Failed to send message: ${error}`);
    }
  }
}
