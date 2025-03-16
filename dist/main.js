"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const logger_1 = __importStar(require("./logger"));
const middleware_1 = require("./middleware");
const api_1 = require("./api");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const isDockerContainer = process.env.DOCKER_CONTAINER === 'true';
function parseCommandLineArgs() {
    return (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
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
        description: 'Base URL for WhatsApp Web REST API when using api mode',
        type: 'string',
        default: 'http://localhost:3001/api',
    })
        .option('api-key', {
        alias: 'k',
        description: 'API key for WhatsApp Web REST API when using api mode',
        type: 'string',
        default: '',
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
function configureLogger(argv) {
    logger_1.default.level = argv['log-level'];
    // Configure logger to use stderr for all levels when in MCP command mode
    if (argv.mode === 'mcp' && argv.transport === 'command') {
        (0, logger_1.configureForCommandMode)();
    }
}
function createConfigurations(argv) {
    const whatsAppConfig = {
        authDataPath: argv['auth-data-path'],
        authStrategy: argv['auth-strategy'],
        dockerContainer: isDockerContainer,
    };
    const mcpConfig = {
        useApiClient: argv['mcp-mode'] === 'api',
        apiBaseUrl: argv['api-base-url'],
        apiKey: argv['api-key'],
        whatsappConfig: whatsAppConfig,
    };
    return { whatsAppConfig, mcpConfig };
}
async function startMcpSseServer(server, port, mode) {
    const app = (0, express_1.default)();
    app.use(middleware_1.requestLogger);
    let transport;
    app.get('/sse', async (_req, res) => {
        logger_1.default.info('Received SSE connection');
        transport = new sse_js_1.SSEServerTransport('/message', res);
        await server.connect(transport);
    });
    app.post('/message', async (req, res) => {
        await transport?.handlePostMessage(req, res);
    });
    app.use(middleware_1.errorHandler);
    app.listen(port, () => {
        logger_1.default.info(`MCP server is running on port ${port} in ${mode} mode`);
    });
}
async function startMcpCommandServer(server, mode) {
    try {
        const transport = new stdio_js_1.StdioServerTransport();
        await server.connect(transport);
        logger_1.default.info(`WhatsApp MCP server started successfully in ${mode} mode`);
        process.stdin.on('close', () => {
            logger_1.default.info('WhatsApp MCP Server closed');
            server.close();
        });
    }
    catch (error) {
        logger_1.default.error('Error connecting to MCP server', error);
    }
}
async function getWhatsAppApiKey(whatsAppConfig) {
    if (whatsAppConfig.authStrategy === 'none') {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    const authDataPath = whatsAppConfig.authDataPath;
    if (!authDataPath) {
        throw new Error('The auth-data-path is required when using whatsapp-api mode');
    }
    const apiKeyPath = path_1.default.join(authDataPath, 'api_key.txt');
    if (!fs_1.default.existsSync(apiKeyPath)) {
        const apiKey = crypto_1.default.randomBytes(32).toString('hex');
        fs_1.default.writeFileSync(apiKeyPath, apiKey);
        return apiKey;
    }
    return fs_1.default.readFileSync(apiKeyPath, 'utf8');
}
async function startWhatsAppApiServer(whatsAppConfig, port) {
    logger_1.default.info('Starting WhatsApp Web REST API...');
    const client = (0, whatsapp_client_1.createWhatsAppClient)(whatsAppConfig);
    await client.initialize();
    const apiKey = await getWhatsAppApiKey(whatsAppConfig);
    logger_1.default.info(`WhatsApp API key: ${apiKey}`);
    const app = (0, express_1.default)();
    app.use(middleware_1.requestLogger);
    app.use(express_1.default.json());
    app.use((req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        next();
    });
    app.use('/api', (0, api_1.routerFactory)(client));
    app.use(middleware_1.errorHandler);
    app.listen(port, () => {
        logger_1.default.info(`WhatsApp Web Client API started successfully on port ${port}`);
    });
    // Keep the process running
    process.on('SIGINT', async () => {
        logger_1.default.info('Shutting down WhatsApp Web Client API...');
        await client.destroy();
        process.exit(0);
    });
}
async function startMcpServer(mcpConfig, transport, port, mode) {
    let client = null;
    if (mode === 'standalone') {
        logger_1.default.info('Starting WhatsApp Web Client...');
        client = (0, whatsapp_client_1.createWhatsAppClient)(mcpConfig.whatsappConfig);
        await client.initialize();
    }
    logger_1.default.info(`Starting MCP server in ${mode} mode...`);
    logger_1.default.debug('MCP Configuration:', mcpConfig);
    const server = (0, mcp_server_1.createMcpServer)(mcpConfig, client);
    if (transport === 'sse') {
        await startMcpSseServer(server, port, mode);
    }
    else if (transport === 'command') {
        await startMcpCommandServer(server, mode);
    }
}
async function main() {
    try {
        const argv = parseCommandLineArgs();
        configureLogger(argv);
        const { whatsAppConfig, mcpConfig } = createConfigurations(argv);
        if (argv.mode === 'mcp') {
            await startMcpServer(mcpConfig, argv['transport'], argv['sse-port'], argv['mcp-mode']);
        }
        else if (argv.mode === 'whatsapp-api') {
            await startWhatsAppApiServer(whatsAppConfig, argv['api-port']);
        }
    }
    catch (error) {
        logger_1.default.error('Error starting application:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=main.js.map