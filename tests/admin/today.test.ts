/**
 * The "today" board: which reservations count as arriving, leaving and
 * staying, which rooms are free tonight, and what the endpoint answers.
 *
 * MiniHotel is a fake client with a fixed answer; its wire format is covered
 * in tests/minihotel. The route tests drive the real app, guard included.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import {
  MiniHotelError,
  type MiniHotelClient,
  type RoomReservation,
  type RoomStatusQuery,
} from '@luxury/minihotel';
import { buildApp } from '../../apps/admin/server/src/app.js';
import type { SessionReader } from '../../apps/admin/server/src/auth/session.js';
import { createTodayService, type TodayService } from '../../apps/admin/server/src/dashboards/today.js';
import { urlForRole } from '../helpers/config.js';

/** 21:30 UTC on the 27th is already the 28th in Israel. */
const ISRAEL_EVENING = new Date('2026-09-27T21:30:00Z');
const TODAY = '2026-09-28';

function reservation(
  number: string,
  room: string | null,
  arrival: string,
  departure: string,
  status = 'OK',
): RoomReservation {
  return {
    reservationNumber: number,
    guestName: `Guest ${number}`,
    roomNumber: room,
    roomType: room ? 'APT' : null,
    arrival,
    departure,
    status,
    board: 'RO',
  };
}

const ROOMS = ['1', '2', '3', '4', '5', '6', '10'].map((number) => ({ number, roomType: 'APT' }));

const RESERVATIONS = [
  reservation('A', '1', '2026-09-26', TODAY), // leaves today
  reservation('B', '2', TODAY, '2026-09-30'), // arrives today
  reservation('C', '3', '2026-09-25', '2026-10-02'), // stays
  reservation('D', '1', TODAY, '2026-09-29'), // arrives in the room A leaves
  reservation('E', '4', '2026-09-27', '2026-10-01', 'CLOSE'), // room closed
  reservation('F', null, TODAY, '2026-10-02', 'WL'), // waiting list, no room
  { ...reservation('M', '6', '2026-09-20', '2026-10-06'), guestName: 'MANTENIMIENTO' }, // maintenance
];

function fakeClient(overrides: { fail?: MiniHotelError } = {}) {
  const asked: RoomStatusQuery[] = [];
  const client: MiniHotelClient = {
    async roomStatus(query) {
      asked.push(query);
      if (overrides.fail) throw overrides.fail;
      return {
        hotelId: 'luxury50',
        rooms: ROOMS,
        roomTypes: [{ code: 'APT', description: 'Apartment' }],
        reservations: RESERVATIONS,
      };
    },
    async immediateAri() {
      throw new Error('unused');
    },
    async bulkAri() {
      throw new Error('unused');
    },
  };
  return { client, asked };
}

const numbers = (rows: readonly { reservationNumber: string }[]) => rows.map((r) => r.reservationNumber);
const rooms = (rows: readonly { roomNumber: string }[]) => rows.map((r) => r.roomNumber);

describe('the board', () => {
  it("is for the hotel's today, and asks from yesterday so today's departures are included", async () => {
    const fake = fakeClient();
    const service = createTodayService({ client: fake.client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });

    const board = await service.board();

    expect(board.date).toBe(TODAY);
    expect(fake.asked).toEqual([{ from: '2026-09-27', to: TODAY }]);
  });

  it('sorts reservations into arriving, leaving and staying', async () => {
    const service = createTodayService({ client: fakeClient().client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });
    const board = await service.board();

    // By room: D is in 1, B in 2, F has none.
    expect(numbers(board.arrivals)).toEqual(['D', 'B', 'F']);
    expect(numbers(board.departures)).toEqual(['A']);
    expect(numbers(board.stayovers)).toEqual(['C']);
  });

  it('counts a room as taken tonight by the arrival, not freed by the departure', async () => {
    const service = createTodayService({ client: fakeClient().client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });
    const board = await service.board();

    // 1: A leaves, D arrives. 2: B. 3: C. 4: closed. 6: maintenance.
    expect(rooms(board.vacant)).toEqual(['5', '10']);
  });

  it('lists a closed room as closed, never as a guest', async () => {
    const service = createTodayService({ client: fakeClient().client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });
    const board = await service.board();

    expect(rooms(board.closed)).toEqual(['4']);
    const everyone = [...board.arrivals, ...board.departures, ...board.stayovers];
    expect(numbers(everyone)).not.toContain('E');
  });

  it('hides a room in maintenance: not a guest, not free, not closed', async () => {
    const service = createTodayService({ client: fakeClient().client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });
    const board = await service.board();

    const everyone = [...board.arrivals, ...board.departures, ...board.stayovers];
    expect(numbers(everyone)).not.toContain('M');
    expect(rooms(board.vacant)).not.toContain('6');
    expect(rooms(board.closed)).not.toContain('6');
  });

  it('keeps a reservation with no room, sorted last', async () => {
    const service = createTodayService({ client: fakeClient().client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });
    const board = await service.board();

    const last = board.arrivals[board.arrivals.length - 1]!;
    expect([last.reservationNumber, last.roomNumber]).toEqual(['F', null]);
  });

  it('counts nights and names the room type', async () => {
    const service = createTodayService({ client: fakeClient().client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });
    const board = await service.board();

    expect(board.stayovers[0]).toEqual({
      reservationNumber: 'C',
      guestName: 'Guest C',
      roomNumber: '3',
      roomTypeName: 'Apartment',
      arrival: '2026-09-25',
      departure: '2026-10-02',
      nights: 7,
      status: 'OK',
    });
  });

  it('sorts rooms by number, not as text', async () => {
    const service = createTodayService({ client: fakeClient().client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });
    const board = await service.board();
    expect(rooms(board.vacant).at(-1)).toBe('10');
  });

  it('reuses an answer inside the window, and does not keep a failure', async () => {
    const fake = fakeClient();
    const service = createTodayService({ client: fake.client, timeZone: 'UTC', now: () => ISRAEL_EVENING });
    await service.board();
    await service.board();
    expect(fake.asked).toHaveLength(1);

    const failing = fakeClient({ fail: new MiniHotelError('timeout') });
    const retrying = createTodayService({ client: failing.client, timeZone: 'UTC', now: () => ISRAEL_EVENING });
    await expect(retrying.board()).rejects.toBeInstanceOf(MiniHotelError);
    await expect(retrying.board()).rejects.toBeInstanceOf(MiniHotelError);
    expect(failing.asked).toHaveLength(2);
  });
});

describe('the endpoint', () => {
  const VIEWER = 'today-viewer@example.com';

  let pool: pg.Pool;
  let admin: pg.Client;

  const session: SessionReader = { async read() { return { email: VIEWER, name: 'Test' }; } };
  const messaging = {
    async sendToConversation() {
      return { channel: 'telegram' as const, providerMessageId: 'stub' };
    },
    async indicateTyping() {},
  };

  async function get(today: TodayService | null) {
    const dashboards = today
      ? { today, availability: { today: () => TODAY, week: () => Promise.reject(new Error('unused')) } }
      : null;
    const app = buildApp({ pool, session, messaging, dashboards, logLevel: 'silent' });
    await app.ready();
    try {
      return await app.inject({ method: 'GET', url: '/api/dashboards/today' });
    } finally {
      await app.close();
    }
  }

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: urlForRole('admin_user') });
    admin = new pg.Client({ connectionString: urlForRole('admin_user') });
    await admin.connect();
    await admin.query('DELETE FROM public.admin_allowlist WHERE email = $1', [VIEWER]);
    await admin.query("INSERT INTO public.admin_allowlist (email, role) VALUES ($1, 'viewer')", [VIEWER]);
  });

  afterAll(async () => {
    await admin.query('DELETE FROM public.admin_allowlist WHERE email = $1', [VIEWER]);
    await admin.end();
    await pool.end();
  });

  it('serves a viewer the board', async () => {
    const service = createTodayService({ client: fakeClient().client, timeZone: 'Asia/Jerusalem', now: () => ISRAEL_EVENING });
    const response = await get(service);

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json()).sort()).toEqual([
      'arrivals',
      'closed',
      'date',
      'departures',
      'stayovers',
      'vacant',
    ]);
  });

  it('says so when this environment has no MiniHotel credentials', async () => {
    const response = await get(null);
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'not_configured' });
  });

  it('names a vendor failure with its code', async () => {
    const failing = createTodayService({
      client: fakeClient({ fail: new MiniHotelError('ip_not_authorized', 'A01') }).client,
      timeZone: 'UTC',
    });
    const response = await get(failing);

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'ip_not_authorized', code: 'A01' });
  });
});
