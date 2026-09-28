import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { MiniHotelError, shapeProblems } from './errors.js';
import { escapeAttribute, isDate } from './xml.js';

export interface RoomStatusQuery {
  /**
   * First night, `YYYY-MM-DD`. The range is read as nights: a reservation is
   * listed if it occupies a night in it, so one that checks out on `from` is
   * not (sandbox, 2026-09-28). To see today's departures, start yesterday.
   */
  readonly from: string;
  /** Last night, inclusive. */
  readonly to: string;
}

export interface HotelRoom {
  readonly number: string;
  readonly roomType: string;
}

export interface RoomTypeName {
  readonly code: string;
  readonly description: string;
}

export interface RoomReservation {
  readonly reservationNumber: string;
  /**
   * `Namep` and `Namef` joined in that order. Which is the first name is not
   * consistent: the documentation's example has `Namep="Jon" Namef="Doe"`,
   * the sandbox `Namep="ROSENOW" Namef="DIRK"`.
   */
  readonly guestName: string;
  /** Null until a room is assigned — a waiting-list reservation has none. */
  readonly roomNumber: string | null;
  readonly roomType: string | null;
  /** Arrival, `YYYY-MM-DD`. */
  readonly arrival: string;
  /** Departure (checkout day), `YYYY-MM-DD`. */
  readonly departure: string;
  /** e.g. OK, OK2, OK4, WL, PN, IN, CLOSE — the list is customisable per hotel. */
  readonly status: string;
  readonly board: string;
}

export interface RoomStatus {
  readonly hotelId: string;
  /** Every room, occupied or not, whatever the range. */
  readonly rooms: readonly HotelRoom[];
  readonly roomTypes: readonly RoomTypeName[];
  /**
   * One entry per room: a reservation for two rooms appears twice, with the
   * same number. Checked-out and cancelled reservations are not listed.
   */
  readonly reservations: readonly RoomReservation[];
}

export function roomStatusRequest(
  credentials: { readonly username: string; readonly password: string; readonly hotelId: string },
  query: RoomStatusQuery,
): string {
  if (!isDate(query.from) || !isDate(query.to) || query.to < query.from) {
    throw new RangeError('Room status needs YYYY-MM-DD dates, the second not before the first');
  }
  const a = escapeAttribute;
  // The documentation's request uses <AvailRaters> as its root, not the
  // <AvailRaterq> of the ARI requests. Kept as documented.
  return [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<AvailRaters>',
    `<Authentication username="${a(credentials.username)}" password="${a(credentials.password)}" ResponseType="03" />`,
    `<Hotel id="${a(credentials.hotelId)}" />`,
    `<DateRange from="${query.from}" to="${query.to}" />`,
    '</AvailRaters>',
  ].join('\n');
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  // Elements only: a <Reservation> also has an attribute named RoomType,
  // which must stay a string.
  isArray: (name, _path, _leaf, isAttribute) =>
    !isAttribute && (name === 'Room' || name === 'RoomType' || name === 'Reservation'),
});

const ymd = z
  .string()
  .regex(/^\d{8}$/)
  .transform((d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);

/** A container element that may come back empty, which the parser reads as ''. */
function container<T extends z.ZodTypeAny>(key: string, item: T) {
  return z
    .union([z.literal(''), z.object({ [key]: z.array(item).default([]) })])
    .optional()
    .transform((value) => (value ? ((value as Record<string, z.infer<T>[]>)[key] ?? []) : []));
}

const responseSchema = z.object({
  AvailRaters: z.object({
    Hotel: z.object({ id: z.string() }),
    Rooms: container('Room', z.object({ Number: z.string().min(1), Rmtype: z.string() })),
    RoomsTypes: container('RoomType', z.object({ Code: z.string().min(1), Description: z.string().default('') })),
    Reservations: container(
      'Reservation',
      z.object({
        ResNumber: z.string().min(1),
        Namep: z.string().default(''),
        Namef: z.string().default(''),
        RoomNumber: z.string().default(''),
        RoomType: z.string().default(''),
        FromYmd: ymd,
        ToYmd: ymd,
        Status: z.string(),
        Board: z.string().default(''),
      }),
    ),
  }),
});

/**
 * The room status response, validated rather than trusted.
 *
 * It carries guest names. What a caller may do with them is the caller's
 * decision; this parser only keeps them out of its errors.
 */
export function parseRoomStatus(body: string): RoomStatus {
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

  const { Hotel, Rooms, RoomsTypes, Reservations } = parsed.data.AvailRaters;
  return {
    hotelId: Hotel.id,
    rooms: Rooms.map((room) => ({ number: room.Number, roomType: room.Rmtype })),
    roomTypes: RoomsTypes.map((type) => ({ code: type.Code, description: type.Description })),
    reservations: Reservations.map((reservation) => ({
      reservationNumber: reservation.ResNumber,
      guestName: `${reservation.Namep} ${reservation.Namef}`.trim(),
      roomNumber: reservation.RoomNumber || null,
      roomType: reservation.RoomType || null,
      arrival: reservation.FromYmd,
      departure: reservation.ToYmd,
      status: reservation.Status,
      board: reservation.Board,
    })),
  };
}
