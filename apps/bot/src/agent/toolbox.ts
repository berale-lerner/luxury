import type { ToolCall, ToolDefinition, ToolResult } from './model.js';

/** Where a tool reports what it did. Structured, never message content. */
export type ToolLog = (event: Record<string, unknown>) => void;

/**
 * The tools this agent may ask for, and the one way to run them.
 *
 * A port, like ModelClient: the agent layer knows this shape and nothing
 * about any particular tool, so tools/ can grow without the model layer
 * learning what a reservation is. `run` never throws — an unknown tool, bad
 * arguments or a failed lookup all come back as a result with `isError`, for
 * the model to read and explain.
 */
export interface Toolbox {
  readonly definitions: readonly ToolDefinition[];
  run(call: ToolCall, log: ToolLog): Promise<ToolResult>;
}
