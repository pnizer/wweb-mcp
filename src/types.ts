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

export interface GroupResponse {
  id: string;
  name: string;
  description?: string;
  participants: GroupParticipant[];
  createdAt: string;
}

export interface GroupParticipant {
  id: string;
  number: string;
  name?: string;
  isAdmin: boolean;
}

export interface CreateGroupResponse {
  groupId: string;
  inviteCode?: string;
}

export interface AddParticipantsResponse {
  success: boolean;
  added: string[];
  failed?: { number: string; reason: string }[];
}

export interface MediaResponse {
  filePath: string;
  mimetype: string;
  filename: string;
  filesize: number;
  messageId: string;
}

export interface SendMediaMessageParams {
  number: string;
  source: string;  // URI scheme format: URLs must use http:// or https:// prefixes, local files must use file:// prefix
  caption?: string;
}

export interface SendMediaMessageResponse extends SendMessageResponse {
  mediaInfo: {
    mimetype: string;
    filename: string;
    size?: number;
  };
}
