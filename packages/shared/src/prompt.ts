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

/** The two kinds of document (migration 0013). Absent counts as text. */
export type PromptDocumentKind = 'text' | 'table';

/**
 * A table document's cells. The columns are the manager's to name; nothing
 * about them is known to the code. Every row has one cell per column.
 */
export interface PromptTable {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export interface PromptDocument {
  readonly title: string;
  /** A text document's content. Unused by a table. */
  readonly body: string;
  readonly kind?: PromptDocumentKind;
  /** A table document's content. Null or absent for text. */
  readonly table?: PromptTable | null;
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
    .map(renderDocument)
    .filter((body) => body.length > 0)
    .join(PROMPT_SEPARATOR);
}

function renderDocument(document: PromptDocument): string {
  if (document.kind === 'table') {
    return document.table ? renderTable(document.title, document.table) : '';
  }
  return document.body.trim();
}

/**
 * A table as the model reads it: a Markdown table under its title.
 *
 * The title is included, unlike a text document's. A text document carries
 * its own headings in its body; a table has nowhere else to say what it is,
 * and rows with no heading above them leave the model to guess.
 *
 * Rows with nothing in them are dropped, and a table with no rows left
 * renders as nothing — an empty table tells the model nothing and still
 * costs it a header. Cells are made safe for the one-line cell syntax: a `|`
 * would end the cell and a newline would end the row.
 */
export function renderTable(title: string, table: PromptTable): string {
  const width = table.columns.length;
  if (width === 0) return '';

  const cell = (value: string | undefined) =>
    (value ?? '').trim().replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const line = (cells: readonly string[]) => `| ${cells.join(' | ')} |`;

  const rows = table.rows
    .map((row) => Array.from({ length: width }, (_, index) => cell(row[index])))
    .filter((row) => row.some((value) => value.length > 0));
  if (rows.length === 0) return '';

  const heading = title.trim();
  return [
    ...(heading ? [`## ${heading}`, ''] : []),
    line(table.columns.map((column) => cell(column))),
    line(table.columns.map(() => '---')),
    ...rows.map(line),
  ].join('\n');
}
