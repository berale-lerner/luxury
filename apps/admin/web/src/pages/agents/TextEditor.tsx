import { useRef, useState, type KeyboardEvent } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * A text document: Markdown, with a toolbar so nobody has to remember it, and
 * a view of how it reads.
 *
 * Deliberately not a WYSIWYG editor. Those keep their own model of the text
 * and write Markdown back out of it, so opening and saving a document can
 * change characters nobody touched — and every character here is what the
 * agent is told. What the manager types is what is stored.
 */
export function TextEditor({
  initial,
  label,
  onSave,
}: {
  readonly initial: string;
  readonly label: string;
  /** Resolves true once the server has it. */
  readonly onSave: (body: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [mode, setMode] = useState<'edit' | 'view'>('edit');
  const area = useRef<HTMLTextAreaElement>(null);

  const save = () => {
    if (text === saved) return;
    const sent = text;
    void onSave(sent).then((ok) => {
      if (ok) setSaved(sent);
    });
  };

  /** Replaces the selection, then puts the cursor where typing continues. */
  const edit = (transform: (selected: string) => { text: string; cursor?: number }) => {
    const element = area.current;
    if (!element) return;
    const { selectionStart: start, selectionEnd: end } = element;
    const result = transform(text.slice(start, end));
    setText(text.slice(0, start) + result.text + text.slice(end));
    requestAnimationFrame(() => {
      element.focus();
      const at = start + (result.cursor ?? result.text.length);
      element.setSelectionRange(at, at);
    });
  };

  /** Starts the current line (or every selected line) with a marker. */
  const prefixLines = (marker: (index: number) => string) => {
    const element = area.current;
    if (!element) return;
    const lineStart = text.lastIndexOf('\n', element.selectionStart - 1) + 1;
    element.setSelectionRange(lineStart, element.selectionEnd);
    edit((selected) => ({
      text: selected
        .split('\n')
        .map((line, index) => marker(index) + line.replace(/^(#{1,6} |[-*] |\d+\. )/, ''))
        .join('\n'),
    }));
  };

  const bold = () =>
    edit((selected) =>
      selected ? { text: `**${selected}**` } : { text: '****', cursor: 2 },
    );

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      save();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
      event.preventDefault();
      bold();
    }
  };

  // mousedown is prevented so the textarea keeps its focus and selection:
  // the toolbar acts on what is selected, and a blur would save midway.
  const tool = (name: string, title: string, action: () => void) => (
    <button
      type="button"
      className="icon-btn tool-btn"
      title={title}
      aria-label={title}
      disabled={mode !== 'edit'}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      {name}
    </button>
  );

  return (
    <div className="text-editor">
      <div className="editor-toolbar">
        {tool('כותרת', 'כותרת', () => prefixLines(() => '## '))}
        {tool('כותרת משנה', 'כותרת משנה', () => prefixLines(() => '### '))}
        {tool('B', 'הדגשה (⌘B)', bold)}
        {tool('•', 'רשימה', () => prefixLines(() => '- '))}
        {tool('1.', 'רשימה ממוספרת', () => prefixLines((index) => `${index + 1}. `))}
        <span className="toolbar-gap" />
        <div className="segmented" role="group" aria-label="מצב תצוגה">
          <button type="button" aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
            עריכה
          </button>
          <button
            type="button"
            aria-pressed={mode === 'view'}
            onClick={() => {
              save();
              setMode('view');
            }}
          >
            תצוגה
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          ref={area}
          className="field document-body"
          value={text}
          aria-label={label}
          onChange={(event) => setText(event.target.value)}
          onBlur={save}
          onKeyDown={onKeyDown}
        />
      ) : (
        // Rendered by react-markdown, which builds elements rather than
        // injecting HTML: raw HTML in the text is shown, never executed.
        <div className="markdown-view" dir="auto">
          {text.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
          ) : (
            <p className="hint">(ריק)</p>
          )}
        </div>
      )}

      <p className="hint">
        {text === saved ? 'נשמר' : 'לא נשמר עדיין · נשמר ביציאה מהשדה או ב-⌘S'} ·{' '}
        {text.length.toLocaleString()} תווים
      </p>
    </div>
  );
}
