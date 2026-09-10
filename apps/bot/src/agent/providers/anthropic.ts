import Anthropic from '@anthropic-ai/sdk';
import { ModelCallError, retryableStatus } from '../model.js';
import type { ModelClient, ModelRequest, ModelResponse } from '../model.js';

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
}

export function createAnthropicModel(options: AnthropicModelOptions): ModelClient {
  // The vendor client is built here rather than handed in, so the SDK stays
  // inside this directory and the registry can dispatch without importing one.
  const client = new Anthropic({ apiKey: options.apiKey });

  return {
    provider: 'anthropic',

    async complete(request: ModelRequest): Promise<ModelResponse> {
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
          ],
          output_config: { effort: options.effort ?? 'low' },
          messages: request.turns.map((turn) => ({ role: turn.role, content: turn.text })),
        });
      } catch (error) {
        // This vendor's failures, translated into the port's error. Keeping
        // the translation here is what lets the reply loop stay ignorant of
        // both SDKs' error shapes.
        const status = (error as { status?: unknown }).status;
        const code = typeof status === 'number' ? status : undefined;
        throw new ModelCallError('anthropic', retryableStatus(code), code, { cause: error });
      }

      // A safety decline arrives with HTTP 200 and no usable text, so it is
      // an outcome to return rather than an exception to catch.
      if (response.stop_reason === 'refusal') {
        return { kind: 'refusal', category: response.stop_details?.category ?? null };
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
