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
  /** Units of this type free that night. */
  readonly available: number;
  /** Units of this type in total. */
  readonly total: number;
}

export interface RoomTypeWeek {
  readonly id: string;
  readonly name: string;
  /**
   * One entry per night MiniHotel returned this type for. A night it did not
   * return is left out rather than guessed as zero.
   */
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

  /**
   * One Immediate ARI call per night, each a one-night stay.
   *
   * Bulk ARI would be one call for the week, but MiniHotel answers it with
   * ERR 303 for our user (MINIHOTEL.md). Seven small calls behind the cache
   * above is the price of using the endpoint that works.
   */
  async function fetchWeek(from: string): Promise<AvailabilityWeek> {
    const dates = Array.from({ length: WEEK_NIGHTS }, (_, i) => addDays(from, i));
    const stays = await Promise.all(
      dates.map((date) =>
        options.client.immediateAri({
          from: date,
          to: addDays(date, 1),
          // One adult, so no room type is left out for its occupancy.
          adults: 1,
          rateCode: options.rateCode,
        }),
      ),
    );

    // Room types in the order MiniHotel first lists them.
    const types = new Map<string, { name: string; nights: NightAvailability[] }>();
    stays.forEach((stay, index) => {
      for (const type of stay.roomTypes) {
        const entry = types.get(type.id) ?? {
          name: type.nameEnglish || type.nameLocal || type.id,
          nights: [],
        };
        entry.nights.push({ date: dates[index]!, available: type.available, total: type.total });
        types.set(type.id, entry);
      }
    });

    return {
      from,
      to: dates[dates.length - 1]!,
      currency: stays[0]?.currency ?? '',
      roomTypes: [...types].map(([id, entry]) => ({ id, name: entry.name, nights: entry.nights })),
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
