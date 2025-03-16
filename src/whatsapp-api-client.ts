import axios from 'axios';

export class WhatsAppApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async getStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/status`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get client status: ${error}`);
    }
  }

  async getContacts() {
    try {
      const response = await axios.get(`${this.baseUrl}/contacts`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch contacts: ${error}`);
    }
  }

  async searchContacts(query: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/contacts/search`, {
        params: { query }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search contacts: ${error}`);
    }
  }

  async getChats() {
    try {
      const response = await axios.get(`${this.baseUrl}/chats`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${error}`);
    }
  }

  async getMessages(number: string, limit: number = 10) {
    try {
      const response = await axios.get(`${this.baseUrl}/messages/${number}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error}`);
    }
  }

  async sendMessage(number: string, message: string) {
    try {
      const response = await axios.post(`${this.baseUrl}/send`, {
        number,
        message
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }
} 