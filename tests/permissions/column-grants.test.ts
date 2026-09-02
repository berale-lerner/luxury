/**
 * Column-level GRANTs for bot_user.
 *
 * A column missing from a grant is not merely unread — it is unreadable, and
 * that is what makes "the tool shrinks its output" more than a convention.
 * These tests also fix the exact granted column set: adding a column to a
 * GRANT breaks a test here, which is the point at which someone has to justify
 * what it exposes.
 */
import type { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectAs, connectAsOwner, errorFrom, INSUFFICIENT_PRIVILEGE } from '../helpers/db.js';
import { ids } from '../helpers/fixtures.js';
import { inSession } from '../helpers/db.js';

/** The complete SELECT grant for bot_user, table by table. */
const SELECTABLE_COLUMNS: Record<string, string[]> = {
  units: ['id', 'name', 'description', 'capacity', 'bedrooms', 'amenities', 'is_published'],
  unit_availability: ['unit_id', 'date', 'is_available'],
  guests: ['id', 'display_name', 'preferred_language'],
  bookings: ['id', 'reference', 'guest_id', 'unit_id', 'check_in', 'check_out', 'status'],
  conversations: [
    'id',
    'guest_id',
    'channel',
    'channel_chat_id',
    'status',
    'agent_muted',
    'last_message_at',
  ],
  messages: ['id', 'conversation_id', 'direction', 'sender', 'body', 'created_at'],
  requests: ['id', 'conversation_id', 'guest_id', 'kind', 'status', 'created_at'],
};

/** Columns the bot must not be able to read, and why they were withheld. */
const WITHHELD = [
  ['units', 'internal_notes', 'operational remarks about the apartment'],
  ['units', 'minihotel_unit_code', 'integration identifier, granted with the tool that needs it'],
  ['unit_availability', 'block_reason', 'why a date is closed leaks internal operations'],
  ['guests', 'phone', 'contact details the bot never needs'],
  ['guests', 'email', 'contact details the bot never needs'],
  ['guests', 'internal_notes', 'manager notes about the guest'],
  ['bookings', 'internal_notes', 'manager notes about the stay'],
  ['requests', 'details', 'what the bot wrote into a request is not read back by it'],
] as const;

describe('bot_user column grants', () => {
  let bot: Client;
  let owner: Client;

  beforeAll(async () => {
    bot = await connectAs('bot_user');
    owner = await connectAsOwner();
  });

  afterAll(async () => {
    await bot.end();
    await owner.end();
  });

  it.each(Object.entries(SELECTABLE_COLUMNS))(
    'grants exactly the listed columns on public.%s',
    async (table, columns) => {
      const { rows } = await owner.query<{ column_name: string }>(
        `SELECT column_name
           FROM information_schema.column_privileges
          WHERE grantee = 'bot_user'
            AND table_schema = 'public'
            AND table_name = $1
            AND privilege_type = 'SELECT'
          ORDER BY column_name`,
        [table],
      );
      expect(rows.map((r) => r.column_name)).toEqual([...columns].sort());
    },
  );

  it.each(WITHHELD)('refuses public.%s.%s (%s)', async (table, column) => {
    const error = await errorFrom(() => bot.query(`SELECT ${column} FROM public.${table}`));
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  // public.messages is the one table where every column is granted, so `*`
  // there is legitimately the same as the column list.
  it.each(Object.keys(SELECTABLE_COLUMNS).filter((table) => table !== 'messages'))(
    'refuses SELECT * on public.%s, because * is not a column list',
    async (table) => {
      const error = await errorFrom(() => bot.query(`SELECT * FROM public.${table}`));
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
    },
  );

  it('cannot read the task queue it writes to', async () => {
    const error = await errorFrom(() => bot.query('SELECT id FROM public.tasks'));
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('cannot read the admin allowlist', async () => {
    const error = await errorFrom(() => bot.query('SELECT email FROM public.admin_allowlist'));
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('cannot clear agent_muted — un-muting is a manager action', async () => {
    const error = await errorFrom(() =>
      inSession(bot, { conversationId: ids.conversationA }, () =>
        bot.query('UPDATE public.conversations SET agent_muted = false WHERE id = $1', [
          ids.conversationA,
        ]),
      ),
    );
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('can update last_message_at, the one column it was granted', async () => {
    await inSession(bot, { conversationId: ids.conversationA }, async () => {
      const result = await bot.query(
        `UPDATE public.conversations SET last_message_at = TIMESTAMPTZ '2026-04-01 10:00:00+00' WHERE id = $1`,
        [ids.conversationA],
      );
      expect(result.rowCount).toBe(1);
    });
  });

  it('cannot delete a message, a booking or a conversation', async () => {
    for (const table of ['messages', 'bookings', 'conversations']) {
      const error = await errorFrom(() => bot.query(`DELETE FROM public.${table}`));
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
    }
  });

  it('cannot change a booking, a unit or a guest', async () => {
    const statements = [
      `UPDATE public.bookings SET status = 'cancelled'`,
      `UPDATE public.units SET is_published = true`,
      `UPDATE public.guests SET display_name = 'x'`,
    ];
    for (const statement of statements) {
      const error = await errorFrom(() => bot.query(statement));
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
    }
  });

  it('can read the granted columns it actually needs', async () => {
    await inSession(bot, { conversationId: ids.conversationA, guestId: ids.guestA }, async () => {
      const units = await bot.query('SELECT id, name, capacity FROM public.units');
      expect(units.rowCount).toBe(1);

      const booking = await bot.query(
        'SELECT reference, check_in, status FROM public.bookings WHERE guest_id = $1',
        [ids.guestA],
      );
      expect(booking.rows[0]).toMatchObject({ reference: 'BK-A-001', status: 'confirmed' });
    });
  });
});
