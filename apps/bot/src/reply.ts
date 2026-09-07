import type pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { DestinationResolver, MessagingClient } from '@luxury/messaging';
import { generateReply, AgentRefusedError, HISTORY_LIMIT, type ConversationTurn } from './agent.js';
import type { PromptCache } from './prompt.js';
import type { AgentDeps } from './agent.js';

/**
 * Resolves where a conversation is delivered, by reading the row.
 *
 * This is the half that makes the send layer's signature mean something: the
 * address exists in the database and nowhere else in the call path.
 */
export function createDestinationResolver(pool: pg.Pool): DestinationResolver {
  return {
    async resolve(conversationId: ConversationId) {
      // The scope has to be declared even to read the row's own address:
      // RLS shows bot_user no conversation until the request says which one
      // it is serving. Without this the lookup silently returns nothing and
      // no reply is ever delivered.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', [
          'app.conversation_id',
          conversationId,
        ]);

        const result = await client.query<{ channel: string; channel_chat_id: string }>(
          `SELECT channel, channel_chat_id FROM public.conversations WHERE id = $1`,
          [conversationId],
        );

        await client.query('COMMIT');

        const row = result.rows[0];
        if (!row) {
          throw new Error(`No conversation ${conversationId} to deliver to.`);
        }
        return { channel: row.channel as 'telegram', chatId: row.channel_chat_id };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export interface ReplyDeps {
  readonly pool: pg.Pool;
  readonly prompts: PromptCache;
  readonly agent: AgentDeps;
  readonly messaging: MessagingClient;
  readonly log?: (event: Record<string, unknown>) => void;
}

export type ReplyOutcome =
  | { status: 'sent'; promptVersion: number }
  | { status: 'skipped'; reason: 'agent_muted' | 'no_published_prompt' | 'refused' };

/**
 * Answers one guest message: read history, ask the model, send the reply.
 *
 * The agent has no send tool — this function calls the messaging layer after
 * the model returns text, and the recipient comes from the conversation row
 * rather than from anything the model produced (CLAUDE.md).
 */
export async function replyToConversation(
  deps: ReplyDeps,
  conversationId: ConversationId,
  agentMuted: boolean,
): Promise<ReplyOutcome> {
  const log = deps.log ?? (() => {});

  // A manager holding the conversation silences the agent. Checked here, in
  // code, rather than left to the prompt.
  if (agentMuted) {
    return { status: 'skipped', reason: 'agent_muted' };
  }

  const prompt = await deps.prompts.get();
  if (!prompt) {
    // Nothing published yet. Staying silent is the honest behaviour: an
    // unprompted agent would improvise the business's policies.
    log({ event: 'agent.skipped', conversationId, reason: 'no_published_prompt' });
    return { status: 'skipped', reason: 'no_published_prompt' };
  }

  const history = await loadHistory(deps.pool, conversationId);

  let reply;
  try {
    reply = await generateReply(deps.agent, prompt.body, prompt.versionNumber, history);
  } catch (error) {
    if (error instanceof AgentRefusedError) {
      log({ event: 'agent.refused', conversationId, category: error.category });
      return { status: 'skipped', reason: 'refused' };
    }
    throw error;
  }

  const sent = await deps.messaging.sendToConversation(conversationId, reply.text);

  await recordOutbound(deps.pool, conversationId, reply.text);

  log({
    event: 'agent.replied',
    conversationId,
    // Which prompt version produced this answer, so a complaint about what
    // the bot said can be traced to the text that caused it.
    promptVersion: reply.promptVersion,
    providerMessageId: sent.providerMessageId,
  });

  return { status: 'sent', promptVersion: reply.promptVersion };
}

async function loadHistory(
  pool: pg.Pool,
  conversationId: ConversationId,
): Promise<ConversationTurn[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.conversation_id', conversationId]);

    const result = await client.query<{ direction: string; body: string }>(
      `SELECT direction, body
         FROM public.messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [conversationId, HISTORY_LIMIT],
    );

    await client.query('COMMIT');

    return result.rows
      .reverse()
      .map((row) => ({
        role: row.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
        text: row.body,
      }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function recordOutbound(
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
       VALUES ($1, 'outbound', 'agent', $2)`,
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
