import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api';
import type { AvailabilityWeek } from '../../types';

/**
 * Why the week could not be shown, in words the reader can act on.
 *
 * The first use of this screen is finding out whether MiniHotel accepts our
 * server at all, so each failure says who fixes it.
 */
const FAILURE: Record<string, string> = {
  not_configured: 'אין חיבור ל-MiniHotel בסביבה הזו: לא הוגדרו פרטי התחברות.',
  ip_not_authorized:
    'MiniHotel חוסם את כתובת ה-IP של השרת. צריך לבקש מהתמיכה שלהם להוסיף אותה ל-whitelist.',
  auth_failed: 'MiniHotel דחה את שם המשתמש, הסיסמה או קוד המלון.',
  vendor_error: 'MiniHotel החזיר שגיאה.',
  timeout: 'MiniHotel לא ענה בזמן.',
  unreachable: 'אין חיבור לשרת של MiniHotel.',
  bad_response: 'MiniHotel ענה בפורמט לא צפוי.',
  http_error: 'MiniHotel ענה בפורמט לא צפוי.',
};

function explain(cause: unknown): { message: string; code?: string } {
  const message =
    cause instanceof ApiError && cause.code && FAILURE[cause.code]
      ? FAILURE[cause.code]!
      : 'טעינת הזמינות נכשלה.';
  // The vendor's own code, when there is one, for looking up in MINIHOTEL.md.
  const code = cause instanceof ApiError ? cause.vendorCode : undefined;
  return code ? { message, code } : { message };
}

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
export function AvailabilityPage() {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [week, setWeek] = useState<AvailabilityWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const load = useCallback(async (start: string | undefined) => {
    setLoading(true);
    setError(null);
    try {
      setWeek(await api.availability(start));
    } catch (cause) {
      setError(explain(cause));
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
    <div className="page">
      <header className="head">
        <h1>זמינות</h1>
        {week && (
          <span className="sub" dir="ltr">
            {week.from} – {week.to}
          </span>
        )}
      </header>

      <div className="page-body">
        <div className="row-actions">
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

        {error && (
          <div className="notice error" role="alert">
            <p>
              {error.message}
              {error.code && (
                <>
                  {' '}
                  קוד שגיאה: <span dir="ltr">{error.code}</span>
                </>
              )}
            </p>
            <button type="button" onClick={() => void load(from)} disabled={loading}>
              לנסות שוב
            </button>
          </div>
        )}

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
                            <td key={date} data-state="missing" title="MiniHotel לא החזיר את הדירה הזו ללילה הזה">
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
            המספר בכל תא הוא כמה יחידות מהסוג הזה פנויות באותו לילה. ריחוף מעל תא מציג מתוך כמה. מקף:
            MiniHotel לא החזיר את הדירה ללילה הזה.
          </p>
        )}
      </div>
    </div>
  );
}
