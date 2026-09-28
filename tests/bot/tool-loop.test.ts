/**
 * The tool loop in generateReply, and the toolbox it runs calls through.
 *
 * The model is scripted: each test says what it answers, call by call, and
 * reads back what it was sent. That is enough to check what the loop decides
 * — which calls are run, what goes back, and when the model must stop asking
 * — without a provider in the way. The providers' wire formats are in
 * provider-tools.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  AgentRefusedError,
  generateReply,
  ModelCallError,
  ToolLoopError,
  type ModelClient,
  type ModelRequest,
  type ModelResponse,
  type ToolCall,
} from '../../apps/bot/src/agent/index.js';
import { createToolbox, type AgentTool } from '../../apps/bot/src/tools/index.js';

const HISTORY = [{ role: 'user' as const, text: 'Anything free 12–15 October for two?' }];

/** A model that answers from a script and keeps every request it was sent. */
function scripted(...answers: (ModelResponse | Error)[]) {
  const requests: ModelRequest[] = [];
  const model: ModelClient = {
    provider: 'scripted',
    async complete(request) {
      requests.push(structuredClone(request));
      const next = answers.shift();
      if (!next) throw new Error('the script ran out');
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return { model, requests };
}

function callsFor(...calls: ToolCall[]): ModelResponse {
  return { kind: 'tool_calls', calls, turn: { provider: 'scripted', payload: { calls: calls.map((c) => c.id) } } };
}

const call = (id: string, name = 'lookup', args: unknown = { q: id }): ToolCall => ({ id, name, arguments: args });
const text = (value: string): ModelResponse => ({ kind: 'text', text: value });

/** A tool that records what it ran and answers with its input. */
function recordingTool(name = 'lookup') {
  const ran: unknown[] = [];
  const tool: AgentTool = {
    definition: { name, description: 'test', parameters: { type: 'object', properties: {} } },
    async run(args) {
      ran.push(args);
      return { ok: true, params: { args }, output: { echoed: args } };
    },
  };
  return { tool, ran };
}

const noSleep = async () => {};

describe('the loop', () => {
  it('runs what the model asked for, sends the results back, and returns the answer', async () => {
    const { tool, ran } = recordingTool();
    const { model, requests } = scripted(callsFor(call('c1')), text('Yes, two are free.'));

    const reply = await generateReply({ model, toolbox: createToolbox([tool]) }, 'prompt', 7, HISTORY);

    expect(reply).toEqual({ text: 'Yes, two are free.', promptVersion: 7 });
    expect(ran).toEqual([{ q: 'c1' }]);
    expect(requests[0]!.tools!.map((t) => t.name)).toEqual(['lookup']);
    expect(requests[0]!.toolRounds).toBeUndefined();

    const round = requests[1]!.toolRounds![0]!;
    expect(round.turn).toEqual({ provider: 'scripted', payload: { calls: ['c1'] } });
    expect(round.results).toEqual([
      { callId: 'c1', name: 'lookup', content: JSON.stringify({ echoed: { q: 'c1' } }), isError: false },
    ]);
  });

  it('answers every call in a turn, running only the first three', async () => {
    const { tool, ran } = recordingTool();
    const { model, requests } = scripted(
      callsFor(call('a'), call('b'), call('c'), call('d')),
      text('done'),
    );

    await generateReply({ model, toolbox: createToolbox([tool]) }, 'prompt', 1, HISTORY);

    expect(ran).toHaveLength(3);
    const results = requests[1]!.toolRounds![0]!.results;
    expect(results.map((r) => [r.callId, r.isError])).toEqual([
      ['a', false],
      ['b', false],
      ['c', false],
      ['d', true],
    ]);
  });

  it('after three rounds, answers further calls with "answer now" instead of running them', async () => {
    const { tool, ran } = recordingTool();
    const { model, requests } = scripted(
      callsFor(call('1')),
      callsFor(call('2')),
      callsFor(call('3')),
      callsFor(call('4')),
      text('Here is what I found.'),
    );

    const reply = await generateReply({ model, toolbox: createToolbox([tool]) }, 'prompt', 1, HISTORY);

    expect(reply.text).toBe('Here is what I found.');
    expect(ran).toEqual([{ q: '1' }, { q: '2' }, { q: '3' }]);
    const last = requests[4]!.toolRounds![3]!.results[0]!;
    expect(last.isError).toBe(true);
    expect(last.content).toMatch(/Answer the guest/);
  });

  it('gives up if the model keeps asking after being told to answer', async () => {
    const { tool } = recordingTool();
    const { model } = scripted(...Array.from({ length: 6 }, (_, i) => callsFor(call(String(i)))));

    await expect(
      generateReply({ model, toolbox: createToolbox([tool]) }, 'prompt', 1, HISTORY),
    ).rejects.toBeInstanceOf(ToolLoopError);
  });

  it('offers no tools without a toolbox, and fails if the model calls one anyway', async () => {
    const { model, requests } = scripted(callsFor(call('x')));

    await expect(generateReply({ model }, 'prompt', 1, HISTORY)).rejects.toBeInstanceOf(ToolLoopError);
    expect(requests[0]!.tools).toBeUndefined();
  });

  it('retries a failed model call without running the lookup again', async () => {
    const { tool, ran } = recordingTool();
    const { model } = scripted(
      callsFor(call('c1')),
      new ModelCallError('scripted', true, 503),
      text('Found it.'),
    );

    const reply = await generateReply(
      { model, toolbox: createToolbox([tool]), sleep: noSleep },
      'prompt',
      1,
      HISTORY,
    );

    expect(reply.text).toBe('Found it.');
    expect(ran).toHaveLength(1);
  });

  it('still treats a refusal after a lookup as a refusal', async () => {
    const { tool } = recordingTool();
    const { model } = scripted(callsFor(call('c1')), { kind: 'refusal', category: 'cyber' });

    await expect(
      generateReply({ model, toolbox: createToolbox([tool]) }, 'prompt', 1, HISTORY),
    ).rejects.toBeInstanceOf(AgentRefusedError);
  });

  it('logs each call through the logger it was given', async () => {
    const { tool } = recordingTool();
    const { model } = scripted(callsFor(call('c1')), text('ok'));
    const events: Record<string, unknown>[] = [];

    await generateReply(
      { model, toolbox: createToolbox([tool]) },
      'prompt',
      1,
      HISTORY,
      undefined,
      (event) => events.push(event),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: 'agent.tool', tool: 'lookup', ok: true, params: { args: { q: 'c1' } } });
    expect(typeof events[0]!['ms']).toBe('number');
  });
});

describe('the toolbox', () => {
  it('refuses a tool it does not have, as a result the model can read', async () => {
    const toolbox = createToolbox([recordingTool().tool]);
    const events: Record<string, unknown>[] = [];

    const result = await toolbox.run(call('c1', 'send_message', { to: 'x' }), (e) => events.push(e));

    expect(result.isError).toBe(true);
    expect(result.callId).toBe('c1');
    expect(events[0]).toMatchObject({ ok: false, reason: 'unknown_tool' });
  });

  it('turns a tool that throws into a result, without its message', async () => {
    const broken: AgentTool = {
      definition: { name: 'broken', description: 'x', parameters: { type: 'object' } },
      async run() {
        throw new TypeError('password=hunter2 in a message nobody reviewed');
      },
    };
    const events: Record<string, unknown>[] = [];

    const result = await createToolbox([broken]).run(call('c1', 'broken'), (e) => events.push(e));

    expect(result.isError).toBe(true);
    expect(result.content).not.toContain('hunter2');
    expect(JSON.stringify(events)).not.toContain('hunter2');
    expect(events[0]).toMatchObject({ ok: false, reason: 'exception', error: 'TypeError' });
  });

  it('passes a refusal from the tool to the model, and logs its reason and parameters', async () => {
    const refusing: AgentTool = {
      definition: { name: 'picky', description: 'x', parameters: { type: 'object' } },
      async run() {
        return { ok: false, reason: 'out_of_range', message: 'check_in is in the past.', params: { check_in: '2020-01-01' } };
      },
    };
    const events: Record<string, unknown>[] = [];

    const result = await createToolbox([refusing]).run(call('c1', 'picky'), (e) => events.push(e));

    expect(JSON.parse(result.content)).toEqual({ error: 'check_in is in the past.' });
    expect(events[0]).toMatchObject({ ok: false, reason: 'out_of_range', params: { check_in: '2020-01-01' } });
  });

  it('lists only the tools it was built with — there is no send tool', () => {
    const toolbox = createToolbox([recordingTool('check_availability').tool]);
    expect(toolbox.definitions.map((d) => d.name)).toEqual(['check_availability']);
  });
});
