/**
 * The availability screen: the week it asks MiniHotel for, how often it asks,
 * and what the endpoint answers when MiniHotel says no.
 *
 * MiniHotel itself is a fake client here; its wire format is covered in
 * tests/minihotel. The route tests drive the real app, guard included,
 * because "viewer may read this" is decided on the server.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import {
  MiniHotelError,
  type ImmediateAri,
  type ImmediateAriQuery,
  type MiniHotelClient,
} from '@luxury/minihotel';
import { buildApp } from '../../apps/admin/server/src/app.js';
import type { SessionReader } from '../../apps/admin/server/src/auth/session.js';
import {
  addDays,
  createAvailabilityService,
  type AvailabilityService,
} from '../../apps/admin/server/src/availability/week.js';
import { loadConfig, miniHotelSettings } from '../../apps/admin/server/src/config.js';
import { urlForRole } from '../helpers/config.js';

/** 23:30 UTC on the 27th is already the 28th in Israel. */
const LATE_EVENING_UTC = new Date('2026-09-27T23:30:00Z');

function stayType(id: string, available: number) {
  return {
    id,
    nameLocal: `${id} local`,
    nameEnglish: `${id} by luxury ATITLAN`,
    available,
    total: 5,
    prices: [{ board: 'RO', boardDescription: 'RO', value: 180, valueNonRefundable: 162 }],
  };
}

/**
 * A MiniHotel that answers every stay and records the questions. `omit`
 * leaves a room type out of the answer for one arrival date.
 */
function fakeClient(overrides: { fail?: MiniHotelError; omit?: { id: string; on: string } } = {}) {
  const asked: ImmediateAriQuery[] = [];
  const client: MiniHotelClient = {
    async immediateAri(query): Promise<ImmediateAri> {
      asked.push(query);
      if (overrides.fail) throw overrides.fail;
      const roomTypes = [stayType('DUBAI', 3), stayType('MIAMI', 0)].filter(
        (type) => !(overrides.omit && type.id === overrides.omit.id && query.from === overrides.omit.on),
      );
      return { hotelId: 'luxury50', currency: 'USD', roomTypes };
    },
    async bulkAri() {
      throw new Error('the availability screen does not use Bulk ARI');
    },
  };
  return { client, asked };
}

describe('the week', () => {
  it("starts on the hotel's today, not the server's", () => {
    const service = createAvailabilityService({
      client: fakeClient().client,
      rateCode: 'USD',
      timeZone: 'Asia/Jerusalem',
      now: () => LATE_EVENING_UTC,
    });
    expect(service.today()).toBe('2026-09-28');
  });

  it('asks for seven one-night stays, departure the next day, with the configured rate code', async () => {
    const fake = fakeClient();
    const service = createAvailabilityService({ client: fake.client, rateCode: 'USD', timeZone: 'UTC' });

    const week = await service.week('2026-09-28');

    expect(fake.asked.map((q) => [q.from, q.to])).toEqual([
      ['2026-09-28', '2026-09-29'],
      ['2026-09-29', '2026-09-30'],
      ['2026-09-30', '2026-10-01'],
      ['2026-10-01', '2026-10-02'],
      ['2026-10-02', '2026-10-03'],
      ['2026-10-03', '2026-10-04'],
      ['2026-10-04', '2026-10-05'],
    ]);
    expect(fake.asked.every((q) => q.rateCode === 'USD' && q.adults === 1)).toBe(true);
    expect([week.from, week.to]).toEqual(['2026-09-28', '2026-10-04']);
    expect(week.roomTypes[0]!.nights.map((n) => n.date)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });

  it('crosses a month and a year boundary', () => {
    expect(addDays('2026-12-29', 6)).toBe('2027-01-04');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('returns each night with exactly the fields the screen uses', async () => {
    const service = createAvailabilityService({ client: fakeClient().client, rateCode: 'USD', timeZone: 'UTC' });
    const week = await service.week('2026-09-28');
    expect(Object.keys(week.roomTypes[0]!.nights[0]!).sort()).toEqual(['available', 'date', 'total']);
  });

  it('keeps sold-out nights as zero, and names types in English', async () => {
    const service = createAvailabilityService({ client: fakeClient().client, rateCode: 'USD', timeZone: 'UTC' });
    const week = await service.week('2026-09-28');

    expect(week.roomTypes.map((type) => [type.id, type.name])).toEqual([
      ['DUBAI', 'DUBAI by luxury ATITLAN'],
      ['MIAMI', 'MIAMI by luxury ATITLAN'],
    ]);
    expect(week.roomTypes[1]!.nights[0]).toEqual({ date: '2026-09-28', available: 0, total: 5 });
  });

  it('leaves out a night MiniHotel did not return a type for, rather than guessing zero', async () => {
    const fake = fakeClient({ omit: { id: 'MIAMI', on: '2026-09-30' } });
    const service = createAvailabilityService({ client: fake.client, rateCode: 'USD', timeZone: 'UTC' });
    const week = await service.week('2026-09-28');

    const miami = week.roomTypes.find((type) => type.id === 'MIAMI')!;
    expect(miami.nights.map((n) => n.date)).not.toContain('2026-09-30');
    expect(miami.nights).toHaveLength(6);
  });
});

describe('how often MiniHotel is asked', () => {
  it('reuses an answer inside the window, and asks again after it', async () => {
    let clock = new Date('2026-09-28T09:00:00Z');
    const fake = fakeClient();
    const service = createAvailabilityService({
      client: fake.client,
      rateCode: 'USD',
      timeZone: 'UTC',
      now: () => clock,
      ttlMs: 30_000,
    });

    await service.week('2026-09-28');
    clock = new Date(clock.getTime() + 29_000);
    await service.week('2026-09-28');
    expect(fake.asked).toHaveLength(7);

    clock = new Date(clock.getTime() + 2_000);
    await service.week('2026-09-28');
    expect(fake.asked).toHaveLength(14);
  });

  it('makes one call for two requests that arrive together', async () => {
    const fake = fakeClient();
    const service = createAvailabilityService({ client: fake.client, rateCode: 'USD', timeZone: 'UTC' });

    await Promise.all([service.week('2026-09-28'), service.week('2026-09-28')]);
    expect(fake.asked).toHaveLength(7);
  });

  it('does not keep a failure, so trying again asks again', async () => {
    const fake = fakeClient({ fail: new MiniHotelError('ip_not_authorized', 'A01') });
    const service = createAvailabilityService({ client: fake.client, rateCode: 'USD', timeZone: 'UTC' });

    await expect(service.week('2026-09-28')).rejects.toBeInstanceOf(MiniHotelError);
    await expect(service.week('2026-09-28')).rejects.toBeInstanceOf(MiniHotelError);
    expect(fake.asked).toHaveLength(14);
  });
});

describe('the configuration', () => {
  const REQUIRED = {
    DATABASE_URL: 'postgres://x',
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    AUTH_SECRET: 'x'.repeat(32),
    PUBLIC_URL: 'https://admin.example.com',
    TELEGRAM_BOT_TOKEN: 'token',
  };

  it('starts without MiniHotel, and says it has none', () => {
    expect(miniHotelSettings(loadConfig({ ...REQUIRED }))).toBeNull();
  });

  it('treats the empty values in .env.example as unset', () => {
    const config = loadConfig({
      ...REQUIRED,
      MINIHOTEL_USERNAME: '',
      MINIHOTEL_PASSWORD: '',
      MINIHOTEL_HOTEL_ID: '',
      MINIHOTEL_RATE_CODE: '',
      MINIHOTEL_ARI_URL: '',
    });
    expect(miniHotelSettings(config)).toBeNull();
  });

  it('refuses to start with only some of the credentials', () => {
    expect(() => loadConfig({ ...REQUIRED, MINIHOTEL_USERNAME: 'u' })).toThrow(/MINIHOTEL_PASSWORD/);
  });

  it('defaults to production and the USD rate code', () => {
    const settings = miniHotelSettings(
      loadConfig({ ...REQUIRED, MINIHOTEL_USERNAME: 'u', MINIHOTEL_PASSWORD: 'p', MINIHOTEL_HOTEL_ID: 'h' }),
    );
    expect(settings).toEqual({ credentials: { username: 'u', password: 'p', hotelId: 'h' }, rateCode: 'USD' });
  });

  it('never names a value in the error, only which setting is wrong', () => {
    expect(() =>
      loadConfig({ ...REQUIRED, MINIHOTEL_PASSWORD: 'the-real-password' }),
    ).toThrow(/^(?!.*the-real-password)/s);
  });
});

describe('the endpoint', () => {
  const VIEWER = 'availability-viewer@example.com';

  let pool: pg.Pool;
  let admin: pg.Client;

  const session: SessionReader = { async read() { return { email: VIEWER, name: 'Test' }; } };
  const messaging = {
    async sendToConversation() {
      return { channel: 'telegram' as const, providerMessageId: 'stub' };
    },
    async indicateTyping() {},
  };

  async function get(url: string, availability: AvailabilityService | null) {
    const app = buildApp({ pool, session, messaging, availability, logLevel: 'silent' });
    await app.ready();
    try {
      return await app.inject({ method: 'GET', url });
    } finally {
      await app.close();
    }
  }

  function serviceWith(client: MiniHotelClient) {
    return createAvailabilityService({
      client,
      rateCode: 'USD',
      timeZone: 'UTC',
      now: () => new Date('2026-09-28T09:00:00Z'),
    });
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

  it("serves a viewer the week from today when no date is given", async () => {
    const fake = fakeClient();
    const response = await get('/api/availability', serviceWith(fake.client));

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect([body.today, body.from, body.to, body.currency]).toEqual([
      '2026-09-28',
      '2026-09-28',
      '2026-10-04',
      'USD',
    ]);
  });

  it('starts from the date asked for', async () => {
    const fake = fakeClient();
    await get('/api/availability?from=2026-10-05', serviceWith(fake.client));
    expect(fake.asked[0]!.from).toBe('2026-10-05');
  });

  it.each([
    ['not a date', 'next-week'],
    ['a date that does not exist', '2026-02-31'],
    ['more than two years ahead', '2028-10-01'],
    ['more than a year back', '2025-09-01'],
    ['text after the date', '2026-10-05T00:00'],
  ])('refuses %s without calling MiniHotel', async (_label, from) => {
    const fake = fakeClient();
    const response = await get(`/api/availability?from=${encodeURIComponent(from)}`, serviceWith(fake.client));
    expect(response.statusCode).toBe(400);
    expect(fake.asked).toEqual([]);
  });

  it('says so when this environment has no MiniHotel credentials', async () => {
    const response = await get('/api/availability', null);
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'not_configured' });
  });

  it('names an address missing from the allowlist, with the vendor code', async () => {
    const fake = fakeClient({ fail: new MiniHotelError('ip_not_authorized', 'A01') });
    const response = await get('/api/availability', serviceWith(fake.client));

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'ip_not_authorized', code: 'A01' });
  });

  it('names a timeout, which has no vendor code', async () => {
    const fake = fakeClient({ fail: new MiniHotelError('timeout') });
    const response = await get('/api/availability', serviceWith(fake.client));

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'timeout', code: null });
  });
});
