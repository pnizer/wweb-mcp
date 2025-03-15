import express from 'express';
import { createMcpServer, McpConfig } from './mcp-server';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createWhatsAppClient, WhatsAppConfig } from './whatsapp-client';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { routerFactory } from './api';

// Define command line arguments
const argv = yargs(hideBin(process.argv))
  .option('mode', {
    alias: 'm',
    description: 'Run mode: mcp or api',
    type: 'string',
    choices: ['mcp', 'api'],
    default: 'mcp'
  })
  .option('mcp-mode', {
    alias: 't',
    description: 'MCP transport mode: sse or command',
    type: 'string',
    choices: ['sse', 'command'],
    default: 'sse'
  })
  .option('sse-port', {
    alias: 'p',
    description: 'Port for SSE server',
    type: 'number',
    default: 3002
  })
  .option('qr-code-file', {
    alias: 'q',
    description: 'File to save QR code to',
    type: 'string'
  })
  .option('auth-data-path', {
    alias: 'a',
    description: 'Path to store authentication data',
    type: 'string',
    default: '.wwebjs_auth'
  })
  .option('auth-strategy', {
    alias: 's',
    description: 'Authentication strategy: local or none',
    type: 'string',
    choices: ['local', 'none'],
    default: 'local'
  })
  .option('docker-container', {
    alias: 'd',
    description: 'Running in Docker container',
    type: 'boolean',
    default: false
  })
  .option('eagerly-initialize-client', {
    alias: 'e',
    description: 'Initialize WhatsApp client eagerly',
    type: 'boolean',
    default: false
  })
  .help()
  .alias('help', 'h')
  .parseSync();

// Main function to start the application
async function main(): Promise<void> {
  try {
    // Create WhatsApp configuration from command line arguments
    const whatsAppConfig: WhatsAppConfig = {
      qrCodeFile: argv['qr-code-file'] as string | undefined,
      authDataPath: argv['auth-data-path'] as string,
      authStrategy: argv['auth-strategy'] as 'local' | 'none',
      dockerContainer: argv['docker-container'] as boolean
    };

    // Create MCP configuration from command line arguments
    const mcpConfig: McpConfig = {
      qrCodeFile: argv['qr-code-file'] as string | undefined,
      eagerlyInitializeClient: argv['eagerly-initialize-client'] as boolean
    };

    if (argv.mode === 'mcp') {
      // Create and start MCP server
      const server = createMcpServer(mcpConfig);

      if (argv['mcp-mode'] === 'sse') {
        const app = express();
        let transport: SSEServerTransport;

        app.get("/sse", async (_req, res) => {
          console.error("Received connection");
          transport = new SSEServerTransport("/message", res);
          await server.connect(transport);
        });
        
        app.post("/message", async (req, res) => {
          await transport?.handlePostMessage(req, res);
        });

        app.listen(argv['sse-port'], () => {
          console.error(`MCP server is running on port ${argv['sse-port']}`);
        });
      } else if (argv['mcp-mode'] === 'command') {
        try {
          const transport = new StdioServerTransport();
          await server.connect(transport);
          console.error('WhatsApp MCP server started successfully');

        } catch (error) {
          console.error("Error connecting to MCP server", error);
        }

        process.stdin.on("close", () => {
          console.error("Puppeteer MCP Server closed");
          server.close();
        });
      } else {
        throw new Error(`Invalid MCP mode: ${argv['mcp-mode']}`);
      }
    } else if (argv.mode === 'api') {
      // Run as WhatsApp Web Client API
      console.error('Starting WhatsApp Web Client API...');
      const client = createWhatsAppClient(whatsAppConfig);

      // Initialize WhatsApp client
      await client.initialize();
      
      const app = express();
      
      // Configure middleware to parse JSON request bodies
      app.use(express.json());
      
      app.use('/api', routerFactory({client}));
      
      app.listen(3001, () => {
        console.error('WhatsApp Web Client API started successfully');
      });
      
      // Keep the process running
      process.on('SIGINT', async () => {
        console.error('Shutting down WhatsApp Web Client API...');
        await client.destroy();
        process.exit(0);
      });
    } else {
      throw new Error(`Invalid mode: ${argv.mode}`);
    }
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}

// Run the application
main();