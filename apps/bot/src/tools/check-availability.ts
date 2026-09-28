import { z } from 'zod';
import { MiniHotelError, type MiniHotelClient } from '@luxury/minihotel';
import { findApartmentsForStay } from '../availability/find-apartments.js';
import type { AgentTool, ToolOutcome } from './tool.js';

/**
 * The apartments a guest may be offered, by MiniHotel room-type code.
 *
 * An allowlist, not a blocklist: a room type added in MiniHotel tomorrow —
 * or the SUITE1–SUITE10 that exist there but are not offered (MINIHOTEL.md) —
 * stays invisible to guests until someone adds it here on purpose. Moving
 * this to a table with an admin screen is the next step, not this one.
 */
export const OFFERED_APARTMENTS: ReadonlySet<string> = new Set([
  'BALI',
  'DUBAI',
  'KOSMIO',
  'Lavilla',
  'MIAMI',
  'NEWYORK',
  'SPEDRO',
  'TEL-AVID',
  'TIBERIAS',
  'TOKIO',
  'VENICE',
]);

/** How far ahead a guest may ask, and how long a stay. The owner's decision. */
export const LIMITS = { maxNights: 30, maxDaysAhead: 365, maxAdults: 10, maxYoung: 10 } as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const at = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(at.getTime()) && at.toISOString().slice(0, 10) === value;
}

function addDays(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

function nightsBetween(arrival: string, departure: string): number {
  return Math.round((Date.parse(`${departure}T00:00:00Z`) - Date.parse(`${arrival}T00:00:00Z`)) / 86_400_000);
}

const date = z.string().refine(isCalendarDate, 'must be a real date written YYYY-MM-DD');
const count = (min: number, max: number) =>
  z.number().int(`must be a whole number`).min(min).max(max);

/**
 * The arguments, as the model must send them. `.strict()`: a field nobody
 * defined is a model improvising — agent codes, rate codes, a different
 * hotel — and it is refused rather than ignored.
 */
const argumentsSchema = z
  .object({
    check_in: date,
    check_out: date,
    adults: count(1, LIMITS.maxAdults),
    children: count(0, LIMITS.maxYoung).default(0),
    babies: count(0, LIMITS.maxYoung).default(0),
  })
  .strict();

export const CHECK_AVAILABILITY = 'check_availability';

export interface CheckAvailabilityDeps {
  readonly client: MiniHotelClient;
  readonly rateCode: string;
  /** The hotel's today, `YYYY-MM-DD` — a check-in before it is refused. */
  readonly today: () => string;
}

/**
 * The guest-facing availability tool.
 *
 * Three things, as STANDARDS.md has it: validate what the model sent, call
 * the use case, and shrink the answer to what a guest may see. The test from
 * CLAUDE.md applies to `output` below — if the guest saw exactly that, it
 * would be fine: apartment names and sale prices, which the public booking
 * page shows anyway. Not how many units are free (occupancy), not room-type
 * codes, not anything MiniHotel adds to its answer later.
 */
export function createCheckAvailabilityTool(deps: CheckAvailabilityDeps): AgentTool {
  return {
    definition: {
      name: CHECK_AVAILABILITY,
      description: [
        'Check which apartments can be booked for a stay, with the total price for the whole stay.',
        'Use it whenever a guest asks about availability or price for specific dates.',
        'Ask the guest for the dates and number of guests first if you do not know them; never guess.',
        'check_out is the day the guest leaves, not the last night.',
        'An apartment missing from the result cannot be booked for exactly these dates: it may be taken,',
        'or have a minimum stay. Offer other dates rather than saying it is taken.',
      ].join(' '),
      parameters: {
        type: 'object',
        properties: {
          check_in: { type: 'string', description: 'Arrival date, YYYY-MM-DD.' },
          check_out: { type: 'string', description: 'Departure date, YYYY-MM-DD. After check_in.' },
          adults: { type: 'integer', description: `Adults, 1 to ${LIMITS.maxAdults}.` },
          children: { type: 'integer', description: 'Children. 0 if none.' },
          babies: { type: 'integer', description: 'Babies. 0 if none.' },
        },
        required: ['check_in', 'check_out', 'adults'],
        additionalProperties: false,
      },
    },

    async run(args: unknown): Promise<ToolOutcome> {
      const parsed = argumentsSchema.safeParse(args);
      if (!parsed.success) {
        // Field names and the rule broken, for the model to correct or to ask
        // the guest about. Never the value it sent.
        const problems = parsed.error.issues.map((issue) =>
          issue.code === 'unrecognized_keys'
            ? `unknown fields are not allowed`
            : `${issue.path.join('.') || 'arguments'}: ${issue.message}`,
        );
        return { ok: false, reason: 'invalid_arguments', message: `Invalid request. ${problems.join('; ')}.` };
      }

      const stay = parsed.data;
      const params = { ...stay };
      const today = deps.today();
      const nights = nightsBetween(stay.check_in, stay.check_out);

      const rule =
        stay.check_in < today
          ? 'check_in is in the past'
          : stay.check_in > addDays(today, LIMITS.maxDaysAhead)
            ? `check_in is more than ${LIMITS.maxDaysAhead} days ahead; the team can help with that`
            : nights < 1
              ? 'check_out must be after check_in'
              : nights > LIMITS.maxNights
                ? `stays longer than ${LIMITS.maxNights} nights are arranged with the team directly`
                : null;
      if (rule) {
        return { ok: false, reason: 'out_of_range', message: `Cannot check this stay: ${rule}.`, params };
      }

      let result;
      try {
        result = await findApartmentsForStay(deps.client, deps.rateCode, {
          arrival: stay.check_in,
          departure: stay.check_out,
          adults: stay.adults,
          children: stay.children,
          babies: stay.babies,
        });
      } catch (error) {
        if (!(error instanceof MiniHotelError)) throw error;
        return {
          ok: false,
          reason: `minihotel_${error.failure}`,
          // Nothing about why: the guest does not need our vendor's error
          // codes, and the model must not invent an answer instead.
          message:
            'The availability system did not answer. Do not guess availability or prices; tell the guest the team will confirm.',
          params,
        };
      }

      const available = result.apartments
        .filter((apartment) => OFFERED_APARTMENTS.has(apartment.code))
        .map((apartment) => ({
          apartment: apartment.name,
          total_price: apartment.totalPrice,
          currency: result.currency,
        }));

      return {
        ok: true,
        params,
        output: {
          check_in: stay.check_in,
          check_out: stay.check_out,
          nights,
          guests: { adults: stay.adults, children: stay.children, babies: stay.babies },
          available,
          ...(available.length === 0
            ? {
                note: 'Nothing can be booked for exactly these dates and guests. Other dates or a different length of stay may work.',
              }
            : { note: 'total_price is for the whole stay, not per night.' }),
        },
      };
    },
  };
}
