import { Client, LocalAuth, Message, NoAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';

export function createWhatsAppClient(qrCodeFileName: string | undefined = undefined) {
    // remove Chrome lock file if it exists
    fs.rmSync(process.env.AUTH_DATA_PATH + '/SingletonLock', { force: true });

    const npx_args = { headless: true }
    const docker_args = { 
        headless: true,
        userDataDir: process.env.AUTH_DATA_PATH || '.wwebjs_auth',
        args: ["--no-sandbox", "--single-process", "--no-zygote"] 
    }

    const authStrategy = process.env.AUTH_STRATEGY === 'local' && process.env.DOCKER_CONTAINER !== 'true'
    ? new LocalAuth({
        dataPath: process.env.AUTH_DATA_PATH || '.wwebjs_auth'
      })
    : new NoAuth();
    
    console.error('authStrategy', authStrategy);
    const puppeteer = process.env.DOCKER_CONTAINER ? docker_args : npx_args;
    console.error('puppeteer', puppeteer);

  const client = new Client({
    puppeteer,
    authStrategy,
    restartOnAuthFail: true
  });

  // Generate QR code when needed
  client.on('qr', (qr: string) => {
    // If filename is provided, save QR code to file
    if (qrCodeFileName) {
      QRCode.toFile(qrCodeFileName, qr, {
        errorCorrectionLevel: 'H',
        type: 'png',
      }, (err) => {
        if (err) {
          console.error('Failed to save QR code to file:', err);
        } else {
          console.error(`QR code saved to file: ${qrCodeFileName}`);
        }
      });
    } else {
        qrcode.generate(qr, { small: true }, (qrcode) => {
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
  client.on('auth_failure', (msg: string) => {
    console.error('Authentication failed:', msg);
  });

  // Handle disconnected event
  client.on('disconnected', (reason: string) => {
    console.error('Client was disconnected:', reason);
  });

  // Handle incoming messages
  client.on('message', async (message: Message) => {
    const contact = await message.getContact();
    console.error(`${contact.pushname} (${contact.number}): ${message.body}`);
  });

  return client;
} 