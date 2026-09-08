export type ChannelName = 'telegram' | 'whatsapp' | 'instagram';

export interface ConversationSummary {
  id: string;
  channel: ChannelName;
  guestName: string | null;
  status: 'open' | 'closed';
  agentMuted: boolean;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  sender: 'guest' | 'agent' | 'manager';
  body: string;
  createdAt: string;
}

/**
 * Where this client has read up to in a thread.
 *
 * Issued by the server and echoed back unchanged — never built from the
 * browser's own clock, which may not agree with the database's.
 */
export interface MessageCursor {
  at: string;
  id: string;
}
