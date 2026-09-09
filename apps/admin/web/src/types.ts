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

/**
 * What someone on the allowlist may do. Ordered: each role can do everything
 * the one before it can.
 */
export type AdminRole = 'viewer' | 'manager' | 'owner';

/** The signed-in person, as the server describes them. */
export interface Me {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  addedBy: string | null;
  createdAt: string;
  roleChangedBy: string | null;
  roleChangedAt: string | null;
}
