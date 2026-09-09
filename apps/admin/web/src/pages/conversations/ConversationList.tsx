import { ChannelIcon } from './ChannelIcon';
import { listStamp } from '../../format';
import type { ConversationSummary } from '../../types';

interface Props {
  conversations: ConversationSummary[];
  selectedId: string | null;
  loading: boolean;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  loading,
  search,
  onSearch,
  onSelect,
}: Props) {
  return (
    <>
      <div className="head">
        <h1>שיחות</h1>
        {!loading && (
          <span className="sub">
            {conversations.length}
            {conversations.length === 100 ? '+' : ''}
          </span>
        )}
      </div>

      <div className="search-wrap">
        <input
          className="search"
          type="search"
          placeholder="חיפוש לפי שם, מזהה או תוכן"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          aria-label="חיפוש שיחות"
        />
      </div>

      <div className="list">
        {loading && conversations.length === 0 ? (
          <Skeletons />
        ) : conversations.length === 0 ? (
          <div className="empty">
            <div>
              <div className="big">{search ? 'אין תוצאות' : 'אין שיחות עדיין'}</div>
              <div>{search ? 'נסה חיפוש אחר' : 'שיחה תופיע כאן ברגע שלקוח יכתוב'}</div>
            </div>
          </div>
        ) : (
          conversations.map((conversation) => (
            <Row
              key={conversation.id}
              conversation={conversation}
              selected={conversation.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </>
  );
}

function Row({
  conversation,
  selected,
  onSelect,
}: {
  conversation: ConversationSummary;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const name = conversation.guestName ?? 'לקוח לא מזוהה';
  // The guest spoke last, so this conversation is waiting on us.
  const awaiting = conversation.lastMessageDirection === 'inbound';

  return (
    <button
      type="button"
      className="row"
      aria-current={selected}
      data-awaiting={awaiting}
      onClick={() => onSelect(conversation.id)}
    >
      <span className="avatar" style={{ ['--hue' as string]: String(hueOf(name)) }}>
        <span className="initial">{name.trim().charAt(0) || '?'}</span>
        {/* The platform badge sits on the avatar so the list stays scannable
            without a separate column competing for width on a phone. */}
        <span className="badge">
          <ChannelIcon channel={conversation.channel} size={12} />
        </span>
      </span>

      <span className="row-main">
        <span className="row-top">
          <span className="row-name">{name}</span>
        </span>
        <span className="row-preview">
          {conversation.lastMessageDirection === 'outbound' && <span className="who">אנחנו:</span>}
          {/* Its own element, so a Hebrew prefix does not make an English
              message read right-to-left and truncate at the wrong end. */}
          <span className="body">{conversation.lastMessagePreview ?? 'אין הודעות'}</span>
        </span>
      </span>

      <span className="row-meta">
        <span className="row-time">{listStamp(conversation.lastMessageAt)}</span>
        {awaiting ? (
          <span className="dot" aria-label="ממתין למענה" />
        ) : conversation.agentMuted ? (
          <span className="pill muted">אדם</span>
        ) : null}
      </span>
    </button>
  );
}

/** A stable hue per name, so a guest keeps the same colour between visits. */
function hueOf(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 360;
  return hash;
}

function Skeletons() {
  return (
    <>
      {Array.from({ length: 7 }, (_, index) => (
        <div className="skeleton" key={index}>
          <div className="b" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <div className="b" style={{ width: '45%', height: 11, marginBottom: 7 }} />
            <div className="b" style={{ width: '75%', height: 10 }} />
          </div>
        </div>
      ))}
    </>
  );
}
