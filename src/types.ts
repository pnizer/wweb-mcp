import { ClientInfo } from 'whatsapp-web.js';

export interface StatusResponse {
  status: string;
  info: ClientInfo | undefined;
}

export interface ContactResponse {
  name: string;
  number: string;
}

export interface ChatResponse {
  id: string;
  name: string;
  unreadCount: number;
  timestamp: string;
  lastMessage?: string;
}

export interface MessageResponse {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: string;
  contact?: string;
}

export interface SendMessageResponse {
  messageId: string;
}
