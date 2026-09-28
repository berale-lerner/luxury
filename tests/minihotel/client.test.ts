/**
 * The MiniHotel client, against a stub of MiniHotel.
 *
 * The stub answers with responses recorded from the real sandbox and the real
 * production endpoint (fixtures/README.md), so the parsing is tested against
 * what the vendor actually sends, spacing quirks included.
 */
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createMiniHotelClient, MiniHotelError } from '@luxury/minihotel';

const fixture = (name: string) =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const CREDENTIALS = { username: 'atitlan-test', password: 'p"a&s<s>\'|!/', hotelId: 'luxury50' };
const QUERY = { from: '2026-09-28', to: '2026-09-30', rateCode: 'USD' };

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

/** A stand-in for MiniHotel that answers however the test needs it to. */
async function stubMiniHotel(answer: { status?: number; body: string; delayMs?: number }) {
  const received: string[] = [];
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk as Buffer));
    request.on('end', () => {
      received.push(Buffer.concat(chunks).toString('utf8'));
      setTimeout(() => {
        response.writeHead(answer.status ?? 200, { 'content-type': 'text/xml' });
        response.end(answer.body);
      }, answer.delayMs ?? 0);
    });
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server!.address() as AddressInfo;
  return { received, ariUrl: `http://127.0.0.1:${port}/gds` };
}

async function failureOf(work: Promise<unknown>): Promise<MiniHotelError> {
  try {
    await work;
  } catch (error) {
    if (error instanceof MiniHotelError) return error;
    throw error;
  }
  throw new Error('expected the call to fail, and it did not');
}

describe('a Bulk ARI request', () => {
  it('escapes the credentials, so a password with quotes cannot break the XML', async () => {
    const stub = await stubMiniHotel({ body: await fixture('bulk-ari-sandbox.xml') });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    await client.bulkAri(QUERY);

    const sent = stub.received[0]!;
    expect(sent).toContain(
      '<Authentication username="atitlan-test" password="p&quot;a&amp;s&lt;s&gt;&apos;|!/" ResponseType="05" />',
    );
    expect(sent).toContain('<Hotel id="luxury50" />');
    expect(sent).toContain('<DateRange from="2026-09-28" to="2026-09-30" />');
    expect(sent).toContain('<Prices rateCode="USD">');
  });

  it('refuses dates that are not YYYY-MM-DD before anything is sent', async () => {
    const stub = await stubMiniHotel({ body: '' });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    await expect(client.bulkAri({ ...QUERY, to: '2026-09-30" /><X' })).rejects.toThrow(RangeError);
    expect(stub.received).toEqual([]);
  });
});

describe('a Bulk ARI response', () => {
  it('parses the recorded sandbox answer into room types and nights', async () => {
    const stub = await stubMiniHotel({ body: await fixture('bulk-ari-sandbox.xml') });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const ari = await client.bulkAri(QUERY);

    expect(ari.hotelId).toBe('sandbox');
    expect(ari.currency).toBe('USD');
    expect(ari.roomTypes.map((type) => [type.id, type.name])).toEqual([
      ['DBL', 'Double room'],
      ['EXECUTIVE', 'Executive Room'],
    ]);
    expect(ari.roomTypes[0]!.days[0]).toEqual({
      date: '2026-09-28',
      available: 9,
      price: 290,
      minNights: 1,
      closed: false,
      closedToArrival: false,
      closedToDeparture: false,
    });
  });

  it('keeps only the fields it names, dropping fees and meals', async () => {
    const stub = await stubMiniHotel({ body: await fixture('bulk-ari-sandbox.xml') });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const ari = await client.bulkAri(QUERY);

    expect(Object.keys(ari).sort()).toEqual(['currency', 'hotelId', 'roomTypes']);
    expect(Object.keys(ari.roomTypes[0]!).sort()).toEqual(['days', 'id', 'name']);
  });

  it('reads a single room type with a single night as lists', async () => {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<AvailRaters><Hotel id="luxury50" Name_h="x" Currency="USD" /><DateRange from="2026-09-28" to="2026-09-28" />
<RoomTypes>
<RoomType id="DUBAI" RoomName="DUBAI by luxury ATITLAN" BasicOccupancy="002" >
<Day Mdate="20260928" Mavailability="0" Mprice="180" Minngt="2" Mclose="Yes" McloseArr="No" McloseDep="Yes" />
</RoomType>
</RoomTypes>
</AvailRaters>`;
    const stub = await stubMiniHotel({ body });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const ari = await client.bulkAri({ ...QUERY, to: QUERY.from });

    expect(ari.roomTypes).toHaveLength(1);
    expect(ari.roomTypes[0]!.days).toEqual([
      {
        date: '2026-09-28',
        available: 0,
        price: 180,
        minNights: 2,
        closed: true,
        closedToArrival: false,
        closedToDeparture: true,
      },
    ]);
  });

  it('returns no room types when the hotel has none for the rate code', async () => {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<AvailRaters><Hotel id="luxury50" Name_h="x" Currency="USD" /><DateRange from="2026-09-28" to="2026-09-30" />
<RoomTypes>
</RoomTypes>
</AvailRaters>`;
    const stub = await stubMiniHotel({ body });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    expect((await client.bulkAri(QUERY)).roomTypes).toEqual([]);
  });

  it('rejects an answer whose availability is not a number', async () => {
    const body = (await fixture('bulk-ari-sandbox.xml')).replace('Mavailability="9"', 'Mavailability="many"');
    const stub = await stubMiniHotel({ body });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    expect((await failureOf(client.bulkAri(QUERY))).failure).toBe('bad_response');
  });

  it('rejects an answer that is not the expected XML at all', async () => {
    const stub = await stubMiniHotel({ body: '<html><body>Service Unavailable</body></html>' });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    expect((await failureOf(client.bulkAri(QUERY))).failure).toBe('bad_response');
  });
});

describe('a refusal', () => {
  it('reads the recorded "ERR 210" as rejected credentials', async () => {
    const stub = await stubMiniHotel({ body: await fixture('err-210-wrong-user.txt') });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const error = await failureOf(client.bulkAri(QUERY));
    expect([error.failure, error.code]).toEqual(['auth_failed', '210']);
  });

  it('reads the recorded "ERR 202" as a vendor error carrying its code', async () => {
    const stub = await stubMiniHotel({ body: await fixture('err-202-unknown-hotel.txt') });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const error = await failureOf(client.bulkAri(QUERY));
    expect([error.failure, error.code]).toEqual(['vendor_error', '202']);
  });

  // Seen from production but not recorded (fixtures/README.md). The body
  // follows the shape of the recorded errors and the vendor's code list.
  it('reads code A01 as an address missing from the allowlist', async () => {
    const stub = await stubMiniHotel({ body: 'ERR A01: IP address is not authorized' });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const error = await failureOf(client.bulkAri(QUERY));
    expect([error.failure, error.code]).toEqual(['ip_not_authorized', 'A01']);
  });

  it.each(['211', '863'])('reads code %s as rejected credentials, not as an address problem', async (code) => {
    const stub = await stubMiniHotel({ body: `ERR ${code}: Incorrect` });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const error = await failureOf(client.bulkAri(QUERY));
    expect([error.failure, error.code]).toEqual(['auth_failed', code]);
  });

  it('reads an HTTP 401 about the IP address as an address missing from the allowlist', async () => {
    const stub = await stubMiniHotel({ status: 401, body: 'Your IP Address is not authorized' });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const error = await failureOf(client.bulkAri(QUERY));
    expect([error.failure, error.status]).toEqual(['ip_not_authorized', 401]);
  });

  it('reports any other HTTP failure with its status', async () => {
    const stub = await stubMiniHotel({ status: 503, body: 'down' });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const error = await failureOf(client.bulkAri(QUERY));
    expect([error.failure, error.status]).toEqual(['http_error', 503]);
  });

  it('gives up after the timeout rather than holding the request open', async () => {
    const stub = await stubMiniHotel({ body: await fixture('bulk-ari-sandbox.xml'), delayMs: 500 });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl, timeoutMs: 50 });

    expect((await failureOf(client.bulkAri(QUERY))).failure).toBe('timeout');
  });

  it('reports an endpoint that cannot be reached', async () => {
    // Port 9 on loopback: nothing listens there.
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: 'http://127.0.0.1:9/gds' });

    expect((await failureOf(client.bulkAri(QUERY))).failure).toBe('unreachable');
  });

  it('never carries the password or the vendor text in the error', async () => {
    const stub = await stubMiniHotel({
      body: `ERR 210: Wrong User Name: ${CREDENTIALS.username} ${CREDENTIALS.password}`,
    });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const error = await failureOf(client.bulkAri(QUERY));
    const everything = JSON.stringify({ ...error, message: error.message, stack: error.stack });
    expect(everything).not.toContain(CREDENTIALS.password);
    expect(everything).not.toContain('Wrong User Name');
  });
});

describe('an Immediate ARI request', () => {
  const STAY = { from: '2026-10-04', to: '2026-10-05', adults: 2, rateCode: 'USD' };

  it('asks for every room type and board for the stay, with the guests and escaped credentials', async () => {
    const stub = await stubMiniHotel({ body: await fixture('immediate-ari-sandbox.xml') });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    await client.immediateAri({ ...STAY, children: 1 });

    const sent = stub.received[0]!;
    expect(sent).toContain(
      '<Authentication username="atitlan-test" password="p&quot;a&amp;s&lt;s&gt;&apos;|!/" />',
    );
    expect(sent).toContain('<Hotel id="luxury50" />');
    expect(sent).toContain('<DateRange from="2026-10-04" to="2026-10-05" />');
    expect(sent).toContain('<Guests adults="2" child="1" babies="0" />');
    expect(sent).toContain('<RoomType id="*ALL*" />');
    expect(sent).toContain('<Prices rateCode="USD">\n<Price boardCode="*ALL*" />');
  });

  it.each([
    ['departure on the arrival day', { to: '2026-10-04' }],
    ['departure before arrival', { to: '2026-10-03' }],
    ['a date that does not exist', { from: '2026-02-30' }],
    ['no adults', { adults: 0 }],
    ['a fraction of an adult', { adults: 1.5 }],
    ['more guests than any apartment', { adults: 21 }],
    ['negative children', { children: -1 }],
  ])('refuses %s before anything is sent', async (_label, change) => {
    const stub = await stubMiniHotel({ body: '' });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    await expect(client.immediateAri({ ...STAY, ...change })).rejects.toThrow(RangeError);
    expect(stub.received).toEqual([]);
  });
});

describe('an Immediate ARI response', () => {
  const STAY = { from: '2026-10-04', to: '2026-10-05', adults: 1, rateCode: 'USD' };

  it('parses the recorded sandbox answer', async () => {
    const stub = await stubMiniHotel({ body: await fixture('immediate-ari-sandbox.xml') });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const ari = await client.immediateAri(STAY);

    expect([ari.hotelId, ari.currency]).toEqual(['sandbox', 'USD']);
    expect(ari.roomTypes.map((t) => [t.id, t.nameEnglish, t.available, t.total])).toEqual([
      ['DBL', 'Double room', 2, 9],
      ['Executive', 'Executive Room', 1, 1],
    ]);
    expect(ari.roomTypes[0]!.prices[0]).toEqual({
      board: 'BB',
      boardDescription: 'BB',
      value: 290,
      valueNonRefundable: 261,
    });
  });

  it('keeps only the fields it names', async () => {
    const stub = await stubMiniHotel({ body: await fixture('immediate-ari-sandbox.xml') });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const ari = await client.immediateAri(STAY);

    expect(Object.keys(ari).sort()).toEqual(['currency', 'hotelId', 'roomTypes']);
    expect(Object.keys(ari.roomTypes[0]!).sort()).toEqual([
      'available',
      'id',
      'nameEnglish',
      'nameLocal',
      'prices',
      'total',
    ]);
  });

  it('reads one room type with one board as lists', async () => {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<AvailRaters>
  <Hotel id="luxury50" Name_h="x" Name_e="x" Currency="USD" />
  <DateRange from="2026-10-04" to="2026-10-05" />
  <RoomType id="DUBAI" Name_h="DUBAI" Name_e="DUBAI by luxury ATITLAN">
    <Inventory Allocation="0" maxavail="1" />
    <price board="RO" boardDesc="RO" value="180" value_nrf="162.00" />
  </RoomType>
</AvailRaters>`;
    const stub = await stubMiniHotel({ body });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const ari = await client.immediateAri(STAY);

    expect(ari.roomTypes).toHaveLength(1);
    expect(ari.roomTypes[0]!.available).toBe(0);
    expect(ari.roomTypes[0]!.prices).toHaveLength(1);
  });

  it('returns no room types when nothing matches the stay', async () => {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<AvailRaters>
  <Hotel id="luxury50" Name_h="x" Name_e="x" Currency="USD" />
  <DateRange from="2026-10-04" to="2026-10-05" />
</AvailRaters>`;
    const stub = await stubMiniHotel({ body });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    expect((await client.immediateAri(STAY)).roomTypes).toEqual([]);
  });

  it('rejects a room type without an inventory', async () => {
    const body = (await fixture('immediate-ari-sandbox.xml')).replace('<Inventory Allocation="2" maxavail="9" />', '');
    const stub = await stubMiniHotel({ body });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    expect((await failureOf(client.immediateAri(STAY))).failure).toBe('bad_response');
  });

  it('reports ERR 303 as a vendor error carrying its code', async () => {
    const stub = await stubMiniHotel({ body: 'ERR 303: Incorrect room linkage setup' });
    const client = createMiniHotelClient({ credentials: CREDENTIALS, ariUrl: stub.ariUrl });

    const error = await failureOf(client.immediateAri(STAY));
    expect([error.failure, error.code]).toEqual(['vendor_error', '303']);
  });
});
