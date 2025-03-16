"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mcp_server_1 = require("./mcp-server");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const whatsapp_client_1 = require("./whatsapp-client");
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const api_1 = require("./api");
// Check if running in Docker container based on environment variable
const isDockerContainer = process.env.DOCKER_CONTAINER === 'true';
// Define command line arguments
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .option('mode', {
    alias: 'm',
    description: 'Run mode: mcp or whatsapp-api',
    type: 'string',
    choices: ['mcp', 'whatsapp-api'],
    default: 'mcp',
})
    .option('mcp-mode', {
    alias: 'c',
    description: 'MCP connection mode: standalone (direct WhatsApp client) or api (connect to WhatsApp API)',
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
    .option('qr-code-file', {
    alias: 'q',
    description: 'File to save QR code to',
    type: 'string',
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
    .help()
    .alias('help', 'h')
    .parseSync();
// Main function to start the application
async function main() {
    try {
        // Create WhatsApp configuration from command line arguments
        const whatsAppConfig = {
            qrCodeFile: argv['qr-code-file'],
            authDataPath: argv['auth-data-path'],
            authStrategy: argv['auth-strategy'],
            dockerContainer: isDockerContainer,
        };
        // Create MCP configuration from command line arguments
        const mcpConfig = {
            qrCodeFile: argv['qr-code-file'],
            // Always eagerly initialize client
            useApiClient: argv['mcp-mode'] === 'api',
            apiBaseUrl: argv['api-base-url'],
            whatsappConfig: whatsAppConfig,
        };
        if (argv.mode === 'mcp') {
            console.error(`Starting MCP server in ${argv['mcp-mode']} mode...`);
            console.error(mcpConfig);
            // Create and start MCP server
            const server = (0, mcp_server_1.createMcpServer)(mcpConfig);
            if (argv['transport'] === 'sse') {
                const app = (0, express_1.default)();
                let transport;
                app.get('/sse', async (_req, res) => {
                    console.error('Received connection');
                    transport = new sse_js_1.SSEServerTransport('/message', res);
                    await server.connect(transport);
                });
                app.post('/message', async (req, res) => {
                    await transport?.handlePostMessage(req, res);
                });
                app.listen(argv['sse-port'], () => {
                    console.error(`MCP server is running on port ${argv['sse-port']} in ${argv['mcp-mode']} mode`);
                });
            }
            else if (argv['transport'] === 'command') {
                try {
                    const transport = new stdio_js_1.StdioServerTransport();
                    await server.connect(transport);
                    console.error(`WhatsApp MCP server started successfully in ${argv['mcp-mode']} mode`);
                }
                catch (error) {
                    console.error('Error connecting to MCP server', error);
                }
                process.stdin.on('close', () => {
                    console.error('WhatsApp MCP Server closed');
                    server.close();
                });
            }
            else {
                throw new Error(`Invalid transport mode: ${argv['transport']}`);
            }
        }
        else if (argv.mode === 'whatsapp-api') {
            // Run as WhatsApp Web Client API
            console.error('Starting WhatsApp Web Client API...');
            const client = (0, whatsapp_client_1.createWhatsAppClient)(whatsAppConfig);
            // Initialize WhatsApp client
            await client.initialize();
            const app = (0, express_1.default)();
            // Configure middleware to parse JSON request bodies
            app.use(express_1.default.json());
            app.use('/api', (0, api_1.routerFactory)(client));
            const apiPort = argv['api-port'];
            app.listen(apiPort, () => {
                console.error(`WhatsApp Web Client API started successfully on port ${apiPort}`);
            });
            // Keep the process running
            process.on('SIGINT', async () => {
                console.error('Shutting down WhatsApp Web Client API...');
                await client.destroy();
                process.exit(0);
            });
        }
        else {
            throw new Error(`Invalid mode: ${argv.mode}`);
        }
    }
    catch (error) {
        console.error('Error starting application:', error);
        process.exit(1);
    }
}
// Run the application
main();
//# sourceMappingURL=main.js.map