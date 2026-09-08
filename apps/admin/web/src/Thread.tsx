import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChannelIcon, channelLabel } from './ChannelIcon';
import { dayLabel, sameDay, timeOf } from './format';
import type { ConversationMessage, ConversationSummary } from './types';

interface Props {
  conversation: ConversationSummary;
  messages: ConversationMessage[];
  sending: boolean;
  error: string | null;
  onSend: (body: string) => Promise<void>;
  onBack: () => void;
  onSetAgentMuted: (muted: boolean) => void;
}

const SENDER_LABEL: Record<ConversationMessage['sender'], string> = {
  guest: 'לקוח',
  agent: 'סוכן',
  manager: 'אתה',
};

export function Thread({
  conversation,
  messages,
  sending,
  error,
  onSend,
  onBack,
  onSetAgentMuted,
}: Props) {
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  // Jumps to the newest message before paint, so opening a thread never
  // shows the top of a long history for a frame. The second pass on the next
  // frame covers content that settles after layout — a long message wrapping,
  // or a webfont swapping in — which otherwise leaves the view a little short
  // of the bottom.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const toBottom = () => void (element.scrollTop = element.scrollHeight);
    toBottom();
    const frame = requestAnimationFrame(toBottom);
    return () => cancelAnimationFrame(frame);
  }, [conversation.id, messages.length]);

  // Grows with the text instead of scrolling inside a two-line box.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [draft]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    // Cleared optimistically so a fast second message is possible; restored
    // by the caller's error path if the send failed.
    setDraft('');
    try {
      await onSend(body);
    } catch {
      setDraft(body);
    }
  };

  return (
    <>
      <div className="head">
        <button type="button" className="icon-btn back-btn" onClick={onBack} aria-label="חזרה לרשימה">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {/* Points right: the document is RTL, so "back" is towards the list. */}
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <ChannelIcon channel={conversation.channel} size={20} />

        <div style={{ minWidth: 0 }}>
          <h1 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {conversation.guestName ?? 'לקוח לא מזוהה'}
          </h1>
          <div className="sub">{channelLabel(conversation.channel)}</div>
        </div>

        <div style={{ marginInlineStart: 'auto' }}>
          {conversation.agentMuted ? (
            <button type="button" className="pill" onClick={() => onSetAgentMuted(false)}>
              החזר את הסוכן
            </button>
          ) : (
            <span className="pill">הסוכן פעיל</span>
          )}
        </div>
      </div>

      <div className="thread" ref={scroller}>
        <div className="thread-inner">
          {messages.length === 0 && (
            <div className="empty">
              <div>אין הודעות בשיחה הזו</div>
            </div>
          )}

          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const startsDay = !previous || !sameDay(previous.createdAt, message.createdAt);

            return (
              <div key={message.id} style={{ display: 'contents' }}>
                {startsDay && <div className="day">{dayLabel(message.createdAt)}</div>}
                <div
                  className={`msg ${message.direction === 'inbound' ? 'in' : 'out'} ${message.sender}`}
                >
                  {/* Guest text is untrusted and is rendered as text, never as
                      markup (CLAUDE.md, "Conversations"). React escapes it. */}
                  <div className="bubble">{message.body}</div>
                  <div className="msg-meta">
                    <span>{SENDER_LABEL[message.sender]}</span>
                    <span>{timeOf(message.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="composer">
        {error && <div className="notice error">{error}</div>}
        {!conversation.agentMuted && (
          <div className="notice">שליחת הודעה תשתיק את הסוכן בשיחה הזו</div>
        )}

        <div className="composer-inner">
          <textarea
            ref={box}
            value={draft}
            rows={1}
            placeholder="כתוב הודעה…"
            aria-label="הודעה חדשה"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter breaks a line — but only with a
              // physical keyboard. On a phone Enter must insert a newline.
              if (event.key === 'Enter' && !event.shiftKey && window.matchMedia('(hover: hover)').matches) {
                event.preventDefault();
                void submit();
              }
            }}
          />
          <button
            type="button"
            className="send"
            onClick={() => void submit()}
            disabled={!draft.trim() || sending}
            aria-label="שלח"
          >
            {sending ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                {/* Points left, following the RTL reading direction. */}
                <path d="M20 12 4 5l3 7-3 7 16-7Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
