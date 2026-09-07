import { GoogleGenAI, FinishReason } from '@google/genai';
import type { ModelClient, ModelRequest, ModelResponse } from '../model.js';

/**
 * The Gemini adapter.
 *
 * A good illustration of why the port is worth having: almost nothing here
 * lines up with the Anthropic adapter. The system prompt is a config field
 * rather than a message, the assistant's role is called `model` rather than
 * `assistant`, turns are `contents` with `parts`, and a safety block arrives
 * as a `finishReason` on a candidate instead of a top-level stop reason.
 *
 * All of that is contained in this file. The reply loop sees the same
 * ModelClient it always did.
 */

export interface GeminiModelOptions {
  readonly apiKey: string;
  readonly model?: string;
}

/** Finish reasons that mean the model declined rather than answered. */
const DECLINED = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
]);

export function createGeminiModel(options: GeminiModelOptions): ModelClient {
  const client = new GoogleGenAI({ apiKey: options.apiKey });

  return {
    provider: 'gemini',

    async complete(request: ModelRequest): Promise<ModelResponse> {
      const response = await client.models.generateContent({
        model: options.model ?? 'gemini-3.8-flash',
        contents: request.turns.map((turn) => ({
          // Gemini calls the assistant "model"; the port calls it
          // "assistant". Translating here is this adapter's job.
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.text }],
        })),
        config: {
          systemInstruction: request.systemPrompt,
          maxOutputTokens: request.maxTokens ?? 1024,
        },
      });

      // A prompt blocked before generation reports no candidates at all.
      const blockReason = response.promptFeedback?.blockReason;
      if (blockReason) {
        return { kind: 'refusal', category: String(blockReason) };
      }

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && DECLINED.has(finishReason)) {
        return { kind: 'refusal', category: String(finishReason) };
      }

      return { kind: 'text', text: response.text ?? '' };
    },
  };
}
