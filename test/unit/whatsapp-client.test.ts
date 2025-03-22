import { createWhatsAppClient, WhatsAppConfig } from '../../src/whatsapp-client';
import { Client, LocalAuth, NoAuth } from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 12345 }),
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  rmSync: jest.fn(),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn(path => `/absolute${path}`),
}));

// Mock whatsapp-web.js Client
jest.mock('whatsapp-web.js', () => {
  const mockLocalAuth = jest.fn();
  const mockNoAuth = jest.fn();
  const mockClient = jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    getState: jest.fn().mockReturnValue('CONNECTED'),
  }));

  return {
    Client: mockClient,
    LocalAuth: mockLocalAuth,
    NoAuth: mockNoAuth,
  };
});

jest.mock('qrcode-terminal', () => ({
  generate: jest.fn(),
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

  it('should display QR code in terminal', () => {
    const client = createWhatsAppClient();

    // Get the QR handler function
    const qrHandler = (client.on as jest.Mock).mock.calls.find(call => call[0] === 'qr')[1];

    // Call the handler with a mock QR code
    qrHandler('mock-qr-code');

    // Verify qrcode-terminal.generate was called
    expect(require('qrcode-terminal').generate).toHaveBeenCalledWith(
      'mock-qr-code',
      expect.any(Object),
      expect.any(Function),
    );
  });
});
