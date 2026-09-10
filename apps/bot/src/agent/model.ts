/**
 * The port between this service and whichever model answers guests.
 *
 * Deliberately narrow: a system prompt, the turns so far, text back, or a
 * refusal. That is the part every provider does the same way, and it is the
 * only part this service depends on.
 *
 * What is *not* here is as much of the point. Prompt caching, thinking and
 * effort, and — from the next slice — the shape of a tool call all differ
 * enough between providers that folding them in would produce an interface
 * that leaks its first implementation. They live in the adapter, which is
 * free to tune the provider it actually talks to.
 */

export interface ConversationTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export interface ModelRequest {
  readonly systemPrompt: string;
  readonly turns: readonly ConversationTurn[];
  readonly maxTokens?: number;
  /**
   * Facts about this moment, written by the code — how long the guest has
   * been waiting, what time it is where the business is.
   *
   * Separate from the system prompt for two reasons. It changes on every
   * message, so folding it in would defeat the caching of a prefix that is
   * otherwise identical for every guest. And it is not content: the published
   * prompt is the owner's text, and this is the system telling the model
   * something the owner cannot know in advance.
   *
   * Separate from the turns because it is not something anyone said. A note
   * written into the conversation as a turn is a sentence the model may
   * quote back, or answer.
   */
  readonly context?: string;
}

export type ModelResponse =
  | { readonly kind: 'text'; readonly text: string }
  /** The provider declined. `category` is provider-specific and may be null. */
  | { readonly kind: 'refusal'; readonly category: string | null };

export interface ModelClient {
  /** Names the provider, for logs and for errors that need to say who refused. */
  readonly provider: string;
  complete(request: ModelRequest): Promise<ModelResponse>;
}

/**
 * A call that did not produce an answer.
 *
 * `retryable` is the adapter's judgement, because classifying a provider's
 * failures is exactly what an adapter is for: the reply loop must not learn
 * to read one vendor's error shape, and it certainly must not learn two.
 *
 * The distinction is not "did it fail" but "would asking again help". A
 * gateway error or a timeout, yes. An exhausted quota, no — the answer will
 * be the same for the next minute, and asking again spends another unit of
 * the very thing that ran out.
 */
export class ModelCallError extends Error {
  constructor(
    readonly provider: string,
    readonly retryable: boolean,
    readonly status: number | undefined,
    options?: { cause?: unknown },
  ) {
    super(`${provider} call failed${status === undefined ? '' : ` with status ${status}`}`);
    this.name = 'ModelCallError';
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

/**
 * The shared rule the adapters apply once they have a status.
 *
 * 5xx and no-status (a socket that died, DNS, an abort) are worth another go.
 * Everything in the 4xx range is not: 429 says the quota is gone and names
 * the minute it comes back, and the rest are malformed requests that will
 * fail identically forever.
 */
export function retryableStatus(status: number | undefined): boolean {
  if (status === undefined) return true;
  return status >= 500;
}
