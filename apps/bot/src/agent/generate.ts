import { ModelCallError } from './model.js';
import type {
  ConversationTurn,
  ModelClient,
  ModelRequest,
  ModelResponse,
  ToolCall,
  ToolResult,
  ToolRound,
} from './model.js';
import type { Toolbox, ToolLog } from './toolbox.js';

export interface AgentReply {
  readonly text: string;
  readonly promptVersion: number;
}

export interface AgentDeps {
  readonly model: ModelClient;
  readonly maxTokens?: number;
  /**
   * How many times to ask before giving up. Two: one retry covers the single
   * unlucky call, which is the common failure, and a third would spend more
   * of the webhook's budget than the odds justify.
   */
  readonly attempts?: number;
  /**
   * The ceiling on one call. A provider that hangs is indistinguishable from
   * one that is slow, and without this the first attempt can consume the
   * whole request on its own — the failure actually seen in production took
   * twenty seconds to arrive.
   */
  readonly timeoutMs?: number;
  /** Between attempts. Short: the request is being held open meanwhile. */
  readonly backoffMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
  /** What the model may ask for. Absent: it answers from the prompt alone. */
  readonly toolbox?: Toolbox;
  /**
   * How many times the model may ask for tools before it must answer. A
   * guest's question needs one lookup, occasionally two (other dates); more
   * than that is a model going round in circles on the guest's time.
   */
  readonly maxToolRounds?: number;
  /** Calls answered per round. Extra calls in the same turn are refused. */
  readonly maxCallsPerRound?: number;
}

const DEFAULT_ATTEMPTS = 2;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_BACKOFF_MS = 700;
const DEFAULT_MAX_TOOL_ROUNDS = 3;
const DEFAULT_MAX_CALLS_PER_ROUND = 3;

/** The model kept asking for tools after it had been told to answer. */
export class ToolLoopError extends Error {
  constructor(provider: string, rounds: number) {
    super(`${provider} was still asking for tools after ${rounds} rounds.`);
    this.name = 'ToolLoopError';
  }
}

/** The model did not answer in time. Retryable, unlike a refusal. */
export class ModelTimeoutError extends Error {
  constructor(provider: string, timeoutMs: number) {
    super(`${provider} did not answer within ${timeoutMs}ms`);
    this.name = 'ModelTimeoutError';
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Whether asking again could plausibly help.
 *
 * A timeout, yes — it says nothing about whether the provider is willing. A
 * ModelCallError carries the adapter's own judgement. Anything else is an
 * unfamiliar failure, and one more attempt is a cheaper bet than giving up on
 * a bug in our own code.
 */
function worthRetrying(error: unknown): boolean {
  if (error instanceof ModelCallError) return error.retryable;
  return true;
}

/**
 * One call, bounded in time.
 *
 * The timer is cleared on both paths: a pending timeout would otherwise hold
 * the process open for its full duration after a reply has already been sent.
 */
async function completeWithin(
  model: ModelClient,
  request: Parameters<ModelClient['complete']>[0],
  timeoutMs: number,
) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      model.complete(request),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new ModelTimeoutError(model.provider, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * One model call that produced something usable, with the retry policy.
 *
 * Two things are never retried. A refusal is not a failure: the model
 * answered, and the answer was no. And an exhausted quota is not bad luck —
 * found in production as a 429 naming the minute it would return, where a
 * second attempt spent another unit of the very thing that had run out.
 */
async function ask(deps: AgentDeps, request: ModelRequest): Promise<ModelResponse> {
  const attempts = deps.attempts ?? DEFAULT_ATTEMPTS;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const backoffMs = deps.backoffMs ?? DEFAULT_BACKOFF_MS;
  const sleep = deps.sleep ?? wait;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await completeWithin(deps.model, request, timeoutMs);
    } catch (error) {
      // A refusal never arrives here — it comes back as a response, below.
      lastError = error;
      if (!worthRetrying(error)) break;
      if (attempt < attempts) await sleep(backoffMs);
      continue;
    }

    if (response.kind === 'refusal') {
      // Not a failure to answer. Retrying would be arguing with it.
      throw new AgentRefusedError(deps.model.provider, response.category);
    }

    if (response.kind === 'text' && response.text.trim().length === 0) {
      // An empty answer is a broken call, not a decision, so it is worth
      // another go — but not an infinite one.
      lastError = new Error(`${deps.model.provider} returned no text to send.`);
      if (attempt < attempts) await sleep(backoffMs);
      continue;
    }

    return response;
  }

  throw lastError ?? new Error(`${deps.model.provider} did not answer.`);
}

/** A result the code wrote itself, telling the model why a call was not run. */
function refused(call: ToolCall, reason: string): ToolResult {
  return { callId: call.id, name: call.name, content: JSON.stringify({ error: reason }), isError: true };
}

/**
 * Runs what the model asked for. Every call gets a result — the providers
 * require one per call — but only the first few are actually run.
 */
async function runCalls(
  toolbox: Toolbox,
  calls: readonly ToolCall[],
  maxCalls: number,
  log: ToolLog,
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  for (const [index, call] of calls.entries()) {
    if (index >= maxCalls) {
      results.push(refused(call, 'Too many lookups at once. Use the results you already have.'));
      continue;
    }
    // Sequential, not parallel: each call is an external request, and a
    // model that asks for many at once should not multiply the load.
    results.push(await toolbox.run(call, log));
  }
  return results;
}

/**
 * Asks the model for a reply, running the tools it asks for along the way.
 *
 * The loop is ours rather than an SDK's tool runner, because this is where
 * "the model requests, the code decides" happens: which tools exist, how many
 * calls are answered, and that the model has to stop asking and answer. It
 * also has to work the same for both providers, which no vendor's runner does.
 *
 * Depends on the ModelClient port, not on any provider's SDK. Credentials live
 * in whatever the caller constructed and never reach the model's context
 * (CLAUDE.md). The tool exchanges exist only inside this call: the guest sees
 * the answer, and the conversation stores only the answer.
 *
 * Retries are per model call (see ask()), so a failure after a lookup does
 * not repeat the lookup.
 */
export async function generateReply(
  deps: AgentDeps,
  systemPrompt: string,
  promptVersion: number,
  history: readonly ConversationTurn[],
  context?: string,
  log: ToolLog = () => {},
): Promise<AgentReply> {
  const maxRounds = deps.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  const maxCalls = deps.maxCallsPerRound ?? DEFAULT_MAX_CALLS_PER_ROUND;
  const tools = deps.toolbox?.definitions ?? [];
  const rounds: ToolRound[] = [];

  for (;;) {
    const response = await ask(deps, {
      systemPrompt,
      turns: history,
      ...(context !== undefined ? { context } : {}),
      ...(deps.maxTokens !== undefined ? { maxTokens: deps.maxTokens } : {}),
      ...(tools.length > 0 ? { tools } : {}),
      ...(rounds.length > 0 ? { toolRounds: rounds } : {}),
    });

    if (response.kind === 'text') {
      return { text: response.text.trim(), promptVersion };
    }
    if (response.kind !== 'tool_calls') {
      throw new Error(`${deps.model.provider} returned an unexpected response.`);
    }

    if (!deps.toolbox || rounds.length > maxRounds) {
      // Asked for a tool it was never offered, or kept asking after being
      // told to stop: either way there is no answer to send.
      throw new ToolLoopError(deps.model.provider, rounds.length);
    }

    const results =
      rounds.length === maxRounds
        ? // One last round in which nothing runs: every call is answered with
          // an instruction to reply now. A model that asks again after this
          // ends the loop above.
          response.calls.map((call) =>
            refused(call, 'No more lookups in this reply. Answer the guest with what you have.'),
          )
        : await runCalls(deps.toolbox, response.calls, maxCalls, log);

    rounds.push({ turn: response.turn, results });
  }
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
