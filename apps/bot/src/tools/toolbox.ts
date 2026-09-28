import type { ToolCall, ToolResult, Toolbox, ToolLog } from '../agent/index.js';
import type { AgentTool } from './tool.js';

/**
 * The Toolbox the agent is given: the listed tools and nothing else.
 *
 * Everything common to every tool is here, once — unknown names, failures,
 * and the log line CLAUDE.md requires for every call (name, validated
 * parameters, duration, outcome). A tool only validates, calls its use case
 * and shrinks.
 */
export function createToolbox(tools: readonly AgentTool[]): Toolbox {
  const byName = new Map(tools.map((tool) => [tool.definition.name, tool]));

  return {
    definitions: tools.map((tool) => tool.definition),

    async run(call: ToolCall, log: ToolLog): Promise<ToolResult> {
      const answer = (content: unknown, isError: boolean): ToolResult => ({
        callId: call.id,
        name: call.name,
        content: JSON.stringify(content),
        isError,
      });

      const tool = byName.get(call.name);
      if (!tool) {
        // The name is the model's text; it is logged because it is short and
        // says what the model tried, which is the point of this line.
        log({ event: 'agent.tool', tool: call.name.slice(0, 64), ok: false, reason: 'unknown_tool', ms: 0 });
        return answer({ error: 'There is no tool by that name.' }, true);
      }

      const started = Date.now();
      try {
        const outcome = await tool.run(call.arguments);
        const ms = Date.now() - started;
        if (outcome.ok) {
          log({ event: 'agent.tool', tool: call.name, params: outcome.params, ok: true, ms });
          return answer(outcome.output, false);
        }
        log({
          event: 'agent.tool',
          tool: call.name,
          ...(outcome.params ? { params: outcome.params } : {}),
          ok: false,
          reason: outcome.reason,
          ms,
        });
        return answer({ error: outcome.message }, true);
      } catch (error) {
        // A bug in a tool must not become a guest-facing stack trace, and its
        // message is not trusted to be free of what it was handling.
        log({
          event: 'agent.tool',
          tool: call.name,
          ok: false,
          reason: 'exception',
          error: error instanceof Error ? error.name : typeof error,
          ms: Date.now() - started,
        });
        return answer({ error: 'The lookup failed. Do not guess; offer to have the team confirm.' }, true);
      }
    },
  };
}
