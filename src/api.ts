import express, { Request, Response, Router } from 'express';
import { Client } from 'whatsapp-web.js';
import { WhatsAppService } from './whatsapp-service';

export function routerFactory(client: Client): Router {
  // Create a router instance
  const router: Router = express.Router();
  const whatsappService = new WhatsAppService(client);

  /**
   * @swagger
   * /api/status:
   *   get:
   *     summary: Get WhatsApp client connection status
   *     responses:
   *       200:
   *         description: Returns the connection status of the WhatsApp client
   */
  router.get('/status', async (_req: Request, res: Response) => {
    try {
      const status = await whatsappService.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get client status',
        details: error instanceof Error ? error.message : String(error),
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
  router.get('/contacts', async (_req: Request, res: Response) => {
    try {
      const contacts = await whatsappService.getContacts();
      res.json(contacts);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        res.status(503).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Failed to fetch contacts',
          details: error instanceof Error ? error.message : String(error),
        });
      }
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
  router.get('/contacts/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string;

      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const contacts = await whatsappService.searchContacts(query);
      res.json(contacts);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        res.status(503).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Failed to search contacts',
          details: error instanceof Error ? error.message : String(error),
        });
      }
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
  router.get('/chats', async (_req: Request, res: Response) => {
    try {
      const chats = await whatsappService.getChats();
      res.json(chats);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        res.status(503).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Failed to fetch chats',
          details: error instanceof Error ? error.message : String(error),
        });
      }
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
  router.get('/messages/:number', async (req: Request, res: Response) => {
    try {
      const number = req.params.number;
      const limit = parseInt(req.query.limit as string) || 10;

      const messages = await whatsappService.getMessages(number, limit);
      res.json(messages);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not ready')) {
          res.status(503).json({ error: error.message });
        } else if (error.message.includes('not registered')) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({
            error: 'Failed to fetch messages',
            details: error.message,
          });
        }
      } else {
        res.status(500).json({
          error: 'Failed to fetch messages',
          details: String(error),
        });
      }
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
  router.post('/send', async (req: Request, res: Response) => {
    try {
      const { number, message } = req.body;

      if (!number || !message) {
        res.status(400).json({ error: 'Number and message are required' });
        return;
      }

      const result = await whatsappService.sendMessage(number, message);
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not ready')) {
          res.status(503).json({ error: error.message });
        } else if (error.message.includes('not registered')) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({
            error: 'Failed to send message',
            details: error.message,
          });
        }
      } else {
        res.status(500).json({
          error: 'Failed to send message',
          details: String(error),
        });
      }
    }
  });

  /**
   * @swagger
   * /api/groups:
   *   get:
   *     summary: Get all WhatsApp groups
   *     responses:
   *       200:
   *         description: Returns a list of WhatsApp groups
   *       500:
   *         description: Server error
   */
  router.get('/groups', async (_req: Request, res: Response) => {
    try {
      const groups = await whatsappService.getGroups();
      res.json(groups);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        res.status(503).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Failed to fetch groups',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  /**
   * @swagger
   * /api/groups/search:
   *   get:
   *     summary: Search for groups by name, description, or member names
   *     parameters:
   *       - in: query
   *         name: query
   *         schema:
   *           type: string
   *         required: true
   *         description: Search query to find groups by name, description, or member names
   *     responses:
   *       200:
   *         description: Returns matching groups
   *       500:
   *         description: Server error
   */
  router.get('/groups/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string;

      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const groups = await whatsappService.searchGroups(query);
      res.json(groups);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        res.status(503).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Failed to search groups',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  /**
   * @swagger
   * /api/groups:
   *   post:
   *     summary: Create a new WhatsApp group
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - participants
   *             properties:
   *               name:
   *                 type: string
   *                 description: The name of the group to create
   *               participants:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of phone numbers to add to the group
   *     responses:
   *       200:
   *         description: Group created successfully
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Server error
   */
  router.post('/groups', async (req: Request, res: Response) => {
    try {
      const { name, participants } = req.body;

      if (!name || !participants || !Array.isArray(participants)) {
        res.status(400).json({ error: 'Name and array of participants are required' });
        return;
      }

      const result = await whatsappService.createGroup(name, participants);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready')) {
        res.status(503).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Failed to create group',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  /**
   * @swagger
   * /api/groups/{groupId}/messages:
   *   get:
   *     summary: Get messages from a specific group
   *     parameters:
   *       - in: path
   *         name: groupId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the group to get messages from
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: The number of messages to get (default: 10)
   *     responses:
   *       200:
   *         description: Returns messages from the specified group
   *       404:
   *         description: Group not found
   *       500:
   *         description: Server error
   */
  router.get('/groups/:groupId/messages', async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId;
      const limit = parseInt(req.query.limit as string) || 10;

      const messages = await whatsappService.getGroupMessages(groupId, limit);
      res.json(messages);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not ready')) {
          res.status(503).json({ error: error.message });
        } else if (error.message.includes('not found') || error.message.includes('invalid chat')) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({
            error: 'Failed to fetch group messages',
            details: error.message,
          });
        }
      } else {
        res.status(500).json({
          error: 'Failed to fetch group messages',
          details: String(error),
        });
      }
    }
  });

  /**
   * @swagger
   * /api/groups/{groupId}/participants/add:
   *   post:
   *     summary: Add participants to a WhatsApp group
   *     parameters:
   *       - in: path
   *         name: groupId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the group to add participants to
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - participants
   *             properties:
   *               participants:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of phone numbers to add to the group
   *     responses:
   *       200:
   *         description: Participants added successfully
   *       400:
   *         description: Invalid request parameters
   *       404:
   *         description: Group not found
   *       500:
   *         description: Server error
   */
  router.post('/groups/:groupId/participants/add', async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId;
      const { participants } = req.body;

      if (!participants || !Array.isArray(participants)) {
        res.status(400).json({ error: 'Array of participants is required' });
        return;
      }

      const result = await whatsappService.addParticipantsToGroup(groupId, participants);
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not ready')) {
          res.status(503).json({ error: error.message });
        } else if (
          error.message.includes('not found') ||
          error.message.includes('not a group chat')
        ) {
          res.status(404).json({ error: error.message });
        } else if (error.message.includes('not supported')) {
          res.status(501).json({ error: error.message });
        } else {
          res.status(500).json({
            error: 'Failed to add participants to group',
            details: error.message,
          });
        }
      } else {
        res.status(500).json({
          error: 'Failed to add participants to group',
          details: String(error),
        });
      }
    }
  });

  /**
   * @swagger
   * /api/groups/{groupId}/send:
   *   post:
   *     summary: Send a message to a WhatsApp group
   *     parameters:
   *       - in: path
   *         name: groupId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the group to send the message to
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - message
   *             properties:
   *               message:
   *                 type: string
   *                 description: The message content to send
   *     responses:
   *       200:
   *         description: Message sent successfully
   *       404:
   *         description: Group not found
   *       500:
   *         description: Server error
   */
  router.post('/groups/:groupId/send', async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId;
      const { message } = req.body;

      if (!groupId || !message) {
        res.status(400).json({ error: 'Group ID and message are required' });
        return;
      }

      const result = await whatsappService.sendGroupMessage(groupId, message);
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not ready')) {
          res.status(503).json({ error: error.message });
        } else if (error.message.includes('not found') || error.message.includes('invalid chat')) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({
            error: 'Failed to send group message',
            details: error.message,
          });
        }
      } else {
        res.status(500).json({
          error: 'Failed to send group message',
          details: String(error),
        });
      }
    }
  });

  return router;
}
