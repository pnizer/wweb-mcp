"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
class WhatsAppApiClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
        });
    }
    async getStatus() {
        try {
            const response = await this.axiosInstance.get('/status');
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get client status: ${error}`);
        }
    }
    async getContacts() {
        try {
            const response = await this.axiosInstance.get('/contacts');
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch contacts: ${error}`);
        }
    }
    async searchContacts(query) {
        try {
            const response = await this.axiosInstance.get('/contacts/search', {
                params: { query },
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to search contacts: ${error}`);
        }
    }
    async getChats() {
        try {
            const response = await this.axiosInstance.get('/chats');
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch chats: ${error}`);
        }
    }
    async getMessages(number, limit = 10) {
        try {
            const response = await this.axiosInstance.get(`/messages/${number}`, {
                params: { limit },
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch messages: ${error}`);
        }
    }
    async sendMessage(number, message) {
        try {
            const response = await this.axiosInstance.post('/send', {
                number,
                message,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to send message: ${error}`);
        }
    }
    async createGroup(name, participants) {
        try {
            const response = await this.axiosInstance.post('/groups', {
                name,
                participants,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to create group: ${error}`);
        }
    }
    async addParticipantsToGroup(groupId, participants) {
        try {
            const response = await this.axiosInstance.post(`/groups/${groupId}/participants/add`, {
                participants,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to add participants to group: ${error}`);
        }
    }
    async getGroupMessages(groupId, limit = 10) {
        try {
            const response = await this.axiosInstance.get(`/groups/${groupId}/messages`, {
                params: { limit },
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch group messages: ${error}`);
        }
    }
    async sendGroupMessage(groupId, message) {
        try {
            const response = await this.axiosInstance.post(`/groups/${groupId}/send`, {
                message,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to send group message: ${error}`);
        }
    }
    async getGroups() {
        try {
            const response = await this.axiosInstance.get('/groups');
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch groups: ${error}`);
        }
    }
    async searchGroups(query) {
        try {
            const response = await this.axiosInstance.get('/groups/search', {
                params: { query },
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to search groups: ${error}`);
        }
    }
}
exports.WhatsAppApiClient = WhatsAppApiClient;
//# sourceMappingURL=whatsapp-api-client.js.map