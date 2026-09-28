import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { escapeAttribute, isDate } from './xml.js';
import { MiniHotelError } from './errors.js';

export interface ImmediateAriQuery {
  /** Arrival, `YYYY-MM-DD`. */
  readonly from: string;
  /** Departure, `YYYY-MM-DD` — the checkout day, not the last night. */
  readonly to: string;
  readonly adults: number;
  readonly children?: number;
  readonly babies?: number;
  readonly rateCode: string;
}

export interface StayPrice {
  readonly board: string;
  readonly boardDescription: string;
  /** For the whole stay, not per night. */
  readonly value: number;
  readonly valueNonRefundable: number;
}

export interface StayRoomType {
  readonly id: string;
  /** `Name_h`: the hotel's local-language name. */
  readonly nameLocal: string;
  /** `Name_e`: the English name. */
  readonly nameEnglish: string;
  /** `Allocation`: units of this type free for the whole stay. */
  readonly available: number;
  /** `maxavail`: units of this type in total. */
  readonly total: number;
  readonly prices: readonly StayPrice[];
}

export interface ImmediateAri {
  readonly hotelId: string;
  readonly currency: string;
  readonly roomTypes: readonly StayRoomType[];
}

const MAX_GUESTS = 20;

function guestCount(value: number | undefined, min: number, label: string): number {
  const count = value ?? 0;
  if (!Number.isInteger(count) || count < min || count > MAX_GUESTS) {
    throw new RangeError(`Immediate ARI ${label} must be a whole number from ${min} to ${MAX_GUESTS}`);
  }
  return count;
}

export function immediateAriRequest(
  credentials: { readonly username: string; readonly password: string; readonly hotelId: string },
  query: ImmediateAriQuery,
): string {
  if (!isDate(query.from) || !isDate(query.to) || query.to <= query.from) {
    throw new RangeError('Immediate ARI needs YYYY-MM-DD dates with departure after arrival');
  }
  const adults = guestCount(query.adults, 1, 'adults');
  const children = guestCount(query.children, 0, 'children');
  const babies = guestCount(query.babies, 0, 'babies');
  const a = escapeAttribute;
  return [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<AvailRaterq>',
    `<Authentication username="${a(credentials.username)}" password="${a(credentials.password)}" />`,
    `<Hotel id="${a(credentials.hotelId)}" />`,
    `<DateRange from="${query.from}" to="${query.to}" />`,
    `<Guests adults="${adults}" child="${children}" babies="${babies}" />`,
    '<RoomTypes>',
    '<RoomType id="*ALL*" />',
    '</RoomTypes>',
    `<Prices rateCode="${a(query.rateCode)}">`,
    '<Price boardCode="*ALL*" />',
    '</Prices>',
    '</AvailRaterq>',
  ].join('\n');
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  // One room type, or one board, must still be a list.
  isArray: (name) => name === 'RoomType' || name === 'price',
});

const number = z.string().trim().regex(/^-?\d+(\.\d+)?$/).transform(Number);

const responseSchema = z.object({
  AvailRaters: z.object({
    Hotel: z.object({ id: z.string(), Currency: z.string() }),
    RoomType: z
      .array(
        z.object({
          id: z.string().min(1),
          Name_h: z.string().default(''),
          Name_e: z.string().default(''),
          Inventory: z.object({ Allocation: number, maxavail: number }),
          price: z
            .array(
              z.object({
                board: z.string(),
                boardDesc: z.string().default(''),
                value: number,
                value_nrf: number,
              }),
            )
            .default([]),
        }),
      )
      // Absent when nothing matches the stay.
      .default([]),
  }),
});

/**
 * The Immediate ARI response, validated rather than trusted.
 *
 * Only the fields above are read; anything MiniHotel adds later is dropped
 * here rather than passed on to a caller who did not ask for it.
 */
export function parseImmediateAri(body: string): ImmediateAri {
  let document: unknown;
  try {
    document = parser.parse(body);
  } catch {
    throw new MiniHotelError('bad_response');
  }
  const parsed = responseSchema.safeParse(document);
  if (!parsed.success) throw new MiniHotelError('bad_response');

  const { Hotel, RoomType } = parsed.data.AvailRaters;
  return {
    hotelId: Hotel.id,
    currency: Hotel.Currency,
    roomTypes: RoomType.map((type) => ({
      id: type.id,
      nameLocal: type.Name_h,
      nameEnglish: type.Name_e,
      available: type.Inventory.Allocation,
      total: type.Inventory.maxavail,
      prices: type.price.map((price) => ({
        board: price.board,
        boardDescription: price.boardDesc,
        value: price.value,
        valueNonRefundable: price.value_nrf,
      })),
    })),
  };
}
