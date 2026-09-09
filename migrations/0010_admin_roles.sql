-- Roles on the allowlist.
--
-- Until now the list was binary: an address was on it, and everyone on it
-- could reach every route equally. Three roles, because the screen that
-- manages people forces a third — granting someone access is not the same
-- permission as replying to a guest:
--
--   viewer   read conversations
--   manager  and send messages, and mute the agent
--   owner    and manage this list
--
-- A CHECK rather than a lookup table. That is not a shortcut: a role is a set
-- of permissions written in code, so adding one requires a deploy either way,
-- and a constraint the database enforces beats a foreign key to a table whose
-- rows mean nothing without matching code.
--
-- No new GRANT. admin_user's access here is table-level (0003), so the column
-- is covered; bot_user has no access to this table in any form and gains none.

BEGIN;

ALTER TABLE public.admin_allowlist
  ADD COLUMN role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('viewer', 'manager', 'owner')),
  -- added_by said who let someone in. It did not say who later changed what
  -- they could do, which is the decision that grants reach over every guest
  -- conversation in the system.
  ADD COLUMN role_changed_by text,
  ADD COLUMN role_changed_at timestamptz;

-- Everyone already on the list ran this system when the list was binary, so
-- they had every permission it could confer. Leaving them on the default
-- would lock every current manager out of the screen that fixes it — and the
-- fix would be an INSERT by hand in production, which is the thing this whole
-- change exists to remove.
UPDATE public.admin_allowlist SET role = 'owner';

-- The default stays 'viewer' for everything inserted from here on: a row
-- created without a decision about it should be able to do the least.

COMMIT;
