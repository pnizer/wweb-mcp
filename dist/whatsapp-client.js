"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWhatsAppClient = createWhatsAppClient;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const logger_1 = __importDefault(require("./logger"));
const fs_1 = __importDefault(require("fs"));
function createWhatsAppClient(config = {}) {
    const authDataPath = config.authDataPath || '.wwebjs_auth';
    // remove Chrome lock file if it exists
    try {
        fs_1.default.rmSync(authDataPath + '/SingletonLock', { force: true });
    }
    catch {
        // Ignore if file doesn't exist
    }
    const npx_args = { headless: true };
    const docker_args = {
        headless: true,
        userDataDir: authDataPath,
        args: ['--no-sandbox', '--single-process', '--no-zygote'],
    };
    const authStrategy = config.authStrategy === 'local' && !config.dockerContainer
        ? new whatsapp_web_js_1.LocalAuth({
            dataPath: authDataPath,
        })
        : new whatsapp_web_js_1.NoAuth();
    const puppeteer = config.dockerContainer ? docker_args : npx_args;
    const client = new whatsapp_web_js_1.Client({
        puppeteer,
        authStrategy,
        restartOnAuthFail: true,
    });
    // Generate QR code when needed
    client.on('qr', (qr) => {
        // Display QR code in terminal
        qrcode_terminal_1.default.generate(qr, { small: true }, qrcode => {
            logger_1.default.info(`QR code generated. Scan it with your phone to log in.\n${qrcode}`);
        });
    });
    // Handle ready event
    client.on('ready', async () => {
        logger_1.default.info('Client is ready!');
    });
    // Handle authenticated event
    client.on('authenticated', () => {
        logger_1.default.info('Authentication successful!');
    });
    // Handle auth failure event
    client.on('auth_failure', (msg) => {
        logger_1.default.error('Authentication failed:', msg);
    });
    // Handle disconnected event
    client.on('disconnected', (reason) => {
        logger_1.default.warn('Client was disconnected:', reason);
    });
    // Handle incoming messages
    client.on('message', async (message) => {
        const contact = await message.getContact();
        logger_1.default.debug(`${contact.pushname} (${contact.number}): ${message.body}`);
    });
    return client;
}
//# sourceMappingURL=whatsapp-client.js.map