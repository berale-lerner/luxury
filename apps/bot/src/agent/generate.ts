import { ModelCallError } from './model.js';
import type { ConversationTurn, ModelClient } from './model.js';

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
}

const DEFAULT_ATTEMPTS = 2;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_BACKOFF_MS = 700;

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
 * Asks the model for a reply.
 *
 * It has no tools. This slice answers from the knowledge the owner wrote into
 * the system prompt; availability lookups come later, and adding them means
 * adding a tool with its own validation and output whitelist — not loosening
 * anything here.
 *
 * Depends on the ModelClient port, not on any provider's SDK, so swapping the
 * provider is a change in one adapter file. Credentials live in whatever the
 * caller constructed and never reach the model's context (CLAUDE.md).
 *
 * Retries live here rather than in each adapter: an unlucky call is not a
 * property of any one vendor, and writing it twice is how the two end up
 * behaving slightly differently. Which failures are worth retrying is the
 * adapter's call, carried on ModelCallError — this loop asks, it does not
 * inspect anyone's error shape.
 *
 * Two things are never retried. A refusal is not a failure: the model
 * answered, and the answer was no. And an exhausted quota is not bad luck —
 * found in production as a 429 naming the minute it would return, where a
 * second attempt spent another unit of the very thing that had run out.
 */
export async function generateReply(
  deps: AgentDeps,
  systemPrompt: string,
  promptVersion: number,
  history: readonly ConversationTurn[],
  context?: string,
): Promise<AgentReply> {
  const attempts = deps.attempts ?? DEFAULT_ATTEMPTS;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const backoffMs = deps.backoffMs ?? DEFAULT_BACKOFF_MS;
  const sleep = deps.sleep ?? wait;

  const request = {
    systemPrompt,
    turns: history,
    ...(context !== undefined ? { context } : {}),
    ...(deps.maxTokens !== undefined ? { maxTokens: deps.maxTokens } : {}),
  };

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

    const text = response.text.trim();
    if (text.length === 0) {
      // An empty answer is a broken call, not a decision, so it is worth
      // another go — but not an infinite one.
      lastError = new Error(`${deps.model.provider} returned no text to send.`);
      if (attempt < attempts) await sleep(backoffMs);
      continue;
    }

    return { text, promptVersion };
  }

  throw lastError ?? new Error(`${deps.model.provider} did not answer.`);
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
