import { useEffect, useRef, useState, type ClipboardEvent, type FocusEvent } from 'react';
import type { PromptTable } from '../../types';
import {
  addColumn,
  addRow,
  MAX_COLUMNS,
  MAX_ROWS,
  parseClipboard,
  pasteInto,
  removeColumn,
  removeRow,
  setCell,
  type CellAddress,
} from './table';

/**
 * A table document: columns the manager names, cells edited in place.
 *
 * Cells copied from Google Sheets or Excel paste as cells — onto the header
 * row, the first line names the columns — which is how existing content gets
 * in. The table is saved when focus leaves it, not on every keystroke.
 */
export function TableEditor({
  initial,
  onSave,
}: {
  readonly initial: PromptTable;
  /** Resolves true once the server has it. */
  readonly onSave: (table: PromptTable) => Promise<boolean>;
}) {
  const [table, setTable] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const dirty = table !== saved;

  const save = () => {
    if (!dirty) return;
    const sent = table;
    void onSave(sent).then((ok) => {
      if (ok) setSaved(sent);
    });
  };

  // Leaving for another document unmounts this one. Whatever was typed and
  // not yet saved goes with it unless it is sent on the way out.
  const pending = useRef({ dirty, table, onSave });
  pending.current = { dirty, table, onSave };
  useEffect(
    () => () => {
      if (pending.current.dirty) void pending.current.onSave(pending.current.table);
    },
    [],
  );

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    save();
  };

  const onPaste = (at: CellAddress) => (event: ClipboardEvent<HTMLInputElement>) => {
    const parsed = parseClipboard(event.clipboardData.getData('text/plain'));
    if (!parsed) return;
    event.preventDefault();
    // A cell is a one-line field here, which would silently drop a line
    // break; a space keeps the words apart.
    const block = parsed.map((line) => line.map((value) => value.replace(/\s*\r?\n\s*/g, ' ')));
    const result = pasteInto(table, at, block);
    setTable(result.table);
    const rows = at.row < 0 ? block.length - 1 : block.length;
    setNotice(
      result.clipped
        ? `הודבק חלקית — עד ${MAX_COLUMNS} עמודות ו-${MAX_ROWS} שורות`
        : `הודבקו ${rows} שורות`,
    );
  };

  const cell = (at: CellAddress, value: string, label: string) => (
    <input
      className="cell"
      value={value}
      aria-label={label}
      dir="auto"
      onChange={(event) => setTable(setCell(table, at, event.target.value))}
      onPaste={onPaste(at)}
    />
  );

  return (
    <div className="table-editor" onBlur={onBlur}>
      <div className="table-scroll">
        <table className="edit-grid">
          <thead>
            <tr>
              {table.columns.map((name, col) => (
                <th key={col}>
                  <div className="column-head">
                    {cell({ row: -1, col }, name, `שם עמודה ${col + 1}`)}
                    <button
                      type="button"
                      className="cell-remove"
                      title="מחיקת עמודה"
                      aria-label={`מחיקת עמודה ${name || col + 1}`}
                      disabled={table.columns.length <= 1}
                      onClick={() => setTable(removeColumn(table, col))}
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
              <th className="grid-action">
                <button
                  type="button"
                  className="icon-btn"
                  title="עמודה חדשה"
                  aria-label="עמודה חדשה"
                  disabled={table.columns.length >= MAX_COLUMNS}
                  onClick={() => setTable(addColumn(table))}
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, col) =>
                  <td key={col}>{cell({ row: rowIndex, col }, value, `שורה ${rowIndex + 1}, ${table.columns[col] || `עמודה ${col + 1}`}`)}</td>,
                )}
                <td className="grid-action">
                  <button
                    type="button"
                    className="cell-remove"
                    title="מחיקת שורה"
                    aria-label={`מחיקת שורה ${rowIndex + 1}`}
                    onClick={() => setTable(removeRow(table, rowIndex))}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row-actions">
        <button
          type="button"
          className="icon-btn wide"
          disabled={table.rows.length >= MAX_ROWS}
          onClick={() => setTable(addRow(table))}
        >
          + שורה
        </button>
        <button type="button" className="primary" disabled={!dirty} onClick={save}>
          שמירה
        </button>
        <span className="hint">
          {dirty ? 'לא נשמר עדיין' : 'נשמר'} · {table.rows.length} שורות
          {notice ? ` · ${notice}` : ''}
        </span>
      </div>
      <p className="hint">
        אפשר להעתיק תאים מ-Google Sheets או Excel ולהדביק כאן. הדבקה על שורת הכותרות: השורה
        הראשונה הופכת לשמות העמודות. שורות ריקות לא נשלחות לסוכן.
      </p>
    </div>
  );
}
