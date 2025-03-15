"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWhatsAppClient = createWhatsAppClient;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const qrcode_1 = __importDefault(require("qrcode"));
const fs_1 = __importDefault(require("fs"));
function createWhatsAppClient(config = {}) {
    const authDataPath = config.authDataPath || '.wwebjs_auth';
    // remove Chrome lock file if it exists
    try {
        fs_1.default.rmSync(authDataPath + '/SingletonLock', { force: true });
    }
    catch (error) {
        // Ignore if file doesn't exist
    }
    const npx_args = { headless: true };
    const docker_args = {
        headless: true,
        userDataDir: authDataPath,
        args: ["--no-sandbox", "--single-process", "--no-zygote"]
    };
    const authStrategy = config.authStrategy === 'local' && !config.dockerContainer
        ? new whatsapp_web_js_1.LocalAuth({
            dataPath: authDataPath
        })
        : new whatsapp_web_js_1.NoAuth();
    console.error('authStrategy', authStrategy);
    const puppeteer = config.dockerContainer ? docker_args : npx_args;
    console.error('puppeteer', puppeteer);
    const client = new whatsapp_web_js_1.Client({
        puppeteer,
        authStrategy,
        restartOnAuthFail: true
    });
    // Generate QR code when needed
    client.on('qr', (qr) => {
        // If filename is provided, save QR code to file
        if (config.qrCodeFile) {
            qrcode_1.default.toFile(config.qrCodeFile, qr, {
                errorCorrectionLevel: 'H',
                type: 'png',
            }, (err) => {
                if (err) {
                    console.error('Failed to save QR code to file:', err);
                }
                else {
                    console.error(`QR code saved to file: ${config.qrCodeFile}`);
                }
            });
        }
        else {
            qrcode_terminal_1.default.generate(qr, { small: true }, (qrcode) => {
                console.error(qrcode);
            });
            console.error('QR code generated. Scan it with your phone to log in.');
        }
    });
    // Handle ready event
    client.on('ready', async () => {
        console.error('Client is ready!');
    });
    // Handle authenticated event
    client.on('authenticated', () => {
        console.error('Authentication successful!');
    });
    // Handle auth failure event
    client.on('auth_failure', (msg) => {
        console.error('Authentication failed:', msg);
    });
    // Handle disconnected event
    client.on('disconnected', (reason) => {
        console.error('Client was disconnected:', reason);
    });
    // Handle incoming messages
    client.on('message', async (message) => {
        const contact = await message.getContact();
        console.error(`${contact.pushname} (${contact.number}): ${message.body}`);
    });
    return client;
}
//# sourceMappingURL=whatsapp-client.js.map