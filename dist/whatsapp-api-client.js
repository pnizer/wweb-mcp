"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
class WhatsAppApiClient {
    constructor(baseUrl = 'http://localhost:3000/api') {
        this.baseUrl = baseUrl;
    }
    async getStatus() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/status`);
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get client status: ${error}`);
        }
    }
    async getContacts() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/contacts`);
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch contacts: ${error}`);
        }
    }
    async searchContacts(query) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/contacts/search`, {
                params: { query }
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to search contacts: ${error}`);
        }
    }
    async getChats() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/chats`);
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch chats: ${error}`);
        }
    }
    async getMessages(number, limit = 10) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/messages/${number}`, {
                params: { limit }
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch messages: ${error}`);
        }
    }
    async sendMessage(number, message) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/send`, {
                number,
                message
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to send message: ${error}`);
        }
    }
}
exports.WhatsAppApiClient = WhatsAppApiClient;
//# sourceMappingURL=whatsapp-api-client.js.map