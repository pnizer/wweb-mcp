import express from 'express';
import { createMcpServer, McpConfig } from './mcp-server';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createWhatsAppClient, WhatsAppConfig } from './whatsapp-client';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import logger, { configureForCommandMode } from './logger';
import { requestLogger, errorHandler } from './middleware';
import { routerFactory } from './api';
import { Client } from 'whatsapp-web.js';

const isDockerContainer = process.env.DOCKER_CONTAINER === 'true';

function parseCommandLineArgs(): ReturnType<typeof yargs.parseSync> {
  return yargs(hideBin(process.argv))
    .option('mode', {
      alias: 'm',
      description: 'Run mode: mcp or whatsapp-api',
      type: 'string',
      choices: ['mcp', 'whatsapp-api'],
      default: 'mcp',
    })
    .option('mcp-mode', {
      alias: 'c',
      description:
        'MCP connection mode: standalone (direct WhatsApp client) or api (connect to WhatsApp API)',
      type: 'string',
      choices: ['standalone', 'api'],
      default: 'standalone',
    })
    .option('transport', {
      alias: 't',
      description: 'MCP transport mode: sse or command',
      type: 'string',
      choices: ['sse', 'command'],
      default: 'sse',
    })
    .option('sse-port', {
      alias: 'p',
      description: 'Port for SSE server',
      type: 'number',
      default: 3002,
    })
    .option('api-port', {
      description: 'Port for WhatsApp API server',
      type: 'number',
      default: 3001,
    })
    .option('auth-data-path', {
      alias: 'a',
      description: 'Path to store authentication data',
      type: 'string',
      default: '.wwebjs_auth',
    })
    .option('auth-strategy', {
      alias: 's',
      description: 'Authentication strategy: local or none',
      type: 'string',
      choices: ['local', 'none'],
      default: 'local',
    })
    .option('api-base-url', {
      alias: 'b',
      description: 'API base URL for MCP when using api mode',
      type: 'string',
      default: 'http://localhost:3001/api',
    })
    .option('log-level', {
      alias: 'l',
      description: 'Log level: error, warn, info, http, debug',
      type: 'string',
      choices: ['error', 'warn', 'info', 'http', 'debug'],
      default: 'info',
    })
    .help()
    .alias('help', 'h')
    .parseSync();
}

function configureLogger(argv: ReturnType<typeof parseCommandLineArgs>): void {
  logger.level = argv['log-level'] as string;

  // Configure logger to use stderr for all levels when in MCP command mode
  if (argv.mode === 'mcp' && argv.transport === 'command') {
    configureForCommandMode();
  }
}

function createConfigurations(argv: ReturnType<typeof parseCommandLineArgs>): {
  whatsAppConfig: WhatsAppConfig;
  mcpConfig: McpConfig;
} {
  const whatsAppConfig: WhatsAppConfig = {
    authDataPath: argv['auth-data-path'] as string,
    authStrategy: argv['auth-strategy'] as 'local' | 'none',
    dockerContainer: isDockerContainer,
  };

  const mcpConfig: McpConfig = {
    useApiClient: argv['mcp-mode'] === 'api',
    apiBaseUrl: argv['api-base-url'] as string,
    whatsappConfig: whatsAppConfig,
  };

  return { whatsAppConfig, mcpConfig };
}

async function startMcpSseServer(
  server: ReturnType<typeof createMcpServer>,
  port: number,
  mode: string,
): Promise<void> {
  const app = express();
  app.use(requestLogger);

  let transport: SSEServerTransport;

  app.get('/sse', async (_req, res) => {
    logger.info('Received SSE connection');
    transport = new SSEServerTransport('/message', res);
    await server.connect(transport);
  });

  app.post('/message', async (req, res) => {
    await transport?.handlePostMessage(req, res);
  });

  app.use(errorHandler);

  app.listen(port, () => {
    logger.info(`MCP server is running on port ${port} in ${mode} mode`);
  });
}

async function startMcpCommandServer(
  server: ReturnType<typeof createMcpServer>,
  mode: string,
): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info(`WhatsApp MCP server started successfully in ${mode} mode`);

    process.stdin.on('close', () => {
      logger.info('WhatsApp MCP Server closed');
      server.close();
    });
  } catch (error) {
    logger.error('Error connecting to MCP server', error);
  }
}

async function startWhatsAppApiServer(whatsAppConfig: WhatsAppConfig, port: number): Promise<void> {
  logger.info('Starting WhatsApp Web Client API...');
  const client = createWhatsAppClient(whatsAppConfig);
  await client.initialize();

  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.use('/api', routerFactory(client));
  app.use(errorHandler);

  app.listen(port, () => {
    logger.info(`WhatsApp Web Client API started successfully on port ${port}`);
  });

  // Keep the process running
  process.on('SIGINT', async () => {
    logger.info('Shutting down WhatsApp Web Client API...');
    await client.destroy();
    process.exit(0);
  });
}

async function startMcpServer(
  mcpConfig: McpConfig,
  transport: string,
  port: number,
  mode: string,
): Promise<void> {
  let client: Client | null = null;
  if (mode === 'standalone') {
    logger.info('Starting WhatsApp Web Client API...');
    client = createWhatsAppClient(mcpConfig.whatsappConfig);
    await client.initialize();
  }

  logger.info(`Starting MCP server in ${mode} mode...`);
  logger.debug('MCP Configuration:', mcpConfig);

  const server = createMcpServer(mcpConfig, client);

  if (transport === 'sse') {
    await startMcpSseServer(server, port, mode);
  } else if (transport === 'command') {
    await startMcpCommandServer(server, mode);
  }
}

async function main(): Promise<void> {
  try {
    const argv = parseCommandLineArgs();
    configureLogger(argv);

    const { whatsAppConfig, mcpConfig } = createConfigurations(argv);

    if (argv.mode === 'mcp') {
      await startMcpServer(
        mcpConfig,
        argv['transport'] as string,
        argv['sse-port'] as number,
        argv['mcp-mode'] as string,
      );
    } else if (argv.mode === 'whatsapp-api') {
      await startWhatsAppApiServer(whatsAppConfig, argv['api-port'] as number);
    }
  } catch (error) {
    logger.error('Error starting application:', error);
    process.exit(1);
  }
}

main();
