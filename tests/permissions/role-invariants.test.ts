/**
 * Invariants of the permission model itself.
 *
 * The tests above check today's tables. These check the shape of the model, so
 * that a table added by a future migration cannot quietly arrive without RLS,
 * and a role attribute cannot quietly turn every policy into decoration.
 */
import type { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectAsOwner } from '../helpers/db.js';

describe('role attributes', () => {
  let owner: Client;

  beforeAll(async () => {
    owner = await connectAsOwner();
  });

  afterAll(async () => {
    await owner.end();
  });

  it.each(['bot_user', 'admin_user'])(
    '%s is not a superuser and does not bypass RLS',
    async (role) => {
      const { rows } = await owner.query<{
        rolsuper: boolean;
        rolbypassrls: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
      }>(
        `SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
           FROM pg_roles WHERE rolname = $1`,
        [role],
      );
      expect(rows[0]).toEqual({
        rolsuper: false,
        rolbypassrls: false,
        rolcreatedb: false,
        rolcreaterole: false,
      });
    },
  );

  it('neither application role owns a table, so neither is exempt from RLS', async () => {
    const { rows } = await owner.query<{ relname: string; owner: string }>(
      `SELECT c.relname, pg_get_userbyid(c.relowner) AS owner
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('public', 'business')
          AND c.relkind = 'r'
          AND pg_get_userbyid(c.relowner) IN ('bot_user', 'admin_user')`,
    );
    expect(rows).toEqual([]);
  });

  it('grants bot_user no default privileges on tables created later', async () => {
    const { rows } = await owner.query<{ defaclacl: string }>(
      `SELECT defaclacl::text
         FROM pg_default_acl d
         JOIN pg_namespace n ON n.oid = d.defaclnamespace
        WHERE n.nspname IN ('public', 'business')
          AND defaclacl::text LIKE '%bot_user%'`,
    );
    expect(rows).toEqual([]);
  });
});

describe('every table in public', () => {
  let owner: Client;

  beforeAll(async () => {
    owner = await connectAsOwner();
  });

  afterAll(async () => {
    await owner.end();
  });

  it('has row-level security enabled', async () => {
    const { rows } = await owner.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND NOT rowsecurity
        ORDER BY tablename`,
    );
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it('has a policy for admin_user, so a missing one fails closed and visibly', async () => {
    const { rows } = await owner.query<{ tablename: string }>(
      `SELECT t.tablename
         FROM pg_tables t
        WHERE t.schemaname = 'public'
          AND NOT EXISTS (
            SELECT 1 FROM pg_policies p
             WHERE p.schemaname = 'public'
               AND p.tablename = t.tablename
               AND 'admin_user' = ANY (p.roles)
          )
        ORDER BY t.tablename`,
    );
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it('has no policy that applies to PUBLIC rather than to a named role', async () => {
    const { rows } = await owner.query<{ tablename: string; policyname: string }>(
      `SELECT tablename, policyname FROM pg_policies
        WHERE schemaname = 'public' AND roles::text[] @> ARRAY['public']`,
    );
    expect(rows).toEqual([]);
  });
});

describe('the schema was built from the migrations', () => {
  let owner: Client;

  beforeAll(async () => {
    owner = await connectAsOwner();
  });

  afterAll(async () => {
    await owner.end();
  });

  it('records every migration file as applied', async () => {
    const { rows } = await owner.query<{ filename: string }>(
      'SELECT filename FROM migrations.applied ORDER BY filename',
    );
    expect(rows.map((r) => r.filename)).toEqual([
      '0001_schemas_and_roles.sql',
      '0002_core_tables.sql',
      '0003_grants.sql',
      '0004_rls.sql',
    ]);
  });
});
