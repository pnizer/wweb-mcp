import { Client, LocalAuth, Message, NoAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import logger from './logger';
import fs from 'fs';

// Configuration interface
export interface WhatsAppConfig {
  authDataPath?: string;
  authStrategy?: 'local' | 'none';
  dockerContainer?: boolean;
}

export function createWhatsAppClient(config: WhatsAppConfig = {}): Client {
  const authDataPath = config.authDataPath || '.wwebjs_auth';

  // remove Chrome lock file if it exists
  try {
    fs.rmSync(authDataPath + '/SingletonLock', { force: true });
  } catch {
    // Ignore if file doesn't exist
  }

  const npx_args = { headless: true };
  const docker_args = {
    headless: true,
    userDataDir: authDataPath,
    args: ['--no-sandbox', '--single-process', '--no-zygote'],
  };

  const authStrategy =
    config.authStrategy === 'local' && !config.dockerContainer
      ? new LocalAuth({
          dataPath: authDataPath,
        })
      : new NoAuth();

  const puppeteer = config.dockerContainer ? docker_args : npx_args;

  const client = new Client({
    puppeteer,
    authStrategy,
    restartOnAuthFail: true,
  });

  // Generate QR code when needed
  client.on('qr', (qr: string) => {
    // Display QR code in terminal
    qrcode.generate(qr, { small: true }, qrcode => {
      logger.info(qrcode);
    });
    logger.info('QR code generated. Scan it with your phone to log in.');
  });

  // Handle ready event
  client.on('ready', async () => {
    logger.info('Client is ready!');
  });

  // Handle authenticated event
  client.on('authenticated', () => {
    logger.info('Authentication successful!');
  });

  // Handle auth failure event
  client.on('auth_failure', (msg: string) => {
    logger.error('Authentication failed:', msg);
  });

  // Handle disconnected event
  client.on('disconnected', (reason: string) => {
    logger.warn('Client was disconnected:', reason);
  });

  // Handle incoming messages
  client.on('message', async (message: Message) => {
    const contact = await message.getContact();
    logger.debug(`${contact.pushname} (${contact.number}): ${message.body}`);
  });

  return client;
}
