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

/** A table document's cells: one cell per column in every row. */
export interface PromptTable {
  columns: string[];
  rows: string[][];
}

/** One document in the draft the manager edits. */
export interface PromptDocument {
  id: string;
  title: string;
  kind: 'text' | 'table';
  /** A text document's content; empty for a table. */
  body: string;
  /** A table document's content; null for text. */
  table: PromptTable | null;
  position: number;
  isActive: boolean;
  updatedBy: string | null;
  updatedAt: string;
  /** Differs from the version that is serving. Decided by the server. */
  changed: boolean;
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

/** One night of one room type, from MiniHotel. */
export interface NightAvailability {
  date: string;
  /** Units of this type still free that night. */
  available: number;
  /** Units of this type in total. */
  total: number;
}

export interface RoomTypeWeek {
  id: string;
  name: string;
  nights: NightAvailability[];
}

export interface AvailabilityWeek {
  /** The hotel's today, `YYYY-MM-DD`. */
  today: string;
  from: string;
  to: string;
  currency: string;
  roomTypes: RoomTypeWeek[];
}

/** One reservation in one room, on the "today" board. */
export interface StayRow {
  reservationNumber: string;
  guestName: string;
  /** Null when no room is assigned yet. */
  roomNumber: string | null;
  roomTypeName: string | null;
  arrival: string;
  departure: string;
  nights: number;
  status: string;
}

export interface RoomRow {
  roomNumber: string;
  roomTypeName: string;
}

export interface TodayBoard {
  date: string;
  arrivals: StayRow[];
  departures: StayRow[];
  stayovers: StayRow[];
  vacant: RoomRow[];
  closed: RoomRow[];
}
