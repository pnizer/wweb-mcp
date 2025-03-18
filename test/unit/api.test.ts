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
    mockWhatsAppService = new WhatsAppService(mockClient) as jest.Mocked<WhatsAppService>;
    (WhatsAppService as jest.Mock).mockImplementation(() => mockWhatsAppService);

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
});
