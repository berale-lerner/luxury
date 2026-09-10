/**
 * How an ordered set of documents becomes one system prompt.
 *
 * Here, and nowhere else. Three callers assemble a prompt — the preview in the
 * admin interface, the publish that freezes it, and the bootstrap script that
 * seeds a fresh database from files — and a preview that does not produce
 * byte-for-byte what publish stores is not a preview, it is a decoration.
 *
 * Pure, so it belongs in shared: no data access, no environment, no
 * dependencies (CLAUDE.md, packages/shared).
 */

/** Between documents. Part of the stored text, so changing it changes prompts. */
export const PROMPT_SEPARATOR = '\n\n---\n\n';

export interface PromptDocument {
  readonly title: string;
  readonly body: string;
  /** Assembly is concatenation, so order is part of the meaning. */
  readonly position: number;
  /** A document kept but not served. Absent counts as active. */
  readonly isActive?: boolean;
}

/**
 * Orders by position, drops the inactive ones, and joins.
 *
 * Bodies are trimmed individually: a trailing newline inside a document would
 * otherwise widen the gap between two of them, and which gap is wider is not
 * something anyone edits deliberately.
 */
export function assemblePrompt(documents: readonly PromptDocument[]): string {
  return [...documents]
    .filter((document) => document.isActive !== false)
    .sort((a, b) => a.position - b.position)
    .map((document) => document.body.trim())
    .filter((body) => body.length > 0)
    .join(PROMPT_SEPARATOR);
}
