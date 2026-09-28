import type { MiniHotelClient } from '@luxury/minihotel';

/** How many nights the screen shows. */
export const WEEK_NIGHTS = 7;

/**
 * How long one answer is reused. The screen is opened by a handful of people,
 * but each open is a vendor call, and a refresh loop or a stuck tab should
 * not become a stream of them (CLAUDE.md: rate limiting on every external
 * call).
 */
const DEFAULT_TTL_MS = 30_000;

export interface NightAvailability {
  readonly date: string;
  readonly available: number;
  readonly price: number;
  readonly closed: boolean;
}

export interface RoomTypeWeek {
  readonly id: string;
  readonly name: string;
  readonly nights: readonly NightAvailability[];
}

export interface AvailabilityWeek {
  /** First night, `YYYY-MM-DD`. */
  readonly from: string;
  /** Last night, inclusive. */
  readonly to: string;
  readonly currency: string;
  readonly roomTypes: readonly RoomTypeWeek[];
}

export interface AvailabilityService {
  /** Today's date in the hotel's time zone, `YYYY-MM-DD`. */
  today(): string;
  week(from: string): Promise<AvailabilityWeek>;
}

export interface AvailabilityServiceOptions {
  readonly client: MiniHotelClient;
  readonly rateCode: string;
  readonly timeZone: string;
  readonly now?: () => Date;
  readonly ttlMs?: number;
}

/** `YYYY-MM-DD` plus a number of days, without a time zone to get wrong. */
export function addDays(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/**
 * Seven nights of availability for every room type, as the manager sees it.
 *
 * This is the admin side, so nothing is shrunk: the owner may see how many
 * units are free. The guest-facing tool will call MiniHotel for itself and
 * return a yes or no (MINIHOTEL.md, the whitelist).
 */
export function createAvailabilityService(options: AvailabilityServiceOptions): AvailabilityService {
  const now = options.now ?? (() => new Date());
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const dateIn = new Intl.DateTimeFormat('en-CA', {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const cache = new Map<string, { readonly at: number; readonly week: Promise<AvailabilityWeek> }>();

  async function fetchWeek(from: string): Promise<AvailabilityWeek> {
    const to = addDays(from, WEEK_NIGHTS - 1);
    const ari = await options.client.bulkAri({ from, to, rateCode: options.rateCode });
    return {
      from,
      to,
      currency: ari.currency,
      roomTypes: ari.roomTypes.map((type) => ({
        id: type.id,
        name: type.name,
        nights: type.days
          .filter((day) => day.date >= from && day.date <= to)
          .map((day) => ({
            date: day.date,
            available: day.available,
            price: day.price,
            closed: day.closed,
          })),
      })),
    };
  }

  return {
    today: () => dateIn.format(now()),

    week(from) {
      const at = now().getTime();
      for (const [key, entry] of cache) {
        if (at - entry.at >= ttlMs) cache.delete(key);
      }
      const cached = cache.get(from);
      if (cached) return cached.week;

      // The promise is cached, not the value, so two requests arriving
      // together make one vendor call. A failure is removed at once: the
      // point of opening the screen may be to see whether it works now.
      const week = fetchWeek(from);
      cache.set(from, { at, week });
      week.catch(() => cache.delete(from));
      return week;
    },
  };
}
