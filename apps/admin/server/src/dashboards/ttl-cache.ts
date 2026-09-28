/**
 * Reuses a MiniHotel answer for a short while.
 *
 * The dashboards are opened by a handful of people, but each open is a vendor
 * call, and a refresh loop or a stuck tab should not become a stream of them
 * (CLAUDE.md: rate limiting on every external call).
 *
 * The promise is cached, not the value, so two requests arriving together
 * make one call. A failure is removed at once: the point of opening a
 * dashboard may be to see whether MiniHotel answers now.
 */
export function createTtlCache<T>(options: { readonly ttlMs: number; readonly now: () => Date }) {
  const entries = new Map<string, { readonly at: number; readonly value: Promise<T> }>();

  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const at = options.now().getTime();
      for (const [existing, entry] of entries) {
        if (at - entry.at >= options.ttlMs) entries.delete(existing);
      }
      const cached = entries.get(key);
      if (cached) return cached.value;

      const value = load();
      entries.set(key, { at, value });
      value.catch(() => entries.delete(key));
      return value;
    },
  };
}

/** How long a dashboard answer is reused. */
export const DASHBOARD_TTL_MS = 30_000;

/** `YYYY-MM-DD` plus a number of days, without a time zone to get wrong. */
export function addDays(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/** Today's date in a time zone, `YYYY-MM-DD`. */
export function todayIn(timeZone: string, now: () => Date): () => string {
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return () => format.format(now());
}
