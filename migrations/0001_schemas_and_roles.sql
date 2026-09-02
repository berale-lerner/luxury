-- 0001 — schemas, roles and the default-deny baseline.
--
-- Migrations are the single source of truth for roles, GRANTs and RLS
-- (CLAUDE.md, Database). Nothing here may be reproduced by hand in a console:
-- a database configured outside the code is a database the tests cannot verify.
--
-- Roles are created without a password. Passwords are set per environment,
-- out of band, and never land in git. A role that already exists is not
-- recreated, but its attributes are re-asserted below — an attribute changed
-- by hand is a bypass of this file, and must not survive a migration run.

BEGIN;

-- ---------------------------------------------------------------------------
-- Schemas
-- ---------------------------------------------------------------------------
-- public   — shared core data: units, availability, bookings, guests,
--            requests, conversations, tasks
-- business — money: revenue, costs, suppliers, pricing, payroll.
--            This is a sensitivity boundary, not an app's schema. No app role
--            touches it, now or later; a future finance app works through
--            apps/admin.
CREATE SCHEMA IF NOT EXISTS business;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bot_user') THEN
    CREATE ROLE bot_user LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin_user') THEN
    CREATE ROLE admin_user LOGIN;
  END IF;
END
$$;

-- NOBYPASSRLS is the attribute that makes every policy in 0004 real: a role
-- with BYPASSRLS reads every row of every table and no policy applies.
ALTER ROLE bot_user   NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE admin_user NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

-- ---------------------------------------------------------------------------
-- Default deny
-- ---------------------------------------------------------------------------
-- Postgres hands PUBLIC a set of privileges on a fresh database. Take them
-- away first, then grant back only what a role is meant to have. Everything
-- below this line is an addition to nothing.
DO $$
BEGIN
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO bot_user, admin_user', current_database());
END
$$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO bot_user, admin_user;

REVOKE ALL ON SCHEMA business FROM PUBLIC;
GRANT USAGE ON SCHEMA business TO admin_user;
-- bot_user is deliberately absent here. Without USAGE on the schema, no GRANT
-- on a business table could be used even if one were added by accident.

COMMIT;
