import type pg from 'pg';
import type { ChannelName } from '@luxury/shared';

export interface ConversationSummary {
  readonly id: string;
  readonly channel: ChannelName;
  readonly guestName: string | null;
  readonly status: 'open' | 'closed';
  readonly agentMuted: boolean;
  readonly lastMessageAt: string | null;
  readonly lastMessagePreview: string | null;
  readonly lastMessageDirection: 'inbound' | 'outbound' | null;
  readonly messageCount: number;
}

/**
 * Where a client has read up to.
 *
 * Issued by the server and echoed back unchanged. It is never built from the
 * client's own clock: a browser running a few seconds fast would skip
 * everything written in the gap.
 *
 * The id is a tiebreaker. Two messages can share a timestamp, and `>` on the
 * timestamp alone would silently drop one of them.
 */
export interface MessageCursor {
  readonly at: string;
  readonly id: string;
}

export interface ConversationMessage {
  readonly id: string;
  readonly direction: 'inbound' | 'outbound';
  readonly sender: 'guest' | 'agent' | 'manager';
  readonly body: string;
  readonly createdAt: string;
}

/**
 * The conversation list.
 *
 * One query with a lateral join rather than a list query plus a preview query
 * per row: the list is the first thing the manager sees, and N+1 there is the
 * difference between a page that opens and one that hesitates.
 */
export async function listConversations(
  pool: pg.Pool,
  options: { limit?: number | undefined; search?: string | undefined } = {},
): Promise<ConversationSummary[]> {
  const result = await pool.query<{
    id: string;
    channel: ChannelName;
    guest_name: string | null;
    status: 'open' | 'closed';
    agent_muted: boolean;
    last_message_at: Date | null;
    preview: string | null;
    direction: 'inbound' | 'outbound' | null;
    message_count: string;
  }>(
    `SELECT c.id,
            c.channel,
            coalesce(g.display_name, c.contact_name) AS guest_name,
            c.status,
            c.agent_muted,
            c.last_message_at,
            last.body             AS preview,
            last.direction,
            coalesce(counts.n, 0) AS message_count
       FROM public.conversations c
       LEFT JOIN public.guests g ON g.id = c.guest_id
       LEFT JOIN LATERAL (
         SELECT m.body, m.direction
           FROM public.messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
       ) last ON true
       LEFT JOIN LATERAL (
         SELECT count(*)::int AS n
           FROM public.messages m
          WHERE m.conversation_id = c.id
       ) counts ON true
      WHERE ($2::text IS NULL
             OR g.display_name ILIKE '%' || $2 || '%'
             OR c.channel_chat_id ILIKE '%' || $2 || '%'
             OR last.body ILIKE '%' || $2 || '%')
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      LIMIT $1`,
    [options.limit ?? 100, options.search?.trim() || null],
  );

  return result.rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    guestName: row.guest_name,
    status: row.status,
    agentMuted: row.agent_muted,
    lastMessageAt: row.last_message_at?.toISOString() ?? null,
    lastMessagePreview: row.preview,
    lastMessageDirection: row.direction,
    messageCount: Number(row.message_count),
  }));
}

export async function getConversation(
  pool: pg.Pool,
  id: string,
): Promise<{
  conversation: ConversationSummary;
  messages: ConversationMessage[];
  cursor: MessageCursor | null;
} | null> {
  const summary = await pool.query<{
    id: string;
    channel: ChannelName;
    guest_name: string | null;
    status: 'open' | 'closed';
    agent_muted: boolean;
    last_message_at: Date | null;
  }>(
    `SELECT c.id, c.channel, coalesce(g.display_name, c.contact_name) AS guest_name,
            c.status, c.agent_muted,
            c.last_message_at
       FROM public.conversations c
       LEFT JOIN public.guests g ON g.id = c.guest_id
      WHERE c.id = $1`,
    [id],
  );

  const row = summary.rows[0];
  if (!row) return null;

  const messages = await pool.query<{
    id: string;
    direction: 'inbound' | 'outbound';
    sender: 'guest' | 'agent' | 'manager';
    body: string;
    created_at: Date;
  }>(
    `SELECT id, direction, sender, body, created_at
       FROM public.messages
      WHERE conversation_id = $1
      ORDER BY created_at`,
    [id],
  );

  const parsed = messages.rows.map((m) => ({
    id: m.id,
    direction: m.direction,
    sender: m.sender,
    body: m.body,
    createdAt: m.created_at.toISOString(),
  }));
  const last = parsed[parsed.length - 1];

  return {
    // Handed out with the thread, so the client never has to invent one from
    // its own clock.
    cursor: last ? { at: last.createdAt, id: last.id } : null,
    conversation: {
      id: row.id,
      channel: row.channel,
      guestName: row.guest_name,
      status: row.status,
      agentMuted: row.agent_muted,
      lastMessageAt: row.last_message_at?.toISOString() ?? null,
      lastMessagePreview: null,
      lastMessageDirection: null,
      messageCount: messages.rowCount ?? 0,
    },
    messages: parsed,
  };
}

/**
 * How far back a poll looks beyond the cursor it was given.
 *
 * `now()` in Postgres is the transaction's start time, not its commit time,
 * so rows do not become visible in timestamp order. The bot can open a
 * transaction at T1 while the manager opens one at T2, and the manager's can
 * commit first — a poll landing in between would advance its cursor past T2
 * and never see T1 at all.
 *
 * Re-reading a short window closes that. The cost is a handful of rows the
 * client already has, which it drops by id; the alternative is a message
 * that is stored, visible in the database, and never delivered to the screen.
 */
const OVERLAP_MS = 2_000;

/** A hard ceiling, so a long-idle tab cannot ask for an unbounded page. */
const MAX_BATCH = 200;

/**
 * Messages added since the cursor, oldest first.
 *
 * The full thread comes from getConversation on open; this is what polling
 * asks for afterwards, and it usually returns nothing at all.
 */
export async function messagesSince(
  pool: pg.Pool,
  conversationId: string,
  cursor: MessageCursor,
): Promise<{ messages: ConversationMessage[]; cursor: MessageCursor }> {
  const result = await pool.query<{
    id: string;
    direction: 'inbound' | 'outbound';
    sender: 'guest' | 'agent' | 'manager';
    body: string;
    created_at: Date;
  }>(
    `SELECT id, direction, sender, body, created_at
       FROM public.messages
      WHERE conversation_id = $1
        AND (created_at, id) > ($2::timestamptz - $4::interval, $3::uuid)
      ORDER BY created_at, id
      LIMIT $5`,
    [
      conversationId,
      cursor.at,
      cursor.id,
      `${OVERLAP_MS} milliseconds`,
      MAX_BATCH,
    ],
  );

  const messages = result.rows.map((m) => ({
    id: m.id,
    direction: m.direction,
    sender: m.sender,
    body: m.body,
    createdAt: m.created_at.toISOString(),
  }));

  // Advanced only by what was actually read. An empty page leaves the cursor
  // where it was, so the overlap window keeps covering the same ground until
  // something lands in it.
  const last = messages[messages.length - 1];
  return {
    messages,
    cursor: last ? { at: last.createdAt, id: last.id } : cursor,
  };
}

/**
 * Records a message the manager wrote, and mutes the agent in that
 * conversation.
 *
 * The muting is part of the same transaction on purpose: a manager whose
 * message was stored but whose mute was not would find the agent replying
 * over them (CLAUDE.md, "Conversations").
 */
export async function recordManagerMessage(
  pool: pg.Pool,
  conversationId: string,
  body: string,
): Promise<ConversationMessage> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO public.messages (conversation_id, direction, sender, body)
       VALUES ($1, 'outbound', 'manager', $2)
       RETURNING id, created_at`,
      [conversationId, body],
    );

    await client.query(
      `UPDATE public.conversations
          SET agent_muted = true, last_message_at = now()
        WHERE id = $1`,
      [conversationId],
    );

    await client.query('COMMIT');

    const row = inserted.rows[0]!;
    return {
      id: row.id,
      direction: 'outbound',
      sender: 'manager',
      body,
      createdAt: row.created_at.toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Lets the agent speak again, on an explicit action by the manager. */
export async function setAgentMuted(
  pool: pg.Pool,
  conversationId: string,
  muted: boolean,
): Promise<void> {
  await pool.query('UPDATE public.conversations SET agent_muted = $2 WHERE id = $1', [
    conversationId,
    muted,
  ]);
}
