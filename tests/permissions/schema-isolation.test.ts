/**
 * bot_user against the `business` schema.
 *
 * The assertion that matters is the negative one: every one of these
 * statements must be rejected. A version of this file that only checked what
 * the bot *is* allowed to read would still pass with every restriction removed.
 */
import type { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectAs, connectAsOwner, errorFrom, INSUFFICIENT_PRIVILEGE } from '../helpers/db.js';

const BUSINESS_TABLES = ['unit_pricing', 'booking_charges', 'costs', 'suppliers', 'payroll'];

describe('bot_user cannot reach the business schema', () => {
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

  it.each(BUSINESS_TABLES)('refuses SELECT from business.%s', async (table) => {
    const error = await errorFrom(() => bot.query(`SELECT * FROM business.${table}`));
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it.each(BUSINESS_TABLES)('refuses INSERT into business.%s', async (table) => {
    const error = await errorFrom(() =>
      bot.query(`INSERT INTO business.${table} DEFAULT VALUES`),
    );
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('refuses the cost price even when asked for by name', async () => {
    const error = await errorFrom(() =>
      bot.query('SELECT cost_per_night FROM business.unit_pricing'),
    );
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('has no USAGE on the schema, so no future GRANT on a business table could be used', async () => {
    const { rows } = await owner.query<{ usage: boolean }>(
      `SELECT has_schema_privilege('bot_user', 'business', 'USAGE') AS usage`,
    );
    expect(rows[0]?.usage).toBe(false);
  });

  it('holds no privilege of any kind on any table in business', async () => {
    const { rows } = await owner.query<{ table_name: string; privilege: string }>(
      `SELECT c.relname AS table_name, p.privilege
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) AS p(privilege)
        WHERE n.nspname = 'business'
          AND c.relkind = 'r'
          AND has_table_privilege('bot_user', c.oid, p.privilege)`,
    );
    // Listing what leaked, rather than just a count, so a failure names the table.
    expect(rows).toEqual([]);
  });

  it('cannot create objects of its own in public or business', async () => {
    const inPublic = await errorFrom(() => bot.query('CREATE TABLE public.smuggled (id int)'));
    expect(inPublic.code).toBe(INSUFFICIENT_PRIVILEGE);

    const inBusiness = await errorFrom(() => bot.query('CREATE TABLE business.smuggled (id int)'));
    expect(inBusiness.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});
