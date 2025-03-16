"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
exports.timestampToIso = timestampToIso;
function timestampToIso(timestamp) {
    return new Date(timestamp * 1000).toISOString();
}
class WhatsAppService {
    constructor(client) {
        this.client = client;
    }
    async getStatus() {
        try {
            const status = this.client.info ? 'connected' : 'disconnected';
            return {
                status,
                info: this.client.info,
            };
        }
        catch (error) {
            throw new Error(`Failed to get client status: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getContacts() {
        try {
            if (!this.client.info) {
                throw new Error('WhatsApp client not ready. Please try again later.');
            }
            const contacts = await this.client.getContacts();
            const filteredContacts = contacts.filter((contact) => contact.isUser && contact.id.server === 'c.us' && !contact.isMe);
            return filteredContacts.map((contact) => ({
                name: contact.pushname || 'Unknown',
                number: contact.number,
            }));
        }
        catch (error) {
            throw new Error(`Failed to fetch contacts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async searchContacts(query) {
        try {
            if (!this.client.info) {
                throw new Error('WhatsApp client not ready. Please try again later.');
            }
            const contacts = await this.client.getContacts();
            const filteredContacts = contacts.filter((contact) => contact.isUser &&
                contact.id.server === 'c.us' &&
                !contact.isMe &&
                ((contact.pushname && contact.pushname.toLowerCase().includes(query.toLowerCase())) ||
                    (contact.number && contact.number.includes(query))));
            return filteredContacts.map((contact) => ({
                name: contact.pushname || 'Unknown',
                number: contact.number,
            }));
        }
        catch (error) {
            throw new Error(`Failed to search contacts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getChats() {
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
        }
        catch (error) {
            throw new Error(`Failed to fetch chats: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getMessages(number, limit = 10) {
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
        }
        catch (error) {
            throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async sendMessage(number, message) {
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
        }
        catch (error) {
            throw new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.WhatsAppService = WhatsAppService;
//# sourceMappingURL=whatsapp-service.js.map