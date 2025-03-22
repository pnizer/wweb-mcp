import { Client, LocalAuth, Message, NoAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import logger from './logger';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Configuration interface
export interface WhatsAppConfig {
  authDataPath?: string;
  authStrategy?: 'local' | 'none';
  dockerContainer?: boolean;
}

interface WebhookConfig {
  url: string;
  authToken?: string;
  filters?: {
    allowedNumbers?: string[];
    allowPrivate?: boolean;
    allowGroups?: boolean;
  };
}

function loadWebhookConfig(dataPath: string): WebhookConfig | undefined {
  const webhookConfigPath = path.join(dataPath, 'webhook.json');
  if (!fs.existsSync(webhookConfigPath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(webhookConfigPath, 'utf8'));
}

export function createWhatsAppClient(config: WhatsAppConfig = {}): Client {
  const authDataPath = config.authDataPath || '.wwebjs_auth';

  const webhookConfig = loadWebhookConfig(authDataPath);

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
      logger.info(`QR code generated. Scan it with your phone to log in.\n${qrcode}`);
    });
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
    
    // Process webhook if configured
    if (webhookConfig) {
      // Check filters
      const isGroup = message.from.includes('@g.us');
      
      // Skip if filters don't match
      if (
        (isGroup && webhookConfig.filters?.allowGroups === false) ||
        (!isGroup && webhookConfig.filters?.allowPrivate === false) ||
        (webhookConfig.filters?.allowedNumbers?.length && 
         !webhookConfig.filters.allowedNumbers.includes(contact.number))
      ) {
        return;
      }
      
      // Send to webhook
      try {
        const response = await axios.post(webhookConfig.url, {
          from: contact.number,
          name: contact.pushname,
          message: message.body,
          isGroup,
          timestamp: message.timestamp,
          messageId: message.id._serialized
        }, {
          headers: {
            'Content-Type': 'application/json',
            ...(webhookConfig.authToken ? { 'Authorization': `Bearer ${webhookConfig.authToken}` } : {})
          }
        });
        
        if (response.status < 200 || response.status >= 300) {
          logger.warn(`Webhook request failed with status ${response.status}`);
        }
      } catch (error) {
        logger.error('Error sending webhook:', error);
      }
    }
  });

  return client;
}
