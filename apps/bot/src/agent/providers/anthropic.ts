import Anthropic from '@anthropic-ai/sdk';
import { ModelCallError, retryableStatus } from '../model.js';
import type { ModelClient, ModelRequest, ModelResponse, ProviderTurn, ToolRound } from '../model.js';

/**
 * The Anthropic adapter — the only file in this service that imports the
 * Anthropic SDK.
 *
 * Everything provider-specific is here on purpose: the cache breakpoint on
 * the system prompt, the effort level, and reading a refusal out of
 * `stop_reason`. Another provider becomes a sibling file, not a rewrite.
 */

export interface AnthropicModelOptions {
  readonly apiKey: string;
  readonly model?: string;
  /**
   * A guest waiting in a chat window is latency-sensitive, and answering from
   * a written knowledge base is not a reasoning-heavy task.
   */
  readonly effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Tests point this at a local stub. Never set in a deployed service. */
  readonly baseUrl?: string;
}

const PROVIDER = 'anthropic';

/** This adapter's own turn, back from the opaque carrier the loop holds. */
function ownTurn(turn: ProviderTurn): Anthropic.ContentBlock[] {
  if (turn.provider !== PROVIDER) {
    // A round from another provider cannot be replayed here: its payload is
    // a different vendor's shape. The loop never mixes them; this says so
    // loudly if that ever changes.
    throw new Error(`An ${PROVIDER} request was given a ${turn.provider} turn to replay.`);
  }
  return turn.payload as Anthropic.ContentBlock[];
}

/**
 * Each round is two messages: the model's turn verbatim, then every result
 * in one user message — Anthropic requires all the results for a turn
 * together, in a single message.
 */
function roundMessages(round: ToolRound): Anthropic.MessageParam[] {
  return [
    { role: 'assistant', content: ownTurn(round.turn) },
    {
      role: 'user',
      content: round.results.map((result) => ({
        type: 'tool_result' as const,
        tool_use_id: result.callId,
        content: result.content,
        is_error: result.isError,
      })),
    },
  ];
}

export function createAnthropicModel(options: AnthropicModelOptions): ModelClient {
  // The vendor client is built here rather than handed in, so the SDK stays
  // inside this directory and the registry can dispatch without importing one.
  const client = new Anthropic({
    apiKey: options.apiKey,
    ...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
  });

  return {
    provider: PROVIDER,

    async complete(request: ModelRequest): Promise<ModelResponse> {
      // Built before the call, outside the try below: a mistake in building
      // the request is ours, not the vendor's, and must not be wrapped as a
      // retryable network failure.
      const messages: Anthropic.MessageParam[] = [
        ...request.turns.map((turn) => ({ role: turn.role, content: turn.text })),
        ...(request.toolRounds ?? []).flatMap(roundMessages),
      ];

      let response;
      try {
        response = await client.messages.create({
          model: options.model ?? 'claude-opus-5',
          max_tokens: request.maxTokens ?? 1024,
          // The published prompt is identical across every guest message, so it
          // is the stable prefix worth caching.
          system: [
            {
              type: 'text',
              text: request.systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
            // A second block, and pointedly without cache_control: it differs
            // on every message, and marking it would invalidate the cached
            // prefix above on every message too.
            ...(request.context
              ? [{ type: 'text' as const, text: request.context }]
              : []),
          ],
          output_config: { effort: options.effort ?? 'low' },
          ...(request.tools?.length
            ? {
                tools: request.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  input_schema: tool.parameters as Anthropic.Tool.InputSchema,
                })),
              }
            : {}),
          messages,
        });
      } catch (error) {
        // This vendor's failures, translated into the port's error. Keeping
        // the translation here is what lets the reply loop stay ignorant of
        // both SDKs' error shapes.
        const status = (error as { status?: unknown }).status;
        const code = typeof status === 'number' ? status : undefined;
        throw new ModelCallError(PROVIDER, retryableStatus(code), code, { cause: error });
      }

      // A safety decline arrives with HTTP 200 and no usable text, so it is
      // an outcome to return rather than an exception to catch.
      if (response.stop_reason === 'refusal') {
        return { kind: 'refusal', category: response.stop_details?.category ?? null };
      }

      if (response.stop_reason === 'tool_use') {
        const calls = response.content
          .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
          .map((block) => ({ id: block.id, name: block.name, arguments: block.input }));
        if (calls.length > 0) {
          return { kind: 'tool_calls', calls, turn: { provider: PROVIDER, payload: response.content } };
        }
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();

      return { kind: 'text', text };
    },
  };
}
