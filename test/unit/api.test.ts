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
});
