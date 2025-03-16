import { WhatsAppService, timestampToIso } from '../../src/whatsapp-service';
import { Client, Contact, ClientInfo } from 'whatsapp-web.js';

describe('WhatsApp Service', () => {
  let mockClient: any;
  let service: WhatsAppService;

  beforeEach(() => {
    // Create a mock client
    mockClient = {
      info: {
        wid: { server: 'c.us', user: '1234567890' },
        pushname: 'Test User',
        me: { id: { server: 'c.us', user: '1234567890' } },
        phone: { device_manufacturer: 'Test', device_model: 'Test', os_build_number: 'Test', os_version: 'Test', wa_version: 'Test' },
        platform: 'test',
        getBatteryStatus: jest.fn().mockResolvedValue({ battery: 100, plugged: true }),
      },
      getContacts: jest.fn(),
      searchContacts: jest.fn(),
      getChats: jest.fn(),
      getChatById: jest.fn(),
      sendMessage: jest.fn(),
    };

    service = new WhatsAppService(mockClient as Client);
  });

  describe('timestampToIso', () => {
    it('should convert Unix timestamp to ISO string', () => {
      // Use a specific date with timezone offset to match the expected output
      const timestamp = 1615000000; // March 6, 2021
      const isoString = timestampToIso(timestamp);
      // Use a more flexible assertion that doesn't depend on timezone
      expect(new Date(isoString).getTime()).toBe(timestamp * 1000);
    });
  });

  describe('getStatus', () => {
    it('should return connected status when client info exists', async () => {
      const status = await service.getStatus();
      expect(status).toEqual({
        status: 'connected',
        info: mockClient.info,
      });
    });

    it('should return disconnected status when client info does not exist', async () => {
      mockClient.info = undefined;
      const status = await service.getStatus();
      expect(status).toEqual({
        status: 'disconnected',
        info: undefined,
      });
    });

    it('should throw error when client throws error', async () => {
      // Mock implementation to throw error
      Object.defineProperty(mockClient, 'info', {
        get: () => { throw new Error('Test error'); }
      });

      await expect(service.getStatus()).rejects.toThrow('Failed to get client status');
    });
  });

  describe('getContacts', () => {
    it('should return filtered contacts', async () => {
      // Mock contacts
      const mockContacts = [
        {
          id: { server: 'c.us', user: '1234567890' },
          pushname: 'Contact 1',
          number: '1234567890',
          isUser: true,
          isMe: false,
        },
        {
          id: { server: 'c.us', user: '0987654321' },
          pushname: 'Contact 2',
          number: '0987654321',
          isUser: true,
          isMe: false,
        },
        {
          id: { server: 'c.us', user: 'me' },
          pushname: 'Me',
          number: 'me',
          isUser: true,
          isMe: true, // This should be filtered out
        },
        {
          id: { server: 'g.us', user: 'group' },
          pushname: 'Group',
          number: 'group',
          isUser: false, // This should be filtered out
          isMe: false,
        },
      ] as unknown as Contact[];

      mockClient.getContacts.mockResolvedValue(mockContacts);

      const contacts = await service.getContacts();
      expect(contacts).toHaveLength(2);
      expect(contacts[0]).toEqual({
        name: 'Contact 1',
        number: '1234567890',
      });
      expect(contacts[1]).toEqual({
        name: 'Contact 2',
        number: '0987654321',
      });
    });

    it('should throw error when client is not ready', async () => {
      mockClient.info = undefined;
      await expect(service.getContacts()).rejects.toThrow('WhatsApp client not ready');
    });

    it('should throw error when client throws error', async () => {
      mockClient.getContacts.mockRejectedValue(new Error('Test error'));
      await expect(service.getContacts()).rejects.toThrow('Failed to fetch contacts');
    });
  });
}); 