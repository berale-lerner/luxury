import type pg from 'pg';
import type { ConversationId } from '@luxury/shared';
import type { MessagingClient } from '@luxury/messaging';
import { generateReply, AgentRefusedError, type AgentDeps, type PromptCache } from './agent/index.js';
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
  readonly log?: (event: Record<string, unknown>) => void;
}

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
