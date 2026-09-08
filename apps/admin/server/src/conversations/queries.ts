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
): Promise<{ conversation: ConversationSummary; messages: ConversationMessage[] } | null> {
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

  return {
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
    messages: messages.rows.map((m) => ({
      id: m.id,
      direction: m.direction,
      sender: m.sender,
      body: m.body,
      createdAt: m.created_at.toISOString(),
    })),
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
