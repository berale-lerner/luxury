import { useCallback, useEffect, useRef, useState } from 'react';
import { api, NotAllowedError, NotSignedInError } from './api';
import { ConversationList } from './ConversationList';
import { SignIn, NotAllowed } from './SignIn';
import { Thread } from './Thread';
import type { ConversationMessage, ConversationSummary, MessageCursor } from './types';

/** How often the open thread and the list refresh while the tab is visible. */
const POLL_MS = 8_000;

/** Matches the breakpoint in styles.css where the two panes appear together. */
const TWO_PANE = '(min-width: 861px)';

type Access = 'checking' | 'ok' | 'signed-out' | 'not-allowed';

export function App() {
  const [access, setAccess] = useState<Access>('checking');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<{
    conversation: ConversationSummary;
    messages: ConversationMessage[];
  } | null>(null);
  // Held in a ref rather than state: it changes on every poll and nothing
  // renders from it, so it must not cause one.
  const cursor = useRef<MessageCursor | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Any 401/403 anywhere flips the whole screen rather than showing a banner. */
  const handle = useCallback((cause: unknown): void => {
    if (cause instanceof NotSignedInError) setAccess('signed-out');
    else if (cause instanceof NotAllowedError) setAccess('not-allowed');
    else setError(cause instanceof Error ? cause.message : 'משהו השתבש');
  }, []);

  useEffect(() => {
    api
      .me()
      .then(() => setAccess('ok'))
      .catch(handle);
  }, [handle]);

  const loadList = useCallback(
    async (term: string) => {
      try {
        const { conversations: rows } = await api.conversations(term);
        setConversations(rows);
      } catch (cause) {
        handle(cause);
      } finally {
        setListLoading(false);
      }
    },
    [handle],
  );

  // With both panes visible, an empty right-hand side is wasted space and an
  // extra click. On one pane it would mean landing inside a conversation
  // nobody asked for, with the list a back button away — so only on desktop,
  // and only when nothing has been chosen yet.
  useEffect(() => {
    if (access !== 'ok' || selectedId || conversations.length === 0) return;
    if (!window.matchMedia(TWO_PANE).matches) return;
    setSelectedId(conversations[0]!.id);
  }, [access, selectedId, conversations]);

  // Debounced so typing in the search box does not fire a query per keystroke.
  useEffect(() => {
    if (access !== 'ok') return;
    setListLoading(true);
    const timer = setTimeout(() => void loadList(search), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [access, search, loadList]);

  /** The full thread, on open. Establishes the cursor for everything after. */
  const loadThread = useCallback(
    async (id: string) => {
      try {
        const loaded = await api.conversation(id);
        cursor.current = loaded.cursor;
        setThread({ conversation: loaded.conversation, messages: loaded.messages });
      } catch (cause) {
        handle(cause);
      }
    },
    [handle],
  );

  /**
   * One poll of the open thread.
   *
   * Asks only for what is new, and merges by id: the server deliberately
   * re-reads a short window before the cursor, because rows do not become
   * visible in timestamp order, so the same message can legitimately arrive
   * twice.
   */
  const pollThread = useCallback(
    async (id: string) => {
      const from = cursor.current;
      if (!from) return;

      try {
        const { messages, cursor: next } = await api.messagesSince(id, from);
        cursor.current = next;
        if (messages.length === 0) return;

        setThread((current) => {
          if (!current) return current;
          const byId = new Map(current.messages.map((m) => [m.id, m]));
          for (const message of messages) byId.set(message.id, message);
          return {
            ...current,
            messages: [...byId.values()].sort((a, b) =>
              a.createdAt === b.createdAt
                ? a.id.localeCompare(b.id)
                : a.createdAt.localeCompare(b.createdAt),
            ),
          };
        });
      } catch (cause) {
        handle(cause);
      }
    },
    [handle],
  );

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      cursor.current = null;
      return;
    }
    cursor.current = null;
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  // Polling, paused while the tab is hidden. A guest reply should appear
  // without a refresh; doing it in a background tab is just spend.
  useEffect(() => {
    if (access !== 'ok') return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      void loadList(search);
      // Incremental: the full thread is fetched once, on open.
      if (selectedId) void pollThread(selectedId);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [access, search, selectedId, loadList, pollThread]);

  const send = async (body: string) => {
    if (!selectedId) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await api.send(selectedId, body);
      // Advanced here too, so the next poll does not hand this message back
      // as though it were new.
      cursor.current = { at: message.createdAt, id: message.id };
      setThread((current) =>
        current
          ? {
              conversation: { ...current.conversation, agentMuted: true },
              messages: [...current.messages, message],
            }
          : current,
      );
      void loadList(search);
    } catch (cause) {
      handle(cause);
      // Rethrown so the composer can put the text back in the box.
      throw cause;
    } finally {
      setSending(false);
    }
  };

  const setAgentMuted = async (muted: boolean) => {
    if (!selectedId) return;
    try {
      await api.setAgentMuted(selectedId, muted);
      setThread((current) =>
        current ? { ...current, conversation: { ...current.conversation, agentMuted: muted } } : current,
      );
      void loadList(search);
    } catch (cause) {
      handle(cause);
    }
  };

  if (access === 'checking') return <div className="empty">טוען…</div>;
  if (access === 'signed-out') return <SignIn />;
  if (access === 'not-allowed') return <NotAllowed />;

  return (
    <div className="shell" data-view={selectedId ? 'thread' : 'list'}>
      <div className="pane-list">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          loading={listLoading}
          search={search}
          onSearch={setSearch}
          onSelect={setSelectedId}
        />
      </div>

      <div className="pane-thread">
        {thread ? (
          <Thread
            conversation={thread.conversation}
            messages={thread.messages}
            sending={sending}
            error={error}
            onSend={send}
            onBack={() => setSelectedId(null)}
            onSetAgentMuted={(muted) => void setAgentMuted(muted)}
          />
        ) : (
          <div className="empty">
            <div>
              <div className="big">בחר שיחה</div>
              <div>הרשימה מימין מציגה את כל השיחות עם הלקוחות</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
