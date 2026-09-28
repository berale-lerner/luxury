import type { MiniHotelClient } from '@luxury/minihotel';

export interface StayRequest {
  /** `YYYY-MM-DD`. */
  readonly arrival: string;
  /** `YYYY-MM-DD`, the checkout day. */
  readonly departure: string;
  readonly adults: number;
  readonly children: number;
  readonly babies: number;
}

export interface ApartmentForStay {
  /** MiniHotel's room-type code, e.g. `DUBAI`. */
  readonly code: string;
  readonly name: string;
  readonly unitsFree: number;
  /** The cheapest board's price for the whole stay; null if none was quoted. */
  readonly totalPrice: number | null;
}

export interface StayAvailability {
  readonly currency: string;
  readonly apartments: readonly ApartmentForStay[];
}

/**
 * Which apartments can be booked for one stay, and for how much.
 *
 * The use case: it knows MiniHotel and the hotel's rate code, and nothing
 * about who is asking. It does not decide what a guest may see — the unit
 * count is here because a manager's screen could use it; the guest-facing
 * tool drops it (STANDARDS.md, tools and use cases).
 *
 * Immediate ARI leaves out an apartment that cannot be booked for exactly
 * this stay — taken, closed, or under its minimum stay — so absent means "not
 * for these dates", not necessarily "taken" (MINIHOTEL.md).
 */
export async function findApartmentsForStay(
  client: MiniHotelClient,
  rateCode: string,
  stay: StayRequest,
): Promise<StayAvailability> {
  const answer = await client.immediateAri({
    from: stay.arrival,
    to: stay.departure,
    adults: stay.adults,
    children: stay.children,
    babies: stay.babies,
    rateCode,
  });

  return {
    currency: answer.currency,
    apartments: answer.roomTypes
      .filter((type) => type.available > 0)
      .map((type) => ({
        code: type.id,
        name: type.nameEnglish || type.nameLocal || type.id,
        unitsFree: type.available,
        totalPrice: type.prices.length > 0 ? Math.min(...type.prices.map((price) => price.value)) : null,
      })),
  };
}
