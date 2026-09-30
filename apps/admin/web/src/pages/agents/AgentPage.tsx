import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api';
import { shortDate } from '../../format';
import { Link, navigate } from '../../shell/router';
import type { PromptDocument, PromptState, PromptTable, PromptVersion } from '../../types';
import { TableEditor } from './TableEditor';
import { TextEditor } from './TextEditor';

const REFUSAL: Record<string, string> = {
  empty: 'אין מה לפרסם — כל המסמכים ריקים או כבויים',
  unchanged: 'הטקסט זהה לגרסה שכבר משרתת',
  no_agent: 'הסוכן לא נמצא',
  not_found: 'המסמך כבר לא קיים',
  bad_order: 'הסדר לא תקין',
  bad_request: 'הקלט לא תקין',
  wrong_kind: 'סוג המסמך לא מתאים לשינוי',
  insufficient_role: 'אין לך הרשאה לערוך את הפרומפט',
};

function explain(cause: unknown): string {
  if (cause instanceof ApiError && cause.code && REFUSAL[cause.code]) return REFUSAL[cause.code]!;
  return cause instanceof Error ? cause.message : 'משהו השתבש';
}

/** The two entries after the documents: the whole prompt, and its history. */
const PREVIEW = 'preview';
const VERSIONS = 'versions';

/**
 * One agent's system prompt: its documents in a list, one open at a time.
 *
 * What is open is in the URL (/agents/<key>/<document id>, or `preview` or
 * `versions`), so it survives a reload and can be linked to. On a narrow
 * screen the list and the open document are two screens, as conversations
 * are.
 *
 * The distinction the screen exists to make visible is draft versus serving.
 * Editing changes nothing for any guest; publishing changes it for all of
 * them at once, which is why publishing is a button and editing is not.
 */
export function AgentPage({ agentKey, item }: { agentKey: string; item: string | null }) {
  const [state, setState] = useState<PromptState | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const base = `/agents/${encodeURIComponent(agentKey)}`;

  const load = useCallback(async () => {
    try {
      const [prompt, history] = await Promise.all([
        api.prompt(agentKey),
        api.promptVersions(agentKey),
      ]);
      setState(prompt);
      setVersions(history.versions);
    } catch (cause) {
      setError(explain(cause));
    }
  }, [agentKey]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Runs one change, reloads, and reports whether it went through. */
  const act = async (work: () => Promise<unknown>, said?: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await work();
      await load();
      if (said) setNote(said);
      return true;
    } catch (cause) {
      setError(explain(cause));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div className="page">
        <header className="head">
          <Link to="/agents" className="icon-btn" aria-label="חזרה לסוכנים">
            ›
          </Link>
          <h1>סוכן</h1>
        </header>
        <div className="page-body">
          <p className="hint">{error ?? 'טוען…'}</p>
        </div>
      </div>
    );
  }

  const { documents, published, preview, hasChanges } = state;
  const open = documents.find((document) => document.id === item) ?? null;

  const create = async (kind: PromptDocument['kind']) => {
    let id: string | null = null;
    const ok = await act(async () => {
      const { document } = await api.addDocument(agentKey, kind === 'table' ? 'טבלה חדשה' : 'מסמך חדש', kind);
      id = document.id;
    });
    if (ok && id) navigate(`${base}/${id}`);
  };

  const move = (index: number, by: -1 | 1) => {
    const ids = documents.map((d) => d.id);
    const target = index + by;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    void act(() => api.reorderDocuments(agentKey, ids));
  };

  const title =
    item === PREVIEW ? 'הפרומפט המלא' : item === VERSIONS ? 'גרסאות' : (open?.title ?? '');

  return (
    <div className="shell agent-shell" data-view={item ? 'thread' : 'list'}>
      <div className="pane-list">
        <header className="head">
          <Link to="/agents" className="icon-btn" aria-label="חזרה לסוכנים">
            ›
          </Link>
          <h1 dir="auto">{state.agent.name}</h1>
        </header>

        <div className="publish-bar agent-publish">
          <div className="publish-state">
            {published ? (
              <>
                <strong>גרסה {published.versionNumber} משרתת</strong>
                <span className="hint">
                  {published.publishedBy ?? '—'} · {shortDate(published.publishedAt)}
                </span>
              </>
            ) : (
              <>
                <strong>עדיין לא פורסם דבר</strong>
                {/* Until something is published the bot has nothing to answer
                    with, and stays silent rather than improvising. */}
                <span className="hint">הסוכן לא עונה עד לפרסום הראשון</span>
              </>
            )}
          </div>
          <button
            className="primary"
            type="button"
            disabled={busy || !hasChanges}
            title={hasChanges ? 'השינויים יגיעו לכל האורחים מיד' : 'אין שינויים לפרסם'}
            onClick={() => void act(() => api.publishPrompt(agentKey), 'פורסם')}
          >
            פרסום
          </button>
        </div>
        {error && !item && <p className="notice error agent-notice">{error}</p>}
        {note && !item && <p className="notice agent-notice">{note}</p>}

        <nav className="list" aria-label="מסמכים">
          {documents.length === 0 && <p className="hint agent-empty">אין מסמכים. צרו אחד כדי להתחיל.</p>}
          {documents.map((document) => (
            <Link
              key={document.id}
              to={`${base}/${document.id}`}
              className="row doc-row"
              aria-current={document.id === item ? 'page' : undefined}
            >
              <span className="doc-kind" aria-hidden="true">
                {document.kind === 'table' ? '▦' : '¶'}
              </span>
              <span className="doc-name" dir="auto" data-off={!document.isActive}>
                {document.title}
              </span>
              <span className="doc-flags">
                {!document.isActive && <span className="pill">כבוי</span>}
                {document.changed && (
                  <span className="changed-dot" title="שונה מהגרסה שמשרתת" aria-label="שונה" />
                )}
              </span>
            </Link>
          ))}

          <div className="doc-add">
            <button type="button" className="icon-btn wide" disabled={busy} onClick={() => void create('text')}>
              + מסמך טקסט
            </button>
            <button type="button" className="icon-btn wide" disabled={busy} onClick={() => void create('table')}>
              + טבלה
            </button>
          </div>

          <Link
            to={`${base}/${PREVIEW}`}
            className="row doc-row doc-meta"
            aria-current={item === PREVIEW ? 'page' : undefined}
          >
            <span className="doc-kind" aria-hidden="true">
              ☰
            </span>
            <span className="doc-name">הפרומפט המלא</span>
            <span className="doc-flags hint">
              {hasChanges ? 'שונה מהגרסה שמשרתת' : ''}
            </span>
          </Link>
          <Link
            to={`${base}/${VERSIONS}`}
            className="row doc-row doc-meta"
            aria-current={item === VERSIONS ? 'page' : undefined}
          >
            <span className="doc-kind" aria-hidden="true">
              ↺
            </span>
            <span className="doc-name">גרסאות</span>
            <span className="doc-flags hint">{versions.length || ''}</span>
          </Link>
        </nav>
      </div>

      <div className="pane-thread">
        <header className="head">
          <Link to={base} className="icon-btn back-btn" aria-label="חזרה לרשימת המסמכים">
            ›
          </Link>
          <h1 dir="auto">{title}</h1>
        </header>

        <div className="page-body">
          {error && item && <p className="notice error">{error}</p>}
          {note && item && <p className="notice">{note}</p>}

          {!item && <p className="hint agent-placeholder">בחרו מסמך מהרשימה, או צרו מסמך חדש.</p>}

          {item === PREVIEW && (
            <section className="card">
              <p className="hint">
                {/* Assembled by the same function publish uses, so this is the
                    text itself rather than an approximation of it. */}
                בדיוק הטקסט שיישמר בפרסום · {preview.length.toLocaleString()} תווים
                {hasChanges ? ' · שונה מהגרסה שמשרתת' : ' · זהה לגרסה שמשרתת'}
              </p>
              <pre className="preview tall">{preview || '(ריק)'}</pre>
            </section>
          )}

          {item === VERSIONS && (
            <Versions
              versions={versions}
              servingNumber={published?.versionNumber ?? null}
              busy={busy}
              onRevert={(number) =>
                void act(() => api.revertPrompt(agentKey, number), 'המסמכים הוחזרו — עדיין לא פורסמו')
              }
            />
          )}

          {item && item !== PREVIEW && item !== VERSIONS && !open && (
            <p className="hint">המסמך לא נמצא. ייתכן שנמחק, או ששוחזרה גרסה קודמת.</p>
          )}

          {open && (
            <DocumentView
              // Keyed, so opening another document starts its editor afresh
              // rather than carrying this one's unsaved text across.
              key={open.id}
              document={open}
              index={documents.indexOf(open)}
              count={documents.length}
              busy={busy}
              onChange={(changes) => act(() => api.updateDocument(agentKey, open.id, changes))}
              onMove={(by) => move(documents.indexOf(open), by)}
              onDelete={() => {
                if (!confirm(`למחוק את "${open.title}"?`)) return;
                void act(() => api.deleteDocument(agentKey, open.id)).then((ok) => {
                  if (ok) navigate(base, { replace: true });
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentView({
  document,
  index,
  count,
  busy,
  onChange,
  onMove,
  onDelete,
}: {
  readonly document: PromptDocument;
  readonly index: number;
  readonly count: number;
  readonly busy: boolean;
  readonly onChange: (changes: {
    title?: string;
    body?: string;
    table?: PromptTable;
    isActive?: boolean;
  }) => Promise<boolean>;
  readonly onMove: (by: -1 | 1) => void;
  readonly onDelete: () => void;
}) {
  return (
    <section className="card document" data-off={!document.isActive}>
      <div className="document-head">
        <input
          className="field document-title"
          defaultValue={document.title}
          aria-label="כותרת המסמך"
          dir="auto"
          onBlur={(event) => {
            const title = event.target.value.trim();
            if (title && title !== document.title) void onChange({ title });
          }}
        />
        <div className="document-tools">
          <button
            type="button"
            className="icon-btn"
            aria-label="העלאה בסדר"
            title="מוקדם יותר בפרומפט"
            disabled={busy || index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="הורדה בסדר"
            title="מאוחר יותר בפרומפט"
            disabled={busy || index === count - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <label className="toggle" title="מסמך כבוי נשמר אך לא נשלח לסוכן">
            <input
              type="checkbox"
              checked={document.isActive}
              disabled={busy}
              onChange={(event) => void onChange({ isActive: event.target.checked })}
            />
            פעיל
          </label>
          <button
            type="button"
            className="danger-btn"
            disabled={busy}
            aria-label={`מחיקת ${document.title}`}
            onClick={onDelete}
          >
            מחיקה
          </button>
        </div>
      </div>

      {document.kind === 'table' ? (
        <TableEditor
          initial={document.table ?? { columns: [''], rows: [] }}
          onSave={(table) => onChange({ table })}
        />
      ) : (
        <TextEditor
          initial={document.body}
          label={`תוכן ${document.title}`}
          onSave={(body) => onChange({ body })}
        />
      )}

      <p className="hint">
        {document.kind === 'table' ? 'טבלה' : 'טקסט'} · עודכן{' '}
        {document.updatedBy ? `על ידי ${document.updatedBy} · ` : ''}
        {shortDate(document.updatedAt)}
        {document.changed ? ' · שונה מהגרסה שמשרתת' : ''}
      </p>
    </section>
  );
}

function Versions({
  versions,
  servingNumber,
  busy,
  onRevert,
}: {
  readonly versions: PromptVersion[];
  readonly servingNumber: number | null;
  readonly busy: boolean;
  readonly onRevert: (versionNumber: number) => void;
}) {
  if (versions.length === 0) return <p className="hint">עדיין לא פורסמה אף גרסה.</p>;
  return (
    <section className="card">
      <ul className="version-list">
        {versions.map((version) => (
          <li className="version-row" key={version.versionNumber}>
            <div className="user-main">
              <span>
                <strong>גרסה {version.versionNumber}</strong>
                {version.versionNumber === servingNumber && ' · משרתת'}
              </span>
              <span className="hint">
                {version.publishedBy ?? '—'} · {shortDate(version.publishedAt)} ·{' '}
                {version.characters.toLocaleString()} תווים
              </span>
            </div>
            <button
              type="button"
              className="icon-btn wide"
              disabled={busy}
              onClick={() => {
                if (!confirm(`להחזיר את המסמכים לגרסה ${version.versionNumber}?`)) return;
                onRevert(version.versionNumber);
              }}
            >
              שחזור
            </button>
          </li>
        ))}
      </ul>
      {/* Reverting edits the draft. Guests keep hearing the published
          version until publish is pressed. */}
      <p className="hint">שחזור מחזיר את המסמכים בלבד. הסוכן ימשיך בגרסה שמשרתת עד לפרסום.</p>
    </section>
  );
}
