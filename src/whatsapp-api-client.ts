import axios from 'axios';
import {
  StatusResponse,
  ContactResponse,
  ChatResponse,
  MessageResponse,
  SendMessageResponse,
} from './types';

export class WhatsAppApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async getStatus(): Promise<StatusResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/status`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get client status: ${error}`);
    }
  }

  async getContacts(): Promise<ContactResponse[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/contacts`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch contacts: ${error}`);
    }
  }

  async searchContacts(query: string): Promise<ContactResponse[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/contacts/search`, {
        params: { query },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search contacts: ${error}`);
    }
  }

  async getChats(): Promise<ChatResponse[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/chats`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${error}`);
    }
  }

  async getMessages(number: string, limit: number = 10): Promise<MessageResponse[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/messages/${number}`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error}`);
    }
  }

  async sendMessage(number: string, message: string): Promise<SendMessageResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/send`, {
        number,
        message,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }
}
