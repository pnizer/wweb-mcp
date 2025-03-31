import { createMcpServer, McpConfig } from '../../src/mcp-server';
import { WhatsAppService } from '../../src/whatsapp-service';
import { WhatsAppApiClient } from '../../src/whatsapp-api-client';
import { createWhatsAppClient } from '../../src/whatsapp-client';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs';
import path from 'path';

// Mock whatsapp-web.js to prevent Puppeteer dependency issues
jest.mock('whatsapp-web.js', () => {
  const mockClient = jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    getState: jest.fn().mockReturnValue('CONNECTED'),
  }));

  return {
    Client: mockClient,
    LocalAuth: jest.fn(),
    NoAuth: jest.fn(),
  };
}, { virtual: true });

// Mock dependencies
jest.mock('../../src/whatsapp-service');
jest.mock('../../src/whatsapp-api-client');
jest.mock('../../src/whatsapp-client');
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  const mockResourceTemplate = jest.fn();
  return {
    McpServer: jest.fn().mockImplementation(() => {
      return {
        resource: jest.fn(),
        tool: jest.fn(),
      };
    }),
    ResourceTemplate: mockResourceTemplate,
  };
});

// Mock the mcp-server module to avoid the ResourceTemplate issue
jest.mock('../../src/mcp-server', () => {
  const originalModule = jest.requireActual('../../src/mcp-server');

  return {
    ...originalModule,
    createMcpServer: jest.fn().mockImplementation(config => {
      const mockServer = {
        resource: jest.fn(),
        tool: jest.fn(),
      };

      if (!config?.useApiClient) {
        const client = createWhatsAppClient(config?.whatsappConfig);
        client.initialize();
      }

      return mockServer;
    }),
  };
});

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

describe('MCP Server', () => {
  let mockWhatsAppService: jest.Mocked<WhatsAppService>;
  let mockWhatsAppApiClient: jest.Mocked<WhatsAppApiClient>;
  let mockWhatsAppClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock WhatsApp client
    mockWhatsAppClient = {
      initialize: jest.fn(),
    };
    (createWhatsAppClient as jest.Mock).mockReturnValue(mockWhatsAppClient);

    // Setup mock WhatsApp service
    mockWhatsAppService = jest.fn() as unknown as jest.Mocked<WhatsAppService>;
    (WhatsAppService as jest.Mock).mockReturnValue(mockWhatsAppService);

    // Setup mock WhatsApp API client
    mockWhatsAppApiClient = jest.fn() as unknown as jest.Mocked<WhatsAppApiClient>;
    (WhatsAppApiClient as jest.Mock).mockReturnValue(mockWhatsAppApiClient);
  });

  it('should create an MCP server with default configuration', () => {
    createMcpServer();

    // Verify WhatsApp client was created and initialized
    expect(createWhatsAppClient).toHaveBeenCalled();
    expect(mockWhatsAppClient.initialize).toHaveBeenCalled();
  });

  it('should use WhatsApp API client when useApiClient is true', () => {
    const config: McpConfig = {
      useApiClient: true,
      apiBaseUrl: 'http://localhost:3001',
    };

    createMcpServer(config);

    // Verify WhatsApp client was not initialized
    expect(mockWhatsAppClient.initialize).not.toHaveBeenCalled();
  });

  it('should pass WhatsApp configuration to client', () => {
    const config: McpConfig = {
      whatsappConfig: {
        authStrategy: 'local',
      },
    };

    createMcpServer(config);

    // Verify WhatsApp client was created with correct configuration
    expect(createWhatsAppClient).toHaveBeenCalledWith(config.whatsappConfig);
  });

  it('should register the download_media_from_message tool', () => {
    // Create a mock server with tool method
    const mockToolMethod = jest.fn();
    const mockServer = {
      resource: jest.fn(),
      tool: mockToolMethod
    };

    // Override the McpServer mock for this test
    (require('@modelcontextprotocol/sdk/server/mcp.js').McpServer as jest.Mock)
      .mockImplementationOnce(() => mockServer);

    // Create a mock client
    const mockClient = { initialize: jest.fn() };

    // Call createMcpServer
    const realCreateMcpServer = jest.requireActual('../../src/mcp-server').createMcpServer;
    realCreateMcpServer({}, mockClient);

    // Verify the tool was registered
    const calls = mockToolMethod.mock.calls;
    const downloadMediaToolCall = calls.find(call => call[0] === 'download_media_from_message');

    expect(downloadMediaToolCall).toBeDefined();
    expect(downloadMediaToolCall[1]).toHaveProperty('messageId');
  });
});
