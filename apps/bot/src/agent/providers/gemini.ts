import { GoogleGenAI, FinishReason, type Content, type Part } from '@google/genai';
import { ModelCallError, retryableStatus } from '../model.js';
import type { ModelClient, ModelRequest, ModelResponse, ProviderTurn, ToolRound } from '../model.js';

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
  /** Tests point this at a local stub. Never set in a deployed service. */
  readonly baseUrl?: string;
}

const PROVIDER = 'gemini';

/**
 * Older Gemini models return a function call without an id. The port needs
 * one to pair a result with its call, so one is made up from the position —
 * and never sent back, because Gemini did not issue it.
 */
const SYNTHETIC_ID = 'gemini-call-';

function ownTurn(turn: ProviderTurn): Part[] {
  if (turn.provider !== PROVIDER) {
    throw new Error(`A ${PROVIDER} request was given a ${turn.provider} turn to replay.`);
  }
  return turn.payload as Part[];
}

/** A result's text as the object Gemini's functionResponse requires. */
function responseObject(content: string, isError: boolean): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    value = content;
  }
  return isError ? { error: value } : { output: value };
}

/**
 * The model's parts verbatim — thought signature included, which Gemini 3
 * refuses the next request without — then one user turn with every result.
 */
function roundContents(round: ToolRound): Content[] {
  return [
    { role: 'model', parts: ownTurn(round.turn) },
    {
      role: 'user',
      parts: round.results.map((result) => ({
        functionResponse: {
          ...(result.callId.startsWith(SYNTHETIC_ID) ? {} : { id: result.callId }),
          name: result.name,
          response: responseObject(result.content, result.isError),
        },
      })),
    },
  ];
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
  const client = new GoogleGenAI({
    apiKey: options.apiKey,
    ...(options.baseUrl ? { httpOptions: { baseUrl: options.baseUrl } } : {}),
  });

  return {
    provider: PROVIDER,

    async complete(request: ModelRequest): Promise<ModelResponse> {
      const response = await callGemini(client, options, request);

      // A prompt blocked before generation reports no candidates at all.
      const blockReason = response.promptFeedback?.blockReason;
      if (blockReason) {
        return { kind: 'refusal', category: String(blockReason) };
      }

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && DECLINED.has(finishReason)) {
        return { kind: 'refusal', category: String(finishReason) };
      }

      const calls = response.functionCalls ?? [];
      if (calls.length > 0) {
        return {
          kind: 'tool_calls',
          calls: calls.map((call, index) => ({
            id: call.id ?? `${SYNTHETIC_ID}${index}`,
            name: call.name ?? '',
            arguments: call.args ?? {},
          })),
          turn: { provider: PROVIDER, payload: response.candidates?.[0]?.content?.parts ?? [] },
        };
      }

      return { kind: 'text', text: response.text ?? '' };
    },
  };
}

/**
 * The call, with this vendor's failures translated into the port's error.
 *
 * The SDK reports the status on the thrown object; reading it here keeps that
 * knowledge in the one file allowed to know what a Gemini error looks like.
 */
async function callGemini(
  client: GoogleGenAI,
  options: GeminiModelOptions,
  request: ModelRequest,
) {
  // Built outside the try: a mistake in building the request is ours, and
  // must not be reported as a retryable vendor failure.
  const contents: Content[] = [
    ...request.turns.map((turn) => ({
      // Gemini calls the assistant "model"; the port calls it
      // "assistant". Translating here is this adapter's job.
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.text }],
    })),
    ...(request.toolRounds ?? []).flatMap(roundContents),
  ];

  try {
    return await client.models.generateContent({
      model: options.model ?? 'gemini-3.8-flash',
      contents,
      config: {
        // One field rather than a list of blocks, so the context is appended
        // instead of carried beside the prompt. The separation this vendor
        // does not offer is the caller's to preserve, and it does — the
        // context arrives already labelled as coming from the system.
        systemInstruction: request.context
          ? `${request.systemPrompt}\n\n${request.context}`
          : request.systemPrompt,
        maxOutputTokens: request.maxTokens ?? 1024,
        ...(request.tools?.length
          ? {
              tools: [
                {
                  functionDeclarations: request.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parametersJsonSchema: tool.parameters,
                  })),
                },
              ],
            }
          : {}),
      },
    });
  } catch (error) {
    const status = (error as { status?: unknown }).status;
    const code = typeof status === 'number' ? status : undefined;
    throw new ModelCallError(PROVIDER, retryableStatus(code), code, { cause: error });
  }
}
