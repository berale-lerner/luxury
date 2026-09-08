import { useCallback, useEffect, useState } from 'react';
import { api, NotAllowedError, NotSignedInError } from './api';
import { ConversationList } from './ConversationList';
import { SignIn, NotAllowed } from './SignIn';
import { Thread } from './Thread';
import type { ConversationMessage, ConversationSummary } from './types';

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

  const loadThread = useCallback(
    async (id: string) => {
      try {
        setThread(await api.conversation(id));
      } catch (cause) {
        handle(cause);
      }
    },
    [handle],
  );

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      return;
    }
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  // Polling, paused while the tab is hidden. A guest reply should appear
  // without a refresh; doing it in a background tab is just spend.
  useEffect(() => {
    if (access !== 'ok') return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      void loadList(search);
      if (selectedId) void loadThread(selectedId);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [access, search, selectedId, loadList, loadThread]);

  const send = async (body: string) => {
    if (!selectedId) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await api.send(selectedId, body);
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
