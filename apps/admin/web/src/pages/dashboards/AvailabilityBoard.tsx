import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { explainFailure, type DashboardFailure } from './failures';
import { FailureNotice } from './FailureNotice';
import type { AvailabilityWeek } from '../../types';

function addDays(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'short', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });

function label(date: string) {
  const at = new Date(`${date}T00:00:00Z`);
  return { weekday: weekday.format(at), date: dayMonth.format(at) };
}

/**
 * Seven nights of availability per room type, straight from MiniHotel.
 *
 * Each cell is the number of units still free that night. Nothing is stored
 * on our side; every open (after a short server-side cache) is a live call.
 */
export function AvailabilityBoard() {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [week, setWeek] = useState<AvailabilityWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardFailure | null>(null);

  const load = useCallback(async (start: string | undefined) => {
    setLoading(true);
    setError(null);
    try {
      setWeek(await api.availability(start));
    } catch (cause) {
      setError(explainFailure(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(from);
  }, [from, load]);

  const shift = (days: number) => {
    const base = week?.from ?? from;
    if (base) setFrom(addDays(base, days));
  };

  const nights = week ? Array.from({ length: 7 }, (_, i) => addDays(week.from, i)) : [];

  return (
    <>
        <div className="row-actions">
          {week && (
            <span className="hint" dir="ltr">
              {week.from} – {week.to}
            </span>
          )}
          <button type="button" className="link-btn" disabled={loading || !week} onClick={() => shift(-7)}>
            → שבוע קודם
          </button>
          <button
            type="button"
            className="link-btn"
            disabled={loading || !week || week.from === week.today}
            onClick={() => setFrom(week?.today)}
          >
            היום
          </button>
          <button type="button" className="link-btn" disabled={loading || !week} onClick={() => shift(7)}>
            שבוע הבא ←
          </button>
        </div>

        {error && <FailureNotice failure={error} busy={loading} onRetry={() => void load(from)} />}

        {loading && !week && !error && <p className="hint">טוען מ-MiniHotel…</p>}

        {week && week.roomTypes.length === 0 && (
          <p className="hint">MiniHotel לא החזיר אף סוג דירה לתאריכים האלה.</p>
        )}

        {week && week.roomTypes.length > 0 && (
          <div className="card availability" aria-busy={loading}>
            <table className="availability-grid">
              <thead>
                <tr>
                  <th scope="col" className="availability-type">
                    דירה
                  </th>
                  {nights.map((night) => {
                    const { weekday: day, date } = label(night);
                    return (
                      <th scope="col" key={night} data-today={night === week.today || undefined}>
                        <span className="availability-day">{day}</span>
                        <span className="availability-date">{date}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {week.roomTypes.map((type) => {
                  const byDate = new Map(type.nights.map((night) => [night.date, night]));
                  return (
                    <tr key={type.id}>
                      <th scope="row" className="availability-type">
                        <span className="availability-name">{type.name}</span>
                        <span className="availability-code" dir="ltr">
                          {type.id}
                        </span>
                      </th>
                      {nights.map((date) => {
                        const night = byDate.get(date);
                        if (!night) {
                          return (
                            <td key={date} data-state="missing" title="לא זמין ללילה בודד: תפוס, סגור, או שיש מינימום לילות">
                              –
                            </td>
                          );
                        }
                        return (
                          <td
                            key={date}
                            data-state={night.available > 0 ? 'free' : 'full'}
                            title={`${night.available} פנויות מתוך ${night.total}`}
                          >
                            {night.available}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {week && (
          <p className="hint">
            מספר: כמה יחידות פנויות באותו לילה (ריחוף מציג מתוך כמה). מקף: אי אפשר להזמין את הלילה הזה
            כלילה בודד — בדרך כלל כי הדירה תפוסה, אבל גם סגירה או מינימום לילות נראים כך. דירה שלא פנויה
            אף לילה בשבוע לא מופיעה בטבלה.
          </p>
        )}
    </>
  );
}
