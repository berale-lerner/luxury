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
  /**
   * 'system' is written by the bot's own code, not by the model — the notice
   * sent when the agent could not answer. Distinct so the thread does not
   * credit the agent with words it never produced.
   */
  sender: 'guest' | 'agent' | 'manager' | 'system';
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

export interface Agent {
  id: string;
  key: string;
  name: string;
}

/** One document in the draft the manager edits. */
export interface PromptDocument {
  id: string;
  title: string;
  body: string;
  position: number;
  isActive: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

/** A frozen version — what the bot is actually serving. */
export interface PromptVersion {
  versionNumber: number;
  publishedBy: string | null;
  publishedAt: string;
  characters: number;
}

export interface PromptState {
  agent: Agent;
  documents: PromptDocument[];
  published: PromptVersion | null;
  /** The draft assembled exactly as publish would store it. */
  preview: string;
  /** Whether publishing would produce a new version. Decided by the server. */
  hasChanges: boolean;
}
