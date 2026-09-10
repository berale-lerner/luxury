import type pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { MessagingClient } from '@luxury/messaging';

/** The template the words come from. Editable in the database, not here. */
const TEMPLATE_KEY = 'agent_unavailable';

/**
 * How long one notice speaks for.
 *
 * Found in production: a provider whose quota had run out failed every
 * message, so every message got its own apology — including a backlogged one
 * and a new one, a second apart, which reads as the bot malfunctioning rather
 * than as the bot being honest. Saying it once and then staying quiet is the
 * more truthful behaviour, and the messages are still on record for a manager
 * to pick up.
 */
const REPEAT_AFTER_MS = 10 * 60 * 1000;

export interface FallbackDeps {
  readonly pool: pg.Pool;
  readonly messaging: MessagingClient;
  readonly log?: (event: Record<string, unknown>) => void;
}

/**
 * Tells the guest that no answer is coming this time.
 *
 * Sent once the agent's own retries are spent — see generateReply. By then
 * the provider has been asked twice and the guest has been watching a typing
 * indicator; a third silence is not better than a sentence.
 *
 * Not a proactively-initiated message: it is a reply, on the channel the
 * guest wrote on, to a message they just sent — the case CLAUDE.md describes
 * as automatic. What it is not is the agent talking. The model produced
 * nothing, which is why this exists, and the row is recorded as `system` so
 * the manager sees who actually said it and the model is not later replayed
 * its own apology as though it had written one.
 *
 * Returns false when it could not be sent, which is not an error worth
 * retrying: whatever broke the reply is likely to have broken this too, and
 * the guest's message is stored either way.
 */
export async function sendUnavailableNotice(
  deps: FallbackDeps,
  conversationId: ConversationId,
): Promise<boolean> {
  const log = deps.log ?? (() => {});

  try {
    if (await recentlyNotified(deps.pool, conversationId)) {
      log({ event: 'fallback.suppressed', conversationId, reason: 'already_notified' });
      return false;
    }

    const text = await loadTemplate(deps.pool, TEMPLATE_KEY);
    if (!text) {
      // No template, no message. Inventing one here would put guest-facing
      // words in the code, which is the thing the table exists to prevent.
      log({ event: 'fallback.missing_template', conversationId, template: TEMPLATE_KEY });
      return false;
    }

    const sent = await deps.messaging.sendToConversation(conversationId, text);
    await recordSystemMessage(deps.pool, conversationId, text);

    log({
      event: 'fallback.sent',
      conversationId,
      providerMessageId: sent.providerMessageId,
    });
    return true;
  } catch (error) {
    log({ event: 'fallback.failed', conversationId, err: error });
    return false;
  }
}

/** Whether this conversation has already been told, recently enough. */
async function recentlyNotified(
  pool: pg.Pool,
  conversationId: ConversationId,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', conversationId]);
    const result = await client.query(
      `SELECT 1 FROM public.messages
        WHERE conversation_id = $1
          AND sender = 'system'
          AND created_at > now() - ($2 || ' milliseconds')::interval
        LIMIT 1`,
      [conversationId, String(REPEAT_AFTER_MS)],
    );
    await client.query('COMMIT');
    return result.rowCount === 1;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function loadTemplate(pool: pg.Pool, key: string): Promise<string | null> {
  const result = await pool.query<{ body: string }>(
    'SELECT body FROM public.message_templates WHERE key = $1',
    [key],
  );
  return result.rows[0]?.body ?? null;
}

async function recordSystemMessage(
  pool: pg.Pool,
  conversationId: ConversationId,
  text: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', conversationId]);
    await client.query(
      `INSERT INTO public.messages (conversation_id, direction, sender, body)
       VALUES ($1, 'outbound', 'system', $2)`,
      [conversationId, text],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
