import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { MiniHotelError, shapeProblems } from './errors.js';
import { escapeAttribute, isDate } from './xml.js';

/** One room type on one night, as MiniHotel's Bulk ARI reports it. */
export interface AriDay {
  /** `YYYY-MM-DD`. */
  readonly date: string;
  /** Units of this type still free that night. */
  readonly available: number;
  /** The rate for that night, in the hotel's currency for the rate code. */
  readonly price: number;
  readonly minNights: number;
  /** Closed for sale that night. */
  readonly closed: boolean;
  readonly closedToArrival: boolean;
  readonly closedToDeparture: boolean;
}

export interface AriRoomType {
  readonly id: string;
  readonly name: string;
  readonly days: readonly AriDay[];
}

export interface BulkAri {
  readonly hotelId: string;
  readonly currency: string;
  readonly roomTypes: readonly AriRoomType[];
}

export interface BulkAriQuery {
  /** First night, `YYYY-MM-DD`. */
  readonly from: string;
  /** Last night, `YYYY-MM-DD`, inclusive — that is how MiniHotel reads it. */
  readonly to: string;
  readonly rateCode: string;
}

export function bulkAriRequest(
  credentials: { readonly username: string; readonly password: string; readonly hotelId: string },
  query: BulkAriQuery,
): string {
  if (!isDate(query.from) || !isDate(query.to)) {
    throw new RangeError('Bulk ARI dates must be YYYY-MM-DD');
  }
  const a = escapeAttribute;
  return [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<AvailRaterq xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    `<Authentication username="${a(credentials.username)}" password="${a(credentials.password)}" ResponseType="05" />`,
    `<Hotel id="${a(credentials.hotelId)}" />`,
    `<DateRange from="${query.from}" to="${query.to}" />`,
    `<Prices rateCode="${a(query.rateCode)}">`,
    '</Prices>',
    '</AvailRaterq>',
  ].join('\n');
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Everything as strings; the schema below decides what is a number.
  parseAttributeValue: false,
  // A hotel with one room type, or a one-night range, must still be a list.
  isArray: (name, _path, _leaf, isAttribute) => !isAttribute && (name === 'RoomType' || name === 'Day'),
});

const yesNo = z.enum(['Yes', 'No']).transform((value) => value === 'Yes');
const number = z.string().trim().regex(/^-?\d+(\.\d+)?$/).transform(Number);
const mdate = z
  .string()
  .regex(/^\d{8}$/)
  .transform((d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);

const daySchema = z
  .object({
    Mdate: mdate,
    Mavailability: number,
    Mprice: number,
    Minngt: number,
    Mclose: yesNo,
    McloseArr: yesNo,
    McloseDep: yesNo,
  })
  .transform(
    (day): AriDay => ({
      date: day.Mdate,
      available: day.Mavailability,
      price: day.Mprice,
      minNights: day.Minngt,
      closed: day.Mclose,
      closedToArrival: day.McloseArr,
      closedToDeparture: day.McloseDep,
    }),
  );

const responseSchema = z.object({
  AvailRaters: z.object({
    Hotel: z.object({ id: z.string(), Currency: z.string() }),
    // Absent or empty when the hotel has no room types for the rate code.
    RoomTypes: z
      .union([
        z.literal(''),
        z.object({
          RoomType: z
            .array(
              z.object({
                id: z.string().min(1),
                RoomName: z.string(),
                Day: z.array(daySchema).default([]),
              }),
            )
            .default([]),
        }),
      ])
      .optional(),
  }),
});

/**
 * The Bulk ARI response, validated rather than trusted.
 *
 * Only the fields above are read. The fees and meal prices MiniHotel also
 * sends are dropped here, so a caller cannot come to depend on them by
 * accident.
 */
export function parseBulkAri(body: string): BulkAri {
  let document: unknown;
  try {
    document = parser.parse(body);
  } catch {
    throw new MiniHotelError('bad_response', undefined, undefined, ['not well-formed XML']);
  }
  const parsed = responseSchema.safeParse(document);
  if (!parsed.success) {
    throw new MiniHotelError('bad_response', undefined, undefined, shapeProblems(parsed.error.issues, document));
  }

  const { Hotel, RoomTypes } = parsed.data.AvailRaters;
  const roomTypes = RoomTypes ? RoomTypes.RoomType : [];
  return {
    hotelId: Hotel.id,
    currency: Hotel.Currency,
    roomTypes: roomTypes.map((type) => ({ id: type.id, name: type.RoomName, days: type.Day })),
  };
}
