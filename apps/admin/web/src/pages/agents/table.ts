import type { PromptTable } from '../../types.js';

/**
 * Editing a table document's cells, as pure functions.
 *
 * Every function returns a new table and keeps the one invariant the server
 * checks (apps/admin/server/src/prompts/routes.ts): each row has exactly one
 * cell per column. The limits match the server's, so an edit the screen
 * accepts is never one the save refuses.
 */

export const MAX_COLUMNS = 30;
export const MAX_ROWS = 500;

/** Where a paste lands. Row -1 is the header: the column names. */
export interface CellAddress {
  readonly row: number;
  readonly col: number;
}

export function setCell(table: PromptTable, at: CellAddress, value: string): PromptTable {
  if (at.row < 0) {
    return { ...table, columns: table.columns.map((name, col) => (col === at.col ? value : name)) };
  }
  return {
    ...table,
    rows: table.rows.map((row, index) =>
      index === at.row ? row.map((cell, col) => (col === at.col ? value : cell)) : row,
    ),
  };
}

export function addRow(table: PromptTable): PromptTable {
  if (table.rows.length >= MAX_ROWS) return table;
  return { ...table, rows: [...table.rows, table.columns.map(() => '')] };
}

export function removeRow(table: PromptTable, index: number): PromptTable {
  return { ...table, rows: table.rows.filter((_, row) => row !== index) };
}

export function addColumn(table: PromptTable): PromptTable {
  if (table.columns.length >= MAX_COLUMNS) return table;
  return { columns: [...table.columns, ''], rows: table.rows.map((row) => [...row, '']) };
}

/** The last column stays: a table with no columns has nowhere to type. */
export function removeColumn(table: PromptTable, index: number): PromptTable {
  if (table.columns.length <= 1) return table;
  return {
    columns: table.columns.filter((_, col) => col !== index),
    rows: table.rows.map((row) => row.filter((_, col) => col !== index)),
  };
}

/**
 * Cells copied from Google Sheets or Excel, as the clipboard carries them:
 * tab between cells, newline between rows. A cell holding a tab, a newline or
 * a quote comes wrapped in quotes, with its own quotes doubled.
 *
 * Plain text with neither a tab nor a newline is one cell, and returns null:
 * that is an ordinary paste into a cell, and the browser handles it better.
 */
export function parseClipboard(text: string): string[][] | null {
  if (!text.includes('\t') && !/[\r\n]/.test(text.replace(/[\r\n]+$/, ''))) return null;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let index = 0;

  while (index < text.length) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 2;
        continue;
      }
      if (char === '"') quoted = false;
      else cell += char;
      index += 1;
      continue;
    }
    if (char === '"' && cell === '') quoted = true;
    else if (char === '\t') {
      row.push(cell);
      cell = '';
    } else if (char === '\r' || char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && text[index + 1] === '\n') index += 1;
    } else cell += char;
    index += 1;
  }
  // A copied range ends with a newline; that is not an empty last row.
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Writes a pasted block into the table starting at one cell, growing the
 * table to fit. Pasted onto the header, the first line names the columns and
 * the rest fill rows from the top, which is how a whole sheet comes in at
 * once. Whatever falls past the limits is left out, and `clipped` says so.
 */
export function pasteInto(
  table: PromptTable,
  at: CellAddress,
  block: readonly (readonly string[])[],
): { table: PromptTable; clipped: boolean } {
  const header = at.row < 0 ? block[0] : undefined;
  const body = at.row < 0 ? block.slice(1) : block;
  const firstRow = Math.max(at.row, 0);

  const widest = Math.max(header?.length ?? 0, ...body.map((line) => line.length));
  const width = Math.min(Math.max(table.columns.length, at.col + widest), MAX_COLUMNS);
  const height = Math.min(Math.max(table.rows.length, firstRow + body.length), MAX_ROWS);
  const clipped = at.col + widest > MAX_COLUMNS || firstRow + body.length > MAX_ROWS;

  const pad = (cells: readonly string[]) =>
    Array.from({ length: width }, (_, col) => cells[col] ?? '');

  const columns = pad(table.columns);
  header?.forEach((value, offset) => {
    if (at.col + offset < width) columns[at.col + offset] = value;
  });

  const rows = Array.from({ length: height }, (_, index) => pad(table.rows[index] ?? []));
  body.forEach((line, lineIndex) => {
    const target = rows[firstRow + lineIndex];
    if (!target) return;
    line.forEach((value, offset) => {
      if (at.col + offset < width) target[at.col + offset] = value;
    });
  });

  return { table: { columns, rows }, clipped };
}
