import type pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { MessagingClient } from '@luxury/messaging';
import {
  describeMoment,
  generateReply,
  AgentRefusedError,
  type AgentDeps,
  type PromptCache,
} from './agent/index.js';
import { loadHistory, recordOutbound } from './conversations/index.js';

/**
 * The seam: the one module that touches both layers.
 *
 * The agent layer produces text and cannot reach a channel. The messaging
 * layer delivers text and has never heard of a model. This function is where
 * they meet, and keeping it a single small file is what makes the rule
 * "the code sends, not the agent" checkable by reading one screen.
 */

export interface ReplyDeps {
  readonly pool: pg.Pool;
  readonly prompts: PromptCache;
  readonly agent: AgentDeps;
  readonly messaging: MessagingClient;
  /** Where the business is, for stating the time as the owner would read it. */
  readonly timeZone?: string;
  readonly log?: (event: Record<string, unknown>) => void;
}

/**
 * How often the "typing…" hint is renewed.
 *
 * Telegram's lasts about five seconds and there is no way to extend it, so
 * anything longer than a very fast answer needs repeating. Slightly under the
 * expiry, so the guest never sees it flicker off and back on.
 */
const TYPING_INTERVAL_MS = 4_500;

export type ReplyOutcome =
  | { status: 'sent'; promptVersion: number }
  | { status: 'skipped'; reason: 'agent_muted' | 'no_published_prompt' | 'refused' };

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

  // Facts about this moment, kept out of both the published prompt and the
  // turns. What to do with them — whether an hour's delay is worth
  // acknowledging, and in what words — is a prompt document, not code.
  const context = describeMoment({
    lastInboundAt: history.lastInboundAt,
    ...(deps.timeZone !== undefined ? { timeZone: deps.timeZone } : {}),
  });

  // From here until there is something to send, the guest sees that the
  // conversation is alive. A normal answer takes a second or two; a failing
  // one takes as long as the timeout allows, and that is exactly the wait
  // that reads as being ignored.
  const typing = startTyping(deps.messaging, conversationId);

  let reply;
  try {
    reply = await generateReply(
      deps.agent,
      prompt.body,
      prompt.versionNumber,
      history.turns,
      context,
    );
  } catch (error) {
    if (error instanceof AgentRefusedError) {
      log({ event: 'agent.refused', conversationId, category: error.category });
      return { status: 'skipped', reason: 'refused' };
    }
    throw error;
  } finally {
    // On every path, including the throw. A live interval would go on
    // telling the guest that an answer is coming after the request that
    // owned it has ended.
    typing.stop();
  }

  // The recipient comes from the conversation row, resolved inside the
  // messaging client. Nothing the model produced reaches this call.
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

/**
 * Keeps the "typing…" hint alive until told to stop.
 *
 * Fires immediately rather than waiting out the first interval — the point is
 * the moment right after the guest presses send. Every call is best effort;
 * the messaging layer swallows its own failures, so nothing here can reject.
 */
function startTyping(
  messaging: MessagingClient,
  conversationId: ConversationId,
): { stop: () => void } {
  void messaging.indicateTyping(conversationId);
  const timer = setInterval(() => {
    void messaging.indicateTyping(conversationId);
  }, TYPING_INTERVAL_MS);
  // Not a reason to keep the process alive at shutdown.
  timer.unref?.();

  return {
    stop: () => clearInterval(timer),
  };
}
