/**
 * Dates, in the reader's locale and timezone.
 *
 * The browser knows both; hardcoding either would show a manager in one place
 * the times of a server somewhere else.
 */

const time = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'long' });
const full = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });

export function timeOf(iso: string): string {
  return time.format(new Date(iso));
}

/** A day separator: today and yesterday by name, then weekday, then date. */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const days = daysAgo(date);
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 7) return weekday.format(date);
  return full.format(date);
}

/** Compact stamp for the conversation list. */
export function listStamp(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const days = daysAgo(date);
  if (days === 0) return time.format(date);
  if (days === 1) return 'אתמול';
  if (days < 7) return weekday.format(date);
  return full.format(date);
}

/** A plain date, for a row that records when something was decided. */
export function shortDate(iso: string): string {
  return full.format(new Date(iso));
}

export function sameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

function daysAgo(date: Date): number {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
}
