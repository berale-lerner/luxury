import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { navigate } from '../../shell/router';
import { ConversationList } from './ConversationList';
import { Thread } from './Thread';
import type { ConversationMessage, ConversationSummary, MessageCursor } from '../../types';

/** How often the open thread and the list refresh while the tab is visible. */
const POLL_MS = 8_000;

/**
 * Matches the container query in styles.css where the two panes appear
 * together. Measured against the pane the page is given rather than the
 * window, which is why the number is not the window breakpoint: the
 * navigation takes a strip of the screen the conversation panes never see.
 */
const TWO_PANE = 800;

interface Props {
  /** From the URL. Null on /conversations, an id on /conversations/:id. */
  readonly selectedId: string | null;
}

/**
 * The conversations screen.
 *
 * Owns everything about conversations and nothing about the application
 * around it: which conversation is open comes from the route, and going
 * somewhere else is a navigation rather than a state change here.
 */
export function ConversationsPage({ selectedId }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [thread, setThread] = useState<{
    conversation: ConversationSummary;
    messages: ConversationMessage[];
  } | null>(null);
  // Held in a ref rather than state: it changes on every poll and nothing
  // renders from it, so it must not cause one.
  const cursor = useRef<MessageCursor | null>(null);
  /** Measured to decide whether both panes fit — see the effect below. */
  const shell = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 401 and 403 are not shown here — the API client announces those and the
   * shell replaces the screen. What is left is this page's own failures.
   */
  const handle = useCallback((cause: unknown): void => {
    setError(cause instanceof Error ? cause.message : 'משהו השתבש');
  }, []);

  const open = useCallback((id: string): void => {
    navigate(`/conversations/${id}`);
  }, []);

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
  // nobody asked for, with the list a back button away — so only when there
  // is room, and only when nothing has been chosen yet.
  //
  // The pane is measured, not the window: the container query above decides
  // on the width this page was given, and the navigation beside it is not
  // part of that. Comparing against window.innerWidth reads a number the
  // layout never sees, and is wrong by exactly the width of the navigation.
  //
  // replace, not push: the manager did not ask for this conversation, and
  // pushing would make the back button return to an empty screen.
  useEffect(() => {
    if (selectedId || conversations.length === 0) return;
    const pane = shell.current;
    // <=, to agree with `max-width` in the container query: at exactly the
    // breakpoint the single-column layout is the one in effect.
    if (!pane || pane.offsetWidth <= TWO_PANE) return;
    navigate(`/conversations/${conversations[0]!.id}`, { replace: true });
  }, [selectedId, conversations]);

  // Debounced so typing in the search box does not fire a query per keystroke.
  useEffect(() => {
    setListLoading(true);
    const timer = setTimeout(() => void loadList(search), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, loadList]);

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
    setError(null);
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  // Polling, paused while the tab is hidden. A guest reply should appear
  // without a refresh; doing it in a background tab is just spend.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      void loadList(search);
      // Incremental: the full thread is fetched once, on open.
      if (selectedId) void pollThread(selectedId);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [search, selectedId, loadList, pollThread]);

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
        current
          ? { ...current, conversation: { ...current.conversation, agentMuted: muted } }
          : current,
      );
      void loadList(search);
    } catch (cause) {
      handle(cause);
    }
  };

  return (
    <div className="shell" ref={shell} data-view={selectedId ? 'thread' : 'list'}>
      <div className="pane-list">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          loading={listLoading}
          search={search}
          onSearch={setSearch}
          onSelect={open}
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
            onBack={() => navigate('/conversations')}
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
