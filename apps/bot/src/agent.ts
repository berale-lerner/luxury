import Anthropic from '@anthropic-ai/sdk';

/** How much conversation history is replayed to the model. */
export const HISTORY_LIMIT = 20;

export interface ConversationTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export interface AgentReply {
  readonly text: string;
  readonly promptVersion: number;
}

export interface AgentDeps {
  readonly client: Anthropic;
  readonly model?: string;
}

/**
 * Asks the model for a reply.
 *
 * It has no tools. This slice answers from the knowledge the owner wrote into
 * the system prompt; availability lookups come later, and adding them means
 * adding a tool with its own validation and output whitelist — not loosening
 * anything here.
 *
 * The credentials live in the client the caller constructed. Nothing about
 * them reaches the model's context (CLAUDE.md, "Agent tools").
 */
export async function generateReply(
  deps: AgentDeps,
  systemPrompt: string,
  promptVersion: number,
  history: readonly ConversationTurn[],
): Promise<AgentReply> {
  const response = await deps.client.messages.create({
    model: deps.model ?? 'claude-opus-5',
    max_tokens: 1024,
    // The published prompt is identical across every guest message, so it is
    // worth caching: it is the stable prefix, and the varying conversation
    // sits after it.
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    // A guest waiting in a chat window is latency-sensitive, and answering
    // from a written knowledge base is not a reasoning-heavy task.
    output_config: { effort: 'low' },
    messages: history.map((turn) => ({ role: turn.role, content: turn.text })),
  });

  // A safety decline is a normal outcome to handle, not an exception: the
  // response arrives with HTTP 200 and no usable text.
  if (response.stop_reason === 'refusal') {
    throw new AgentRefusedError(response.stop_details?.category ?? null);
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (text.length === 0) {
    throw new Error('The model returned no text to send.');
  }

  return { text, promptVersion };
}

/** The model declined to answer. The guest gets a handover, not the reason. */
export class AgentRefusedError extends Error {
  constructor(readonly category: string | null) {
    super(`The model declined to answer (category: ${category ?? 'unknown'})`);
    this.name = 'AgentRefusedError';
  }
}
