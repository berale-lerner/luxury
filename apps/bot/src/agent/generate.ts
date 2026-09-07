import type { ConversationTurn, ModelClient } from './model.js';

export interface AgentReply {
  readonly text: string;
  readonly promptVersion: number;
}

export interface AgentDeps {
  readonly model: ModelClient;
  readonly maxTokens?: number;
}

/**
 * Asks the model for a reply.
 *
 * It has no tools. This slice answers from the knowledge the owner wrote into
 * the system prompt; availability lookups come later, and adding them means
 * adding a tool with its own validation and output whitelist — not loosening
 * anything here.
 *
 * Depends on the ModelClient port, not on any provider's SDK, so swapping the
 * provider is a change in one adapter file. Credentials live in whatever the
 * caller constructed and never reach the model's context (CLAUDE.md).
 */
export async function generateReply(
  deps: AgentDeps,
  systemPrompt: string,
  promptVersion: number,
  history: readonly ConversationTurn[],
): Promise<AgentReply> {
  const response = await deps.model.complete({
    systemPrompt,
    turns: history,
    ...(deps.maxTokens !== undefined ? { maxTokens: deps.maxTokens } : {}),
  });

  if (response.kind === 'refusal') {
    throw new AgentRefusedError(deps.model.provider, response.category);
  }

  const text = response.text.trim();
  if (text.length === 0) {
    throw new Error(`${deps.model.provider} returned no text to send.`);
  }

  return { text, promptVersion };
}

/** The model declined to answer. The guest gets a handover, not the reason. */
export class AgentRefusedError extends Error {
  constructor(
    readonly provider: string,
    readonly category: string | null,
  ) {
    super(`${provider} declined to answer (category: ${category ?? 'unknown'})`);
    this.name = 'AgentRefusedError';
  }
}
