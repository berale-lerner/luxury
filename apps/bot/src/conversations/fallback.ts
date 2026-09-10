import type pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { MessagingClient } from '@luxury/messaging';

/** The template the words come from. Editable in the database, not here. */
const TEMPLATE_KEY = 'agent_unavailable';

/**
 * How far after a guest's message a notice must land to count as answering it.
 *
 * Telegram states send times in whole seconds, so a message written at
 * 10.9s arrives claiming 10.0s — up to a second earlier than it happened. A
 * strict comparison therefore reads a reply sent moments after the notice as
 * having come before it, and silences the guest.
 *
 * Two seconds of margin, and it errs deliberately: within that window the
 * guest gets told twice rather than not at all.
 */
const CLOCK_MARGIN_MS = 2_000;

/**
 * Whether this guest has already been answered by an earlier notice.
 *
 * The question is not "did we say this recently" — that was the first attempt
 * at this, and it silenced a guest who wrote again a minute later, which from
 * their side is the bot ignoring them. It is: had we already said it *by the
 * time they pressed send*?
 *
 * A guest whose message predates the notice has been answered by it, even
 * though the platform delivered their message afterwards — that is the burst
 * of two identical apologies a second apart, seen in production. A guest who
 * wrote after reading it is asking again knowingly, and deserves a reply.
 */

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
  /** When the guest pressed send, per the platform. */
  guestWroteAt: Date,
): Promise<boolean> {
  const log = deps.log ?? (() => {});

  try {
    const notifiedAt = await lastNoticeAt(deps.pool, conversationId);
    if (notifiedAt && notifiedAt.getTime() > guestWroteAt.getTime() + CLOCK_MARGIN_MS) {
      log({
        event: 'fallback.suppressed',
        conversationId,
        reason: 'answered_by_earlier_notice',
      });
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

/** When this conversation was last told, or null if it never has been. */
async function lastNoticeAt(
  pool: pg.Pool,
  conversationId: ConversationId,
): Promise<Date | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', conversationId]);
    const result = await client.query<{ created_at: Date }>(
      `SELECT created_at FROM public.messages
        WHERE conversation_id = $1 AND sender = 'system'
        ORDER BY created_at DESC
        LIMIT 1`,
      [conversationId],
    );
    await client.query('COMMIT');
    return result.rows[0]?.created_at ?? null;
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
