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
