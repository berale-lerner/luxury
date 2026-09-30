/**
 * Editing a table document in the admin screen: pasting cells copied from
 * Google Sheets or Excel, and the edits that grow or shrink a table.
 *
 * Frontend is deliberately almost untested (TESTING.md). This is pure logic
 * whose failure is silent — a paste that shifts one column puts every value
 * under the wrong heading, and the model reads it that way.
 */
import { describe, expect, it } from 'vitest';
import {
  addColumn,
  MAX_COLUMNS,
  MAX_ROWS,
  parseClipboard,
  pasteInto,
  removeColumn,
  removeRow,
  setCell,
} from '../../apps/admin/web/src/pages/agents/table.js';

describe('reading the clipboard', () => {
  it('splits tabs into cells and lines into rows, without a trailing empty row', () => {
    expect(parseClipboard('a\tb\nc\td\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('accepts Windows line endings', () => {
    expect(parseClipboard('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps a quoted cell whole, with its newline, tab and doubled quotes', () => {
    expect(parseClipboard('"two\nlines"\t"say ""hi"""\t"a\tb"\nx\ty\tz')).toEqual([
      ['two\nlines', 'say "hi"', 'a\tb'],
      ['x', 'y', 'z'],
    ]);
  });

  it('keeps empty cells in place', () => {
    expect(parseClipboard('a\t\tc\n\tb\t')).toEqual([
      ['a', '', 'c'],
      ['', 'b', ''],
    ]);
  });

  it('leaves a single value to the browser', () => {
    expect(parseClipboard('just text')).toBeNull();
    expect(parseClipboard('just text\n')).toBeNull();
    expect(parseClipboard('')).toBeNull();
  });
});

describe('pasting into a table', () => {
  const table = { columns: ['A', 'B'], rows: [['1', '2']] };

  it('overwrites from the cell it lands on, growing to fit', () => {
    const { table: pasted, clipped } = pasteInto(table, { row: 0, col: 1 }, [
      ['x', 'y'],
      ['z', 'w'],
    ]);
    expect(pasted).toEqual({
      columns: ['A', 'B', ''],
      rows: [
        ['1', 'x', 'y'],
        ['', 'z', 'w'],
      ],
    });
    expect(clipped).toBe(false);
  });

  it('onto the header, names the columns from the first line — a whole sheet at once', () => {
    const { table: pasted } = pasteInto(table, { row: -1, col: 0 }, [
      ['Season', 'Check-in', 'Note'],
      ['Summer', '15:00', ''],
    ]);
    expect(pasted).toEqual({
      columns: ['Season', 'Check-in', 'Note'],
      rows: [['Summer', '15:00', '']],
    });
  });

  it('keeps every row one cell per column when lines differ in length', () => {
    const { table: pasted } = pasteInto(table, { row: 0, col: 0 }, [['only'], ['a', 'b', 'c']]);
    for (const row of pasted.rows) expect(row).toHaveLength(pasted.columns.length);
  });

  it('stops at the limits the server enforces, and says so', () => {
    const wide = [Array.from({ length: MAX_COLUMNS + 5 }, (_, i) => `c${i}`)];
    const tall = Array.from({ length: MAX_ROWS + 5 }, () => ['r']);

    const across = pasteInto(table, { row: 0, col: 0 }, wide);
    expect(across.table.columns).toHaveLength(MAX_COLUMNS);
    expect(across.clipped).toBe(true);

    const down = pasteInto(table, { row: 0, col: 0 }, tall);
    expect(down.table.rows).toHaveLength(MAX_ROWS);
    expect(down.clipped).toBe(true);
  });
});

describe('editing cells, rows and columns', () => {
  const table = { columns: ['A', 'B'], rows: [['1', '2'], ['3', '4']] };

  it('renames a column through the header row', () => {
    expect(setCell(table, { row: -1, col: 1 }, 'Beta').columns).toEqual(['A', 'Beta']);
  });

  it('removes a column from the header and from every row', () => {
    expect(removeColumn(table, 0)).toEqual({ columns: ['B'], rows: [['2'], ['4']] });
  });

  it('never removes the last column', () => {
    const single = { columns: ['A'], rows: [['1']] };
    expect(removeColumn(single, 0)).toBe(single);
  });

  it('adds a column with an empty cell in every row', () => {
    expect(addColumn(table).rows).toEqual([
      ['1', '2', ''],
      ['3', '4', ''],
    ]);
  });

  it('removes one row', () => {
    expect(removeRow(table, 0).rows).toEqual([['3', '4']]);
  });
});
