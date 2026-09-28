/**
 * The agent's tools.
 *
 * Each tool validates what the model sent, calls a use case, and shrinks the
 * answer to what a guest may see (STANDARDS.md). None of them can reach a
 * channel or the messaging package — the agent has no way to send anything,
 * and a structure test holds that for this directory too.
 */
export * from './tool.js';
export * from './toolbox.js';
export * from './check-availability.js';

/** Today's date in the hotel's time zone, `YYYY-MM-DD`. */
export function hotelToday(timeZone: string, now: () => Date = () => new Date()): () => string {
  const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return () => format.format(now());
}
