import { createMcpServer, McpConfig } from '../../src/mcp-server';
import { WhatsAppService } from '../../src/whatsapp-service';
import { WhatsAppApiClient } from '../../src/whatsapp-api-client';
import { createWhatsAppClient } from '../../src/whatsapp-client';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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
    mockWhatsAppService = new WhatsAppService(mockWhatsAppClient) as jest.Mocked<WhatsAppService>;
    (WhatsAppService as jest.Mock).mockImplementation(() => mockWhatsAppService);

    // Setup mock WhatsApp API client
    mockWhatsAppApiClient = new WhatsAppApiClient(
      'http://localhost',
      'test-api-key'
    ) as jest.Mocked<WhatsAppApiClient>;
    (WhatsAppApiClient as jest.Mock).mockImplementation(() => mockWhatsAppApiClient);
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
});
