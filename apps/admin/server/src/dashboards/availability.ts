import type { MiniHotelClient } from '@luxury/minihotel';
import { addDays, createTtlCache, DASHBOARD_TTL_MS, todayIn } from './ttl-cache.js';

export { addDays };

/** How many nights the screen shows. */
export const WEEK_NIGHTS = 7;

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
   * One entry per night MiniHotel returned this type for. Production leaves a
   * type out of the answer when it cannot be booked for that one night —
   * sold out, closed, or a minimum stay — so a missing night is left out
   * rather than guessed as zero.
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

/**
 * Seven nights of availability for every room type, as the manager sees it.
 *
 * This is the admin side, so nothing is shrunk: the owner may see how many
 * units are free. The guest-facing tool will call MiniHotel for itself and
 * return a yes or no (MINIHOTEL.md, the whitelist).
 */
export function createAvailabilityService(options: AvailabilityServiceOptions): AvailabilityService {
  const now = options.now ?? (() => new Date());
  const cache = createTtlCache<AvailabilityWeek>({ ttlMs: options.ttlMs ?? DASHBOARD_TTL_MS, now });

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
    today: todayIn(options.timeZone, now),
    week: (from) => cache.get(from, () => fetchWeek(from)),
  };
}
