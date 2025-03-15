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
// Define command line arguments
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
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
async function main() {
    try {
        // Create WhatsApp configuration from command line arguments
        const whatsAppConfig = {
            qrCodeFile: argv['qr-code-file'],
            authDataPath: argv['auth-data-path'],
            authStrategy: argv['auth-strategy'],
            dockerContainer: argv['docker-container']
        };
        // Create MCP configuration from command line arguments
        const mcpConfig = {
            qrCodeFile: argv['qr-code-file'],
            eagerlyInitializeClient: argv['eagerly-initialize-client']
        };
        if (argv.mode === 'mcp') {
            // Create and start MCP server
            const server = (0, mcp_server_1.createMcpServer)(mcpConfig);
            if (argv['mcp-mode'] === 'sse') {
                const app = (0, express_1.default)();
                let transport;
                app.get("/sse", async (_req, res) => {
                    console.error("Received connection");
                    transport = new sse_js_1.SSEServerTransport("/message", res);
                    await server.connect(transport);
                });
                app.post("/message", async (req, res) => {
                    await transport?.handlePostMessage(req, res);
                });
                app.listen(argv['sse-port'], () => {
                    console.error(`MCP server is running on port ${argv['sse-port']}`);
                });
            }
            else if (argv['mcp-mode'] === 'command') {
                try {
                    const transport = new stdio_js_1.StdioServerTransport();
                    await server.connect(transport);
                    console.error('WhatsApp MCP server started successfully');
                }
                catch (error) {
                    console.error("Error connecting to MCP server", error);
                }
                process.stdin.on("close", () => {
                    console.error("Puppeteer MCP Server closed");
                    server.close();
                });
            }
            else {
                throw new Error(`Invalid MCP mode: ${argv['mcp-mode']}`);
            }
        }
        else if (argv.mode === 'api') {
            // Run as WhatsApp Web Client API
            console.error('Starting WhatsApp Web Client API...');
            const client = (0, whatsapp_client_1.createWhatsAppClient)(whatsAppConfig);
            // Initialize WhatsApp client
            await client.initialize();
            const app = (0, express_1.default)();
            // Configure middleware to parse JSON request bodies
            app.use(express_1.default.json());
            app.use('/api', (0, api_1.routerFactory)({ client }));
            app.listen(3001, () => {
                console.error('WhatsApp Web Client API started successfully');
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