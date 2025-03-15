"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routerFactory = routerFactory;
const express_1 = __importDefault(require("express"));
function timestampToIso(timestamp) {
    // Why it's return 1970-01-20T23:19:31.681Z?
    // It's because the timestamp is in milliseconds and the date is in UTC
    return new Date(timestamp * 1000).toISOString();
}
function routerFactory({ client }) {
    // Create a router instance
    const router = express_1.default.Router();
    /**
     * @swagger
     * /api/status:
     *   get:
     *     summary: Get WhatsApp client connection status
     *     responses:
     *       200:
     *         description: Returns the connection status of the WhatsApp client
     */
    router.get('/status', async (_req, res) => {
        try {
            const status = client.info ? 'connected' : 'disconnected';
            res.json({
                status,
                info: client.info
            });
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to get client status',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });
    /**
     * @swagger
     * /api/contacts:
     *   get:
     *     summary: Get all WhatsApp contacts
     *     responses:
     *       200:
     *         description: Returns a list of WhatsApp contacts
     *       500:
     *         description: Server error
     */
    router.get('/contacts', async (_req, res) => {
        try {
            if (!client.info) {
                res.status(503).json({ error: 'WhatsApp client not ready. Please try again later.' });
                return;
            }
            const contacts = await client.getContacts();
            const filteredContacts = contacts.filter((contact) => contact.isUser &&
                contact.id.server === 'c.us' &&
                !contact.isMe);
            const formattedContacts = filteredContacts.map((contact) => ({
                name: contact.pushname || "Unknown",
                number: contact.number,
            }));
            res.json(formattedContacts);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to fetch contacts',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });
    /**
     * @swagger
     * /api/contacts/search:
     *   get:
     *     summary: Search for contacts by name or number
     *     parameters:
     *       - in: query
     *         name: query
     *         schema:
     *           type: string
     *         required: true
     *         description: Search query to find contacts by name or number
     *     responses:
     *       200:
     *         description: Returns matching contacts
     *       500:
     *         description: Server error
     */
    router.get('/contacts/search', async (req, res) => {
        try {
            const query = req.query.query;
            if (!query) {
                res.status(400).json({ error: 'Search query is required' });
                return;
            }
            if (!client.info) {
                res.status(503).json({ error: 'WhatsApp client not ready. Please try again later.' });
                return;
            }
            const contacts = await client.getContacts();
            const filteredContacts = contacts.filter((contact) => contact.isUser &&
                contact.id.server === 'c.us' &&
                !contact.isMe &&
                ((contact.pushname && contact.pushname.toLowerCase().includes(query.toLowerCase())) ||
                    (contact.number && contact.number.includes(query))));
            const formattedContacts = filteredContacts.map((contact) => ({
                name: contact.pushname || "Unknown",
                number: contact.number,
            }));
            res.json(formattedContacts);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to search contacts',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });
    /**
     * @swagger
     * /api/chats:
     *   get:
     *     summary: Get all WhatsApp chats
     *     responses:
     *       200:
     *         description: Returns a list of WhatsApp chats
     *       500:
     *         description: Server error
     */
    router.get('/chats', async (_req, res) => {
        try {
            if (!client.info) {
                res.status(503).json({ error: 'WhatsApp client not ready. Please try again later.' });
                return;
            }
            const chats = await client.getChats();
            const formattedChats = chats.map((chat) => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                timestamp: timestampToIso(chat.timestamp),
                pinned: chat.pinned
            }));
            res.json(formattedChats);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to fetch chats',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });
    /**
     * @swagger
     * /api/messages/{number}:
     *   get:
     *     summary: Get messages from a specific chat
     *     parameters:
     *       - in: path
     *         name: number
     *         schema:
     *           type: string
     *         required: true
     *         description: The phone number to get messages from
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: The number of messages to get (default: 10)
     *     responses:
     *       200:
     *         description: Returns messages from the specified chat
     *       404:
     *         description: Number not found on WhatsApp
     *       500:
     *         description: Server error
     */
    router.get('/messages/:number', async (req, res) => {
        try {
            const number = req.params.number;
            const limit = parseInt(req.query.limit) || 10;
            if (!client.info) {
                res.status(503).json({ error: 'WhatsApp client not ready. Please try again later.' });
                return;
            }
            const sanitized_number = number.toString().replace(/[- )(]/g, "");
            const number_details = await client.getNumberId(sanitized_number);
            if (!number_details) {
                res.status(404).json({ error: 'Mobile number is not registered on WhatsApp' });
                return;
            }
            const chat = await client.getChatById(number_details._serialized);
            const messages = await chat.fetchMessages({ limit });
            const formattedMessages = messages.map((message) => ({
                id: message.id.id,
                body: message.body,
                fromMe: message.fromMe,
                timestamp: timestampToIso(message.timestamp),
                type: message.type
            }));
            res.json(formattedMessages);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to fetch messages',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });
    /**
     * @swagger
     * /api/send:
     *   post:
     *     summary: Send a message to a WhatsApp contact
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - number
     *               - message
     *             properties:
     *               number:
     *                 type: string
     *                 description: The phone number to send the message to
     *               message:
     *                 type: string
     *                 description: The message content to send
     *     responses:
     *       200:
     *         description: Message sent successfully
     *       404:
     *         description: Number not found on WhatsApp
     *       500:
     *         description: Server error
     */
    router.post('/send', async (req, res) => {
        try {
            const { number, message } = req.body;
            if (!number || !message) {
                res.status(400).json({ error: 'Number and message are required' });
                return;
            }
            if (!client.info) {
                res.status(503).json({ error: 'WhatsApp client not ready. Please try again later.' });
                return;
            }
            const sanitized_number = number.toString().replace(/[- )(]/g, "");
            const number_details = await client.getNumberId(sanitized_number);
            if (!number_details) {
                res.status(404).json({ error: `Mobile number ${number} is not registered on WhatsApp` });
                return;
            }
            const sendMessageData = await client.sendMessage(number_details._serialized, message);
            res.json({
                success: true,
                messageId: sendMessageData.id.id,
                to: number
            });
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to send message',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });
    return router;
}
//# sourceMappingURL=api.js.map