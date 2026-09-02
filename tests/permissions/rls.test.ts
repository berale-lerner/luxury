/**
 * Row-Level Security.
 *
 * Guests have no database user, so the boundary is a session variable the code
 * sets per request from the verified inbound payload. These tests cover the
 * three ways that can go wrong: the wrong guest, the wrong conversation, and
 * no scope set at all.
 */
import type { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectAs, errorFrom, inSession, INSUFFICIENT_PRIVILEGE } from '../helpers/db.js';
import { ids } from '../helpers/fixtures.js';

describe('RLS confines bot_user to one guest and one conversation', () => {
  let bot: Client;

  beforeAll(async () => {
    bot = await connectAs('bot_user');
  });

  afterAll(async () => {
    await bot.end();
  });

  describe('guest scope', () => {
    it("returns guest A's bookings and nothing of guest B's", async () => {
      await inSession(bot, { guestId: ids.guestA }, async () => {
        const { rows } = await bot.query<{ reference: string }>(
          'SELECT reference FROM public.bookings ORDER BY reference',
        );
        expect(rows.map((r) => r.reference)).toEqual(['BK-A-001']);
      });
    });

    it("returns empty — not an error — when guest A asks for guest B's booking by id", async () => {
      await inSession(bot, { guestId: ids.guestA }, async () => {
        const { rows } = await bot.query('SELECT reference FROM public.bookings WHERE id = $1', [
          ids.bookingB,
        ]);
        expect(rows).toEqual([]);
      });
    });

    it('returns only the guest\'s own row from public.guests', async () => {
      await inSession(bot, { guestId: ids.guestB }, async () => {
        const { rows } = await bot.query<{ display_name: string }>(
          'SELECT display_name FROM public.guests',
        );
        expect(rows.map((r) => r.display_name)).toEqual(['Guest B']);
      });
    });
  });

  describe('conversation scope', () => {
    it('reads only the messages of the current conversation', async () => {
      await inSession(bot, { conversationId: ids.conversationA }, async () => {
        const { rows } = await bot.query<{ body: string }>('SELECT body FROM public.messages');
        expect(rows).toHaveLength(1);
        expect(rows[0]?.body).toContain('suite');
      });
    });

    it('cannot read another conversation even when given its id', async () => {
      await inSession(bot, { conversationId: ids.conversationA }, async () => {
        const { rows } = await bot.query(
          'SELECT channel_chat_id FROM public.conversations WHERE id = $1',
          [ids.conversationB],
        );
        expect(rows).toEqual([]);
      });
    });

    it('cannot write a message into another conversation', async () => {
      const error = await errorFrom(() =>
        inSession(bot, { conversationId: ids.conversationA }, () =>
          bot.query(
            `INSERT INTO public.messages (conversation_id, direction, sender, body)
             VALUES ($1, 'outbound', 'agent', 'sent to the wrong chat')`,
            [ids.conversationB],
          ),
        ),
      );
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
      expect(error.message).toMatch(/row-level security/i);
    });

    it('cannot update another conversation — the row is simply not there', async () => {
      await inSession(bot, { conversationId: ids.conversationA }, async () => {
        const result = await bot.query(
          `UPDATE public.conversations SET last_message_at = TIMESTAMPTZ '2026-04-01 10:00:00+00' WHERE id = $1`,
          [ids.conversationB],
        );
        expect(result.rowCount).toBe(0);
      });
    });

    it('can only create the conversation it declared it is handling', async () => {
      const otherId = '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f';
      const error = await errorFrom(() =>
        inSession(bot, { conversationId: ids.conversationA }, () =>
          bot.query(
            `INSERT INTO public.conversations (id, channel, channel_chat_id)
             VALUES ($1, 'telegram', 'tg-chat-smuggled')`,
            [otherId],
          ),
        ),
      );
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
    });

    it('can enqueue a task for its own conversation and not for another', async () => {
      await inSession(bot, { conversationId: ids.conversationA }, async () => {
        const ok = await bot.query(
          `INSERT INTO public.tasks (conversation_id, kind, payload)
           VALUES ($1, 'handoff_to_human', '{}'::jsonb)`,
          [ids.conversationA],
        );
        expect(ok.rowCount).toBe(1);
      });

      const error = await errorFrom(() =>
        inSession(bot, { conversationId: ids.conversationA }, () =>
          bot.query(
            `INSERT INTO public.tasks (conversation_id, kind, payload)
             VALUES ($1, 'handoff_to_human', '{}'::jsonb)`,
            [ids.conversationB],
          ),
        ),
      );
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
    });
  });

  describe('unpublished apartments', () => {
    it('hides an unpublished unit and its availability', async () => {
      await inSession(bot, { conversationId: ids.conversationA }, async () => {
        const units = await bot.query<{ name: string }>('SELECT name FROM public.units');
        expect(units.rows.map((r) => r.name)).toEqual(['Sea View Suite']);

        const availability = await bot.query<{ unit_id: string }>(
          'SELECT unit_id FROM public.unit_availability WHERE unit_id = $1',
          [ids.unpublishedUnit],
        );
        expect(availability.rows).toEqual([]);
      });
    });
  });

  describe('failing closed', () => {
    it('returns nothing when no session scope was set', async () => {
      const tables = ['bookings', 'guests', 'conversations', 'messages', 'requests'];
      for (const table of tables) {
        const { rows } = await bot.query(`SELECT 1 FROM public.${table}`);
        expect(rows, `${table} leaked rows without a session scope`).toEqual([]);
      }
    });

    it('treats an empty session variable as no scope rather than as a match', async () => {
      await inSession(bot, { guestId: '', conversationId: '' }, async () => {
        const { rows } = await bot.query('SELECT 1 FROM public.bookings');
        expect(rows).toEqual([]);
      });
    });

    it('drops the scope at the end of the transaction', async () => {
      await inSession(bot, { guestId: ids.guestA }, async () => {
        const { rows } = await bot.query('SELECT 1 FROM public.bookings');
        expect(rows).toHaveLength(1);
      });

      const afterRollback = await bot.query('SELECT 1 FROM public.bookings');
      expect(afterRollback.rows).toEqual([]);
    });
  });
});

describe('admin_user sees everything in public', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAs('admin_user');
  });

  afterAll(async () => {
    await admin.end();
  });

  it('reads every guest, booking and conversation without a session scope', async () => {
    const guests = await admin.query('SELECT id FROM public.guests');
    expect(guests.rowCount).toBe(2);

    const bookings = await admin.query('SELECT id FROM public.bookings');
    expect(bookings.rowCount).toBe(2);

    const conversations = await admin.query('SELECT id FROM public.conversations');
    expect(conversations.rowCount).toBe(2);
  });

  it('reads every conversation message, which is what the manager screen shows', async () => {
    const { rows } = await admin.query('SELECT body FROM public.messages');
    expect(rows).toHaveLength(2);
  });

  it('reads the business schema, including the numbers the bot must never see', async () => {
    const { rows } = await admin.query<{ cost_per_night: string }>(
      'SELECT cost_per_night FROM business.unit_pricing',
    );
    expect(rows[0]?.cost_per_night).toBe('310.00');
  });

  it('processes the task queue the bot writes to', async () => {
    const { rows } = await admin.query<{ kind: string }>('SELECT kind FROM public.tasks');
    expect(rows.map((r) => r.kind)).toContain('handoff_to_human');
  });
});
