import { routerFactory } from '../../src/api';
import { Client, ClientInfo } from 'whatsapp-web.js';
import express from 'express';
import request from 'supertest';
import { WhatsAppService } from '../../src/whatsapp-service';

// Mock dependencies
jest.mock('../../src/whatsapp-service');

describe('API Router', () => {
  let app: express.Application;
  let mockClient: Client;
  let mockWhatsAppService: jest.Mocked<WhatsAppService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a mock client
    mockClient = {} as Client;

    // Setup the mock WhatsApp service
    mockWhatsAppService = {
      getStatus: jest.fn(),
      getContacts: jest.fn(),
      searchContacts: jest.fn(),
      getMessages: jest.fn(),
      getChats: jest.fn(),
      getUserName: jest.fn(),
      sendMessage: jest.fn(),
      createGroup: jest.fn(),
      getGroups: jest.fn(),
      addParticipantsToGroup: jest.fn(),
      getGroupMessages: jest.fn(),
      sendGroupMessage: jest.fn(),
      searchGroups: jest.fn(),
      getGroupById: jest.fn(),
      downloadMediaFromMessage: jest.fn(),
      sendMediaMessage: jest.fn(),
    } as unknown as jest.Mocked<WhatsAppService>;
    (WhatsAppService as jest.Mock).mockReturnValue(mockWhatsAppService);

    // Create an Express app and use the router
    app = express();
    app.use(express.json());
    app.use('/api', routerFactory(mockClient));
  });

  describe('GET /api/status', () => {
    it('should return status when successful', async () => {
      // Setup mock response
      const mockStatus = {
        status: 'connected',
        info: {} as ClientInfo,
      };
      mockWhatsAppService.getStatus.mockResolvedValue(mockStatus);

      // Make request
      const response = await request(app).get('/api/status');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
      expect(mockWhatsAppService.getStatus).toHaveBeenCalled();
    });

    it('should return 500 when there is an error', async () => {
      // Setup mock error
      mockWhatsAppService.getStatus.mockRejectedValue(new Error('Test error'));

      // Make request
      const response = await request(app).get('/api/status');

      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.getStatus).toHaveBeenCalled();
    });
  });

  describe('GET /api/contacts', () => {
    it('should return contacts when successful', async () => {
      // Setup mock response
      const mockContacts = [{ name: 'Test Contact', number: '123456789' }];
      mockWhatsAppService.getContacts.mockResolvedValue(mockContacts);

      // Make request
      const response = await request(app).get('/api/contacts');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContacts);
      expect(mockWhatsAppService.getContacts).toHaveBeenCalled();
    });

    it('should return 503 when client is not ready', async () => {
      // Setup mock error for not ready
      const notReadyError = new Error('Client is not ready');
      mockWhatsAppService.getContacts.mockRejectedValue(notReadyError);

      // Make request
      const response = await request(app).get('/api/contacts');

      // Assertions
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.getContacts).toHaveBeenCalled();
    });

    it('should return 500 for other errors', async () => {
      // Setup mock error
      mockWhatsAppService.getContacts.mockRejectedValue(new Error('Other error'));

      // Make request
      const response = await request(app).get('/api/contacts');

      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.getContacts).toHaveBeenCalled();
    });
  });

  describe('GET /api/groups', () => {
    it('should return groups when successful', async () => {
      // Setup mock response
      const mockGroups = [
        {
          id: 'group1@g.us',
          name: 'Test Group',
          description: 'A test group',
          participants: [
            { id: '1234567890@c.us', number: '1234567890', isAdmin: true },
            { id: '0987654321@c.us', number: '0987654321', isAdmin: false },
          ],
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      ];
      mockWhatsAppService.getGroups.mockResolvedValue(mockGroups);

      // Make request
      const response = await request(app).get('/api/groups');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGroups);
      expect(mockWhatsAppService.getGroups).toHaveBeenCalled();
    });

    it('should return 503 when client is not ready', async () => {
      // Setup mock error for not ready
      const notReadyError = new Error('WhatsApp client not ready');
      mockWhatsAppService.getGroups.mockRejectedValue(notReadyError);

      // Make request
      const response = await request(app).get('/api/groups');

      // Assertions
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.getGroups).toHaveBeenCalled();
    });

    it('should return 500 for other errors', async () => {
      // Setup mock error
      mockWhatsAppService.getGroups.mockRejectedValue(new Error('Other error'));

      // Make request
      const response = await request(app).get('/api/groups');

      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.getGroups).toHaveBeenCalled();
    });
  });

  describe('GET /api/groups/search', () => {
    it('should return matching groups when successful', async () => {
      // Setup mock response
      const mockGroups = [
        {
          id: 'group1@g.us',
          name: 'Test Group',
          description: 'A test group',
          participants: [],
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      ];
      mockWhatsAppService.searchGroups.mockResolvedValue(mockGroups);

      // Make request
      const response = await request(app).get('/api/groups/search?query=test');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGroups);
      expect(mockWhatsAppService.searchGroups).toHaveBeenCalledWith('test');
    });

    it('should return 400 when query is missing', async () => {
      // Make request without query
      const response = await request(app).get('/api/groups/search');

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.searchGroups).not.toHaveBeenCalled();
    });

    it('should return 503 when client is not ready', async () => {
      // Setup mock error for not ready
      const notReadyError = new Error('WhatsApp client not ready');
      mockWhatsAppService.searchGroups.mockRejectedValue(notReadyError);

      // Make request
      const response = await request(app).get('/api/groups/search?query=test');

      // Assertions
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.searchGroups).toHaveBeenCalled();
    });
  });

  describe('POST /api/groups/create', () => {
    it('should create a group when successful', async () => {
      // Setup mock response
      const mockResult = {
        groupId: 'group1@g.us',
        inviteCode: 'abc123',
      };
      mockWhatsAppService.createGroup.mockResolvedValue(mockResult);

      // Make request
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: 'New Group',
          participants: ['1234567890', '0987654321'],
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockWhatsAppService.createGroup).toHaveBeenCalledWith('New Group', [
        '1234567890',
        '0987654321',
      ]);
    });

    it('should return 400 when required params are missing', async () => {
      // Make request with missing name
      const response = await request(app).post('/api/groups').send({
        participants: ['1234567890'],
      });

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.createGroup).not.toHaveBeenCalled();
    });

    it('should return 503 when client is not ready', async () => {
      // Setup mock error for not ready
      const notReadyError = new Error('WhatsApp client not ready');
      mockWhatsAppService.createGroup.mockRejectedValue(notReadyError);

      // Make request
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: 'New Group',
          participants: ['1234567890'],
        });

      // Assertions
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.createGroup).toHaveBeenCalled();
    });
  });

  describe('GET /api/groups/:groupId/messages', () => {
    it('should return group messages when successful', async () => {
      // Setup mock response
      const mockMessages = [
        {
          id: 'msg1',
          body: 'Hello group',
          fromMe: true,
          timestamp: '2023-01-01T00:00:00.000Z',
          type: 'chat',
        },
      ];
      mockWhatsAppService.getGroupMessages.mockResolvedValue(mockMessages);

      // Make request
      const response = await request(app).get('/api/groups/123456789@g.us/messages?limit=10');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMessages);
      expect(mockWhatsAppService.getGroupMessages).toHaveBeenCalledWith('123456789@g.us', 10);
    });

    it('should return 404 when group is not found', async () => {
      // Setup mock error for not found
      const notFoundError = new Error('Chat not found');
      mockWhatsAppService.getGroupMessages.mockRejectedValue(notFoundError);

      // Make request
      const response = await request(app).get('/api/groups/123456789@g.us/messages');

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.getGroupMessages).toHaveBeenCalled();
    });
  });

  describe('POST /api/groups/:groupId/participants/add', () => {
    it('should add participants to a group when successful', async () => {
      // Setup mock response
      const mockResult = {
        success: true,
        added: ['1234567890', '0987654321'],
      };
      mockWhatsAppService.addParticipantsToGroup.mockResolvedValue(mockResult);

      // Make request
      const response = await request(app)
        .post('/api/groups/123456789@g.us/participants/add')
        .send({
          participants: ['1234567890', '0987654321'],
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockWhatsAppService.addParticipantsToGroup).toHaveBeenCalledWith('123456789@g.us', [
        '1234567890',
        '0987654321',
      ]);
    });

    it('should return 400 when required params are missing', async () => {
      // Make request with missing participants
      const response = await request(app).post('/api/groups/123456789@g.us/participants/add').send({});

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.addParticipantsToGroup).not.toHaveBeenCalled();
    });

    it('should return 501 when feature is not supported', async () => {
      // Setup mock error for not supported
      const notSupportedError = new Error('Adding participants is not supported in the current version');
      mockWhatsAppService.addParticipantsToGroup.mockRejectedValue(notSupportedError);

      // Make request
      const response = await request(app)
        .post('/api/groups/123456789@g.us/participants/add')
        .send({
          participants: ['1234567890'],
        });

      // Assertions
      expect(response.status).toBe(501);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.addParticipantsToGroup).toHaveBeenCalled();
    });
  });

  describe('POST /api/groups/send', () => {
    it('should send a message to a group when successful', async () => {
      // Setup mock response
      const mockResult = {
        messageId: 'msg123',
      };
      mockWhatsAppService.sendGroupMessage.mockResolvedValue(mockResult);

      // Make request
      const response = await request(app)
        .post('/api/groups/123456789@g.us/send')
        .send({
          message: 'Hello group!',
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockWhatsAppService.sendGroupMessage).toHaveBeenCalledWith(
        '123456789@g.us',
        'Hello group!'
      );
    });

    it('should return 400 when required params are missing', async () => {
      // Make request with missing message
      const response = await request(app).post('/api/groups/123456789@g.us/send').send({});

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.sendGroupMessage).not.toHaveBeenCalled();
    });

    it('should return 404 when group is not found', async () => {
      // Setup mock error for not found
      const notFoundError = new Error('Chat not found');
      mockWhatsAppService.sendGroupMessage.mockRejectedValue(notFoundError);

      // Make request
      const response = await request(app)
        .post('/api/groups/123456789@g.us/send')
        .send({
          message: 'Hello group!',
        });

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.sendGroupMessage).toHaveBeenCalled();
    });
  });

  describe('POST /api/messages/:messageId/media/download', () => {
    it('should download media successfully', async () => {
      // Setup mock response
      const mockMediaInfo = {
        filePath: '/absolute/path/to/media.jpeg',
        mimetype: 'image/jpeg',
        filename: 'media.jpeg',
        filesize: 12345,
        messageId: 'test-message-id-serialized',
      };
      mockWhatsAppService.downloadMediaFromMessage.mockResolvedValue(mockMediaInfo);

      // Make request
      const response = await request(app).post('/api/messages/test-message-id-serialized/media/download');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMediaInfo);
      expect(mockWhatsAppService.downloadMediaFromMessage).toHaveBeenCalledWith(
        'test-message-id-serialized',
        expect.any(String) // mediaStoragePath
      );
    });

    it('should return 400 when messageId is not provided', async () => {
      // This test is for completeness, but it should never happen in practice
      // due to Express routing
      mockWhatsAppService.downloadMediaFromMessage.mockImplementation(async (messageId) => {
        if (!messageId) {
          throw new Error('Message ID is required');
        }
        return {} as any;
      });

      // Make request with empty messageId (this is a test edge case)
      const response = await request(app).post('/api/messages//media/download');

      // Assertions
      expect(response.status).toBe(404); // Express will return 404 for this route
    });

    it('should return 503 when WhatsApp client is not ready', async () => {
      // Setup mock error
      mockWhatsAppService.downloadMediaFromMessage.mockRejectedValue(
        new Error('WhatsApp client not ready. Please try again later.')
      );

      // Make request
      const response = await request(app).post('/api/messages/test-message-id/media/download');

      // Assertions
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not ready');
    });

    it('should return 404 when message is not found', async () => {
      // Setup mock error
      mockWhatsAppService.downloadMediaFromMessage.mockRejectedValue(
        new Error('Message with ID test-message-id not found')
      );

      // Make request
      const response = await request(app).post('/api/messages/test-message-id/media/download');

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 when message does not contain media', async () => {
      // Setup mock error
      mockWhatsAppService.downloadMediaFromMessage.mockRejectedValue(
        new Error('Message with ID test-message-id does not contain media')
      );

      // Make request
      const response = await request(app).post('/api/messages/test-message-id/media/download');

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('does not contain media');
    });

    it('should return 500 when there is an unexpected error', async () => {
      // Setup mock error
      mockWhatsAppService.downloadMediaFromMessage.mockRejectedValue(
        new Error('Unexpected error')
      );

      // Make request
      const response = await request(app).post('/api/messages/test-message-id/media/download');

      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to download media');
    });
  });

  describe('POST /api/send/media', () => {
    it('should send media message successfully', async () => {
      const mockResult = {
        messageId: 'msg123',
        mediaInfo: {
          mimetype: 'image/jpeg',
          filename: 'test.jpg',
          size: 12345
        }
      };
      mockWhatsAppService.sendMediaMessage.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/send/media')
        .send({
          number: '1234567890',
          source: 'https://example.com/image.jpg',
          caption: 'Test caption'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockWhatsAppService.sendMediaMessage).toHaveBeenCalledWith({
        number: '1234567890',
        source: 'https://example.com/image.jpg',
        caption: 'Test caption'
      });
    });

    it('should handle missing required parameters', async () => {
      const response = await request(app)
        .post('/api/send/media')
        .send({
          number: '1234567890',
          // missing source
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.sendMediaMessage).not.toHaveBeenCalled();
    });

    it('should handle invalid source format', async () => {
      mockWhatsAppService.sendMediaMessage.mockRejectedValue(new Error('Invalid source format'));

      const response = await request(app)
        .post('/api/send/media')
        .send({
          number: '1234567890',
          source: 'invalid-format-without-scheme'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.sendMediaMessage).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockWhatsAppService.sendMediaMessage.mockRejectedValue(new Error('Failed to send media'));

      const response = await request(app)
        .post('/api/send/media')
        .send({
          number: '1234567890',
          source: 'https://example.com/image.jpg'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(mockWhatsAppService.sendMediaMessage).toHaveBeenCalled();
    });

    it('should handle client not ready error', async () => {
      mockWhatsAppService.sendMediaMessage.mockRejectedValue(new Error('WhatsApp client not ready'));

      const response = await request(app)
        .post('/api/send/media')
        .send({
          number: '1234567890',
          source: 'https://example.com/image.jpg'
        });

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not ready');
    });
  });
});
