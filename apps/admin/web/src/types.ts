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
