import type { ToolDefinition } from '../agent/index.js';

/**
 * What one tool returns to the toolbox.
 *
 * `params` is what gets logged: the arguments after validation, so a log
 * line never carries whatever raw text the model sent. `output` is what the
 * model reads, and therefore what the guest may be quoted — it is already
 * shrunk by the tool (CLAUDE.md, "Agent tools").
 */
export type ToolOutcome =
  | { readonly ok: true; readonly params: Record<string, unknown>; readonly output: unknown }
  | {
      readonly ok: false;
      /** For the log: why, in a word. */
      readonly reason: string;
      /** For the model: what went wrong and what to do about it. */
      readonly message: string;
      readonly params?: Record<string, unknown>;
    };

/**
 * One tool: a definition the model reads, and a function the code runs.
 *
 * `run` validates its own arguments. The schema in the definition is advice
 * to the model; nothing relies on the model having followed it.
 */
export interface AgentTool {
  readonly definition: ToolDefinition;
  run(args: unknown): Promise<ToolOutcome>;
}
