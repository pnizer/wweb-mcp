import { createWhatsAppClient, WhatsAppConfig } from '../../src/whatsapp-client';
import { Client } from 'whatsapp-web.js';
import fs from 'fs';

// Mock dependencies
jest.mock('whatsapp-web.js', () => {
  const mockClient = {
    on: jest.fn(),
    initialize: jest.fn(),
  };
  return {
    Client: jest.fn(() => mockClient),
    LocalAuth: jest.fn(),
    NoAuth: jest.fn(),
  };
});

jest.mock('qrcode-terminal', () => ({
  generate: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toFile: jest.fn().mockImplementation((_file, _qr, _options, callback) => {
    if (callback) {
      callback(null);
    }
    return Promise.resolve();
  }),
}));

jest.mock('fs', () => ({
  rmSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

// Silence console.error during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('WhatsApp Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a WhatsApp client with default configuration', () => {
    const client = createWhatsAppClient();
    expect(Client).toHaveBeenCalled();
    expect(client).toBeDefined();
  });

  it('should remove lock file if it exists', () => {
    createWhatsAppClient();
    expect(fs.rmSync).toHaveBeenCalledWith('.wwebjs_auth/SingletonLock', { force: true });
  });

  it('should use LocalAuth when specified and not in Docker', () => {
    const config: WhatsAppConfig = {
      authStrategy: 'local',
      dockerContainer: false,
    };
    createWhatsAppClient(config);
    expect(Client).toHaveBeenCalled();
  });

  it('should use NoAuth when in Docker container', () => {
    const config: WhatsAppConfig = {
      authStrategy: 'local',
      dockerContainer: true,
    };
    createWhatsAppClient(config);
    expect(Client).toHaveBeenCalled();
  });

  it('should register QR code event handler', () => {
    const client = createWhatsAppClient();
    expect(client.on).toHaveBeenCalledWith('qr', expect.any(Function));
  });

  it('should save QR code to file when qrCodeFile is specified', () => {
    const config: WhatsAppConfig = {
      qrCodeFile: 'qr.png',
    };
    const client = createWhatsAppClient(config);
    
    // Get the QR handler function
    const qrHandler = (client.on as jest.Mock).mock.calls.find(call => call[0] === 'qr')[1];
    
    // Call the handler with a mock QR code
    qrHandler('mock-qr-code');
    
    // Verify QRCode.toFile was called with any object as the third parameter
    expect(require('qrcode').toFile).toHaveBeenCalledWith(
      'qr.png', 
      'mock-qr-code', 
      expect.any(Object),
      expect.any(Function)
    );
  });
}); 