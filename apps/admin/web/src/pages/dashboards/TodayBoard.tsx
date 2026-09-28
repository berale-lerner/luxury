import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import type { RoomRow, StayRow, TodayBoard as Board } from '../../types';
import { explainFailure, type DashboardFailure } from './failures';
import { FailureNotice } from './FailureNotice';

/** MiniHotel's standard statuses. A hotel can add its own; those show as the code. */
const STATUS: Record<string, string> = {
  OK: 'מאושר',
  OK2: 'מאושר · ערוץ',
  OK4: 'מאושר · אתר',
  WL: 'רשימת המתנה',
  PN: 'ממתין',
  IN: 'נכנס',
  OUT: 'יצא',
  PRE: 'אישור מסגרת',
  BID: 'הצעה',
  LWP: 'עזב בלי לשלם',
  BL: 'רשימה שחורה',
};

const shortDate = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const at = (date: string) => new Date(`${date}T00:00:00Z`);

function Room({ number, typeName }: { number: string | null; typeName: string | null }) {
  return (
    <span className="today-room">
      <span className="today-room-number" dir="ltr">
        {number ?? 'לא שובץ'}
      </span>
      {typeName && (
        <span className="hint" dir="auto">
          {typeName}
        </span>
      )}
    </span>
  );
}

function Stays({ title, rows, empty }: { title: string; rows: StayRow[]; empty: string }) {
  return (
    <section className="card today-section" aria-label={title}>
      <h2>
        {title} <span className="sub">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="hint">{empty}</p>
      ) : (
        <ul className="today-list">
          {rows.map((row) => (
            <li key={`${row.reservationNumber}-${row.roomNumber ?? ''}`} className="today-row">
              <Room number={row.roomNumber} typeName={row.roomTypeName} />
              <span className="today-guest">
                {/* Rendered as text, like every other guest-supplied string. */}
                <span className="today-name">{row.guestName || '—'}</span>
                <span className="hint">
                  {/* Isolated left-to-right, or the range reads backwards in RTL. */}
                  <bdi dir="ltr">
                    {shortDate.format(at(row.arrival))}–{shortDate.format(at(row.departure))}
                  </bdi>{' '}
                  · {row.nights} {row.nights === 1 ? 'לילה' : 'לילות'}
                </span>
              </span>
              <span className="pill" title={row.status}>
                {STATUS[row.status] ?? row.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Rooms({ title, rows, empty }: { title: string; rows: RoomRow[]; empty: string }) {
  return (
    <section className="card today-section" aria-label={title}>
      <h2>
        {title} <span className="sub">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="hint">{empty}</p>
      ) : (
        <ul className="today-rooms">
          {rows.map((row) => (
            <li key={row.roomNumber}>
              <Room number={row.roomNumber} typeName={row.roomTypeName} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The hotel's today: who arrives, who leaves, who stays, what is free.
 *
 * Read live from MiniHotel on every open (after a short server-side cache).
 * Guest names appear here because this is the owner's screen; they are
 * never logged and never reach the bot.
 */
export function TodayBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardFailure | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoard(await api.today());
    } catch (cause) {
      setError(explainFailure(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="row-actions">
        {board && <span className="today-date">{longDate.format(at(board.date))}</span>}
        <button type="button" className="link-btn" disabled={loading} onClick={() => void load()}>
          רענון
        </button>
      </div>

      {error && <FailureNotice failure={error} busy={loading} onRetry={() => void load()} />}
      {loading && !board && !error && <p className="hint">טוען מ-MiniHotel…</p>}

      {board && (
        <div className="today-grid" aria-busy={loading}>
          <Stays title="מגיעים היום" rows={board.arrivals} empty="אין הגעות היום." />
          <Stays title="עוזבים היום" rows={board.departures} empty="אין עזיבות היום." />
          <Stays title="נשארים" rows={board.stayovers} empty="אין אורחים שממשיכים את השהות." />
          <Rooms title="פנויות הלילה" rows={board.vacant} empty="כל הדירות תפוסות הלילה." />
          {board.closed.length > 0 && <Rooms title="סגורות הלילה" rows={board.closed} empty="" />}
        </div>
      )}
    </>
  );
}
