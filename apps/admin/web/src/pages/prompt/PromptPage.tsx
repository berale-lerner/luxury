import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api';
import { shortDate } from '../../format';
import type { PromptDocument, PromptState, PromptVersion } from '../../types';

/** The only agent today. The API takes a key so a second one costs nothing. */
const AGENT = 'guest';

const REFUSAL: Record<string, string> = {
  empty: 'אין מה לפרסם — כל המסמכים ריקים או כבויים',
  unchanged: 'הטקסט זהה לגרסה שכבר משרתת',
  no_agent: 'הסוכן לא נמצא',
  not_found: 'המסמך כבר לא קיים',
  bad_order: 'הסדר לא תקין',
  bad_request: 'הקלט לא תקין',
  insufficient_role: 'אין לך הרשאה לערוך את הפרומפט',
};

function explain(cause: unknown): string {
  if (cause instanceof ApiError && cause.code && REFUSAL[cause.code]) return REFUSAL[cause.code]!;
  return cause instanceof Error ? cause.message : 'משהו השתבש';
}

/**
 * The agent's system prompt: an ordered set of documents, edited freely and
 * published deliberately.
 *
 * The distinction the screen exists to make visible is draft versus serving.
 * Editing changes nothing for any guest; publishing changes it for all of
 * them at once, which is why publishing is a button and editing is not.
 */
export function PromptPage() {
  const [state, setState] = useState<PromptState | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prompt, history] = await Promise.all([
        api.prompt(AGENT),
        api.promptVersions(AGENT),
      ]);
      setState(prompt);
      setVersions(history.versions);
    } catch (cause) {
      setError(explain(cause));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (work: () => Promise<unknown>, said?: string) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await work();
      await load();
      if (said) setNote(said);
    } catch (cause) {
      setError(explain(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div className="page">
        <header className="head">
          <h1>פרומפט</h1>
        </header>
        <div className="page-body">
          <p className="hint">{error ?? 'טוען…'}</p>
        </div>
      </div>
    );
  }

  const { documents, published, preview, hasChanges } = state;

  /** Saves a field only when it actually changed, on the way out of it. */
  const saveField = (document: PromptDocument, changes: { title?: string; body?: string }) => {
    const changed =
      (changes.title !== undefined && changes.title !== document.title) ||
      (changes.body !== undefined && changes.body !== document.body);
    if (!changed) return;
    void act(() => api.updateDocument(AGENT, document.id, changes));
  };

  const move = (index: number, by: -1 | 1) => {
    const ids = documents.map((d) => d.id);
    const target = index + by;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    void act(() => api.reorderDocuments(AGENT, ids));
  };

  return (
    <div className="page">
      <header className="head">
        <h1>פרומפט</h1>
        <span className="sub">{state.agent.name}</span>
      </header>

      <div className="page-body">
        <section className="card publish-bar">
          <div className="publish-state">
            {published ? (
              <>
                <strong>גרסה {published.versionNumber} משרתת עכשיו</strong>
                <span className="hint">
                  {published.publishedBy ?? '—'} · {shortDate(published.publishedAt)} ·{' '}
                  {published.characters.toLocaleString()} תווים
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
            onClick={() => void act(() => api.publishPrompt(AGENT), 'פורסם')}
          >
            פרסום
          </button>
        </section>

        {error && <p className="notice error">{error}</p>}
        {note && <p className="notice">{note}</p>}

        {documents.length === 0 && <p className="hint">אין מסמכים. הוסף אחד כדי להתחיל.</p>}

        {documents.map((document, index) => (
          <section className="card document" key={document.id} data-off={!document.isActive}>
            <div className="document-head">
              <input
                className="field document-title"
                defaultValue={document.title}
                aria-label="כותרת המסמך"
                disabled={busy}
                onBlur={(event) => saveField(document, { title: event.target.value })}
              />
              <div className="document-tools">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="העלאה למעלה"
                  title="למעלה"
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="הורדה למטה"
                  title="למטה"
                  disabled={busy || index === documents.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <label className="toggle" title="מסמך כבוי נשמר אך לא נשלח לסוכן">
                  <input
                    type="checkbox"
                    checked={document.isActive}
                    disabled={busy}
                    onChange={(event) =>
                      void act(() =>
                        api.updateDocument(AGENT, document.id, { isActive: event.target.checked }),
                      )
                    }
                  />
                  פעיל
                </label>
                <button
                  type="button"
                  className="danger-btn"
                  disabled={busy}
                  aria-label={`מחיקת ${document.title}`}
                  onClick={() => {
                    if (!confirm(`למחוק את "${document.title}"?`)) return;
                    void act(() => api.deleteDocument(AGENT, document.id));
                  }}
                >
                  מחיקה
                </button>
              </div>
            </div>

            <textarea
              className="field document-body"
              defaultValue={document.body}
              aria-label={`תוכן ${document.title}`}
              rows={8}
              disabled={busy}
              onBlur={(event) => saveField(document, { body: event.target.value })}
            />

            <p className="hint">
              {document.updatedBy ? `${document.updatedBy} · ` : ''}
              {shortDate(document.updatedAt)}
            </p>
          </section>
        ))}

        <div className="row-actions">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void act(() => api.addDocument(AGENT, 'מסמך חדש'))}
          >
            הוספת מסמך
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => setShowPreview((open) => !open)}
          >
            {showPreview ? 'הסתרת התצוגה המלאה' : 'תצוגה מלאה של הפרומפט'}
          </button>
        </div>

        {showPreview && (
          <section className="card">
            <p className="hint">
              {/* Assembled by the same function publish uses, so this is the
                  text itself rather than an approximation of it. */}
              בדיוק הטקסט שיישמר בפרסום · {preview.length.toLocaleString()} תווים
              {hasChanges ? ' · שונה מהגרסה שמשרתת' : ' · זהה לגרסה שמשרתת'}
            </p>
            <pre className="preview">{preview || '(ריק)'}</pre>
          </section>
        )}

        {versions.length > 0 && (
          <section className="card">
            <p className="hint">גרסאות</p>
            <ul className="version-list">
              {versions.map((version) => (
                <li className="version-row" key={version.versionNumber}>
                  <div className="user-main">
                    <span>
                      <strong>גרסה {version.versionNumber}</strong>
                      {version.versionNumber === published?.versionNumber && ' · משרתת'}
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
                      void act(
                        () => api.revertPrompt(AGENT, version.versionNumber),
                        'המסמכים הוחזרו — עדיין לא פורסמו',
                      );
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
        )}
      </div>
    </div>
  );
}
