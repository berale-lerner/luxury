/**
 * Tool calls on the wire, for each provider.
 *
 * The real SDKs, pointed at a local stub that answers the way each vendor
 * does and records what it was sent. Nothing reaches Anthropic or Google
 * (TESTING.md). This is where the two shapes that do not line up are
 * checked: Anthropic's tool_use / tool_result blocks, and Gemini's
 * functionCall / functionResponse parts with the thought signature that
 * Gemini 3 refuses a follow-up request without.
 *
 * The same scenario runs against both, so a difference in behaviour between
 * providers shows up as one test passing and its twin failing.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createAnthropicModel,
  createGeminiModel,
  type ModelRequest,
  type ToolDefinition,
} from '../../apps/bot/src/agent/index.js';

interface Received {
  readonly path: string;
  readonly body: Record<string, unknown>;
}

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

/** Answers each request with the next canned body, and keeps what it received. */
async function stubVendor(...answers: unknown[]) {
  const received: Received[] = [];
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk as Buffer));
    request.on('end', () => {
      received.push({ path: request.url ?? '', body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(answers.shift() ?? {}));
    });
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server!.address() as AddressInfo;
  return { received, baseUrl: `http://127.0.0.1:${port}` };
}

const TOOL: ToolDefinition = {
  name: 'check_availability',
  description: 'Check apartments for a stay.',
  parameters: {
    type: 'object',
    properties: { check_in: { type: 'string' }, adults: { type: 'integer' } },
    required: ['check_in', 'adults'],
    additionalProperties: false,
  },
};

const BASE: ModelRequest = {
  systemPrompt: 'You are the concierge.',
  turns: [{ role: 'user', text: 'Free on the 12th for two?' }],
  tools: [TOOL],
};

const ARGS = { check_in: '2026-10-12', adults: 2 };

describe('Anthropic', () => {
  const toolUseMessage = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5',
    content: [
      { type: 'text', text: 'Let me check.' },
      { type: 'tool_use', id: 'toolu_01', name: 'check_availability', input: ARGS },
    ],
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };

  it('offers the tool as input_schema and reads the call back with its id', async () => {
    const vendor = await stubVendor(toolUseMessage);
    const model = createAnthropicModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    const response = await model.complete(BASE);

    expect(vendor.received[0]!.path).toBe('/v1/messages');
    expect(vendor.received[0]!.body['tools']).toEqual([
      { name: 'check_availability', description: TOOL.description, input_schema: TOOL.parameters },
    ]);
    expect(response.kind).toBe('tool_calls');
    expect(response.kind === 'tool_calls' && response.calls).toEqual([
      { id: 'toolu_01', name: 'check_availability', arguments: ARGS },
    ]);
  });

  it('replays its own turn verbatim, then every result in one user message', async () => {
    const vendor = await stubVendor(toolUseMessage, {
      ...toolUseMessage,
      id: 'msg_2',
      content: [{ type: 'text', text: 'DUBAI is free.' }],
      stop_reason: 'end_turn',
    });
    const model = createAnthropicModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    const first = await model.complete(BASE);
    if (first.kind !== 'tool_calls') throw new Error('expected a tool call');
    const second = await model.complete({
      ...BASE,
      toolRounds: [
        {
          turn: first.turn,
          results: [{ callId: 'toolu_01', name: 'check_availability', content: '{"available":[]}', isError: false }],
        },
      ],
    });

    const messages = vendor.received[1]!.body['messages'] as { role: string; content: unknown }[];
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(messages[1]!.content).toEqual(toolUseMessage.content);
    expect(messages[2]!.content).toEqual([
      { type: 'tool_result', tool_use_id: 'toolu_01', content: '{"available":[]}', is_error: false },
    ]);
    expect(second).toEqual({ kind: 'text', text: 'DUBAI is free.' });
  });

  it('sends no tools field when none are offered', async () => {
    const vendor = await stubVendor({ ...toolUseMessage, content: [{ type: 'text', text: 'Hi' }], stop_reason: 'end_turn' });
    const model = createAnthropicModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    await model.complete({ systemPrompt: 'x', turns: BASE.turns });

    expect(vendor.received[0]!.body).not.toHaveProperty('tools');
  });

  it('refuses to replay a turn that another provider produced', async () => {
    const vendor = await stubVendor();
    const model = createAnthropicModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    await expect(
      model.complete({
        ...BASE,
        toolRounds: [{ turn: { provider: 'gemini', payload: [] }, results: [] }],
      }),
    ).rejects.toThrow(/gemini turn/);
    expect(vendor.received).toEqual([]);
  });
});

describe('Gemini', () => {
  const functionCallAnswer = (id?: string) => ({
    candidates: [
      {
        index: 0,
        finishReason: 'STOP',
        content: {
          role: 'model',
          parts: [
            {
              functionCall: { ...(id ? { id } : {}), name: 'check_availability', args: ARGS },
              thoughtSignature: 'c2lnbmF0dXJl',
            },
          ],
        },
      },
    ],
  });

  const textAnswer = {
    candidates: [{ index: 0, finishReason: 'STOP', content: { role: 'model', parts: [{ text: 'DUBAI is free.' }] } }],
  };

  it('offers the tool as a function declaration with a JSON Schema, and reads the call back', async () => {
    const vendor = await stubVendor(functionCallAnswer('fc_1'));
    const model = createGeminiModel({ apiKey: 'test', model: 'gemini-3.1-flash-lite', baseUrl: vendor.baseUrl });

    const response = await model.complete(BASE);

    expect(vendor.received[0]!.path).toMatch(/models\/gemini-3\.1-flash-lite:generateContent$/);
    const tools = vendor.received[0]!.body['tools'] as { functionDeclarations: unknown[] }[];
    expect(tools[0]!.functionDeclarations).toEqual([
      { name: 'check_availability', description: TOOL.description, parametersJsonSchema: TOOL.parameters },
    ]);
    expect(response.kind === 'tool_calls' && response.calls).toEqual([
      { id: 'fc_1', name: 'check_availability', arguments: ARGS },
    ]);
  });

  it('replays its parts with the thought signature, and answers with the id it was given', async () => {
    const vendor = await stubVendor(functionCallAnswer('fc_1'), textAnswer);
    const model = createGeminiModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    const first = await model.complete(BASE);
    if (first.kind !== 'tool_calls') throw new Error('expected a tool call');
    const second = await model.complete({
      ...BASE,
      toolRounds: [
        {
          turn: first.turn,
          results: [{ callId: 'fc_1', name: 'check_availability', content: '{"available":[]}', isError: false }],
        },
      ],
    });

    const contents = vendor.received[1]!.body['contents'] as { role: string; parts: Record<string, unknown>[] }[];
    expect(contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(contents[1]!.parts[0]!['thoughtSignature']).toBe('c2lnbmF0dXJl');
    expect(contents[2]!.parts).toEqual([
      { functionResponse: { id: 'fc_1', name: 'check_availability', response: { output: { available: [] } } } },
    ]);
    expect(second).toEqual({ kind: 'text', text: 'DUBAI is free.' });
  });

  it('pairs a call without an id by position, and does not send the made-up id back', async () => {
    const vendor = await stubVendor(functionCallAnswer(), textAnswer);
    const model = createGeminiModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    const first = await model.complete(BASE);
    if (first.kind !== 'tool_calls') throw new Error('expected a tool call');
    const callId = first.calls[0]!.id;
    await model.complete({
      ...BASE,
      toolRounds: [
        { turn: first.turn, results: [{ callId, name: 'check_availability', content: '{"x":1}', isError: false }] },
      ],
    });

    const contents = vendor.received[1]!.body['contents'] as { parts: Record<string, unknown>[] }[];
    expect(contents[2]!.parts[0]).toEqual({
      functionResponse: { name: 'check_availability', response: { output: { x: 1 } } },
    });
  });

  it('marks a failed lookup as an error in the response object', async () => {
    const vendor = await stubVendor(functionCallAnswer('fc_1'), textAnswer);
    const model = createGeminiModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    const first = await model.complete(BASE);
    if (first.kind !== 'tool_calls') throw new Error('expected a tool call');
    await model.complete({
      ...BASE,
      toolRounds: [
        {
          turn: first.turn,
          results: [{ callId: 'fc_1', name: 'check_availability', content: '{"error":"no"}', isError: true }],
        },
      ],
    });

    const contents = vendor.received[1]!.body['contents'] as { parts: { functionResponse: unknown }[] }[];
    expect(contents[2]!.parts[0]!.functionResponse).toMatchObject({ response: { error: { error: 'no' } } });
  });

  it('sends no tools field when none are offered', async () => {
    const vendor = await stubVendor(textAnswer);
    const model = createGeminiModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    await model.complete({ systemPrompt: 'x', turns: BASE.turns });

    expect(vendor.received[0]!.body).not.toHaveProperty('tools');
  });
});

describe('Gemini, on a turn from another provider', () => {
  it('refuses before sending anything, as an error that is not retried', async () => {
    const vendor = await stubVendor();
    const model = createGeminiModel({ apiKey: 'test', baseUrl: vendor.baseUrl });

    const failure = await model
      .complete({ ...BASE, toolRounds: [{ turn: { provider: 'anthropic', payload: [] }, results: [] }] })
      .catch((error: unknown) => error);

    expect(String(failure)).toMatch(/anthropic turn/);
    expect(vendor.received).toEqual([]);
  });
});
