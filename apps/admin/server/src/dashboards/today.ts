import type { MiniHotelClient, RoomReservation } from '@luxury/minihotel';
import { addDays, createTtlCache, DASHBOARD_TTL_MS, todayIn } from './ttl-cache.js';

/**
 * Rows that hold a room without a guest in it: a room closed for sale, and
 * an allocation held for an agent. They keep the room from being free, but
 * nobody arrives or leaves.
 */
const NOT_A_GUEST = new Set(['CLOSE', 'ALC']);

/**
 * The hotel blocks a room for maintenance with a reservation in the name
 * "Mantenimiento", not with CLOSE (confirmed by the owner, 30 September).
 * The room is not free, but the row is not a guest and is not shown at all.
 * The name is split across Namep/Namef in no fixed order, so any word counts.
 */
const MAINTENANCE_NAME = 'mantenimiento';

const isMaintenance = (reservation: RoomReservation) =>
  reservation.guestName.toLowerCase().split(/\s+/).includes(MAINTENANCE_NAME);

export interface StayRow {
  readonly reservationNumber: string;
  readonly guestName: string;
  /** Null for a reservation with no room assigned yet (a waiting list). */
  readonly roomNumber: string | null;
  readonly roomTypeName: string | null;
  readonly arrival: string;
  readonly departure: string;
  readonly nights: number;
  readonly status: string;
}

export interface RoomRow {
  readonly roomNumber: string;
  readonly roomTypeName: string;
}

export interface TodayBoard {
  /** The hotel's today, `YYYY-MM-DD`. */
  readonly date: string;
  readonly arrivals: readonly StayRow[];
  readonly departures: readonly StayRow[];
  /** Arrived before today, leaving after it: in the room tonight too. */
  readonly stayovers: readonly StayRow[];
  /** Nobody in them tonight, not closed and not in maintenance. */
  readonly vacant: readonly RoomRow[];
  /** Closed for sale, or held for an agent, tonight. */
  readonly closed: readonly RoomRow[];
}

export interface TodayService {
  today(): string;
  board(): Promise<TodayBoard>;
}

export interface TodayServiceOptions {
  readonly client: MiniHotelClient;
  readonly timeZone: string;
  readonly now?: () => Date;
  readonly ttlMs?: number;
}

function nightsBetween(arrival: string, departure: string): number {
  return Math.round(
    (Date.parse(`${departure}T00:00:00Z`) - Date.parse(`${arrival}T00:00:00Z`)) / 86_400_000,
  );
}

const byRoom = (a: { roomNumber: string | null }, b: { roomNumber: string | null }) =>
  (a.roomNumber ?? '￿').localeCompare(b.roomNumber ?? '￿', undefined, { numeric: true });

/**
 * Who arrives, who leaves, who stays and what is free — for the hotel's today.
 *
 * Admin-side and owner-facing, so guest names are shown. They are personal
 * data: they are never logged, and nothing here is reachable from the bot.
 */
export function createTodayService(options: TodayServiceOptions): TodayService {
  const now = options.now ?? (() => new Date());
  const today = todayIn(options.timeZone, now);
  const cache = createTtlCache<TodayBoard>({ ttlMs: options.ttlMs ?? DASHBOARD_TTL_MS, now });

  async function load(date: string): Promise<TodayBoard> {
    // MiniHotel lists a reservation if it occupies a night in the range, so
    // one leaving today occupied last night: the range starts yesterday.
    const status = await options.client.roomStatus({ from: addDays(date, -1), to: date });

    const typeNames = new Map(status.roomTypes.map((type) => [type.code, type.description]));
    const nameOf = (code: string | null) => (code ? (typeNames.get(code) || code) : null);

    const row = (reservation: RoomReservation): StayRow => ({
      reservationNumber: reservation.reservationNumber,
      guestName: reservation.guestName,
      roomNumber: reservation.roomNumber,
      roomTypeName: nameOf(reservation.roomType),
      arrival: reservation.arrival,
      departure: reservation.departure,
      nights: nightsBetween(reservation.arrival, reservation.departure),
      status: reservation.status,
    });

    const tonight = (reservation: RoomReservation) =>
      reservation.arrival <= date && reservation.departure > date;
    const guests = status.reservations.filter(
      (reservation) => !NOT_A_GUEST.has(reservation.status) && !isMaintenance(reservation),
    );
    const holds = status.reservations.filter(
      (reservation) => NOT_A_GUEST.has(reservation.status) && tonight(reservation) && reservation.roomNumber,
    );

    const taken = new Set(
      status.reservations
        .filter((reservation) => tonight(reservation) && reservation.roomNumber)
        .map((reservation) => reservation.roomNumber!),
    );
    const closedRooms = new Set(holds.map((hold) => hold.roomNumber!));

    const roomRow = (number: string, type: string): RoomRow => ({
      roomNumber: number,
      roomTypeName: nameOf(type) ?? type,
    });

    return {
      date,
      arrivals: guests.filter((g) => g.arrival === date).map(row).sort(byRoom),
      departures: guests.filter((g) => g.departure === date).map(row).sort(byRoom),
      stayovers: guests.filter((g) => g.arrival < date && g.departure > date).map(row).sort(byRoom),
      vacant: status.rooms
        .filter((room) => !taken.has(room.number))
        .map((room) => roomRow(room.number, room.roomType))
        .sort(byRoom),
      closed: status.rooms
        .filter((room) => closedRooms.has(room.number))
        .map((room) => roomRow(room.number, room.roomType))
        .sort(byRoom),
    };
  }

  return {
    today,
    board() {
      const date = today();
      return cache.get(date, () => load(date));
    },
  };
}
