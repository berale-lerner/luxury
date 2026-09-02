-- 0004 — Row-Level Security.
--
-- Guests have no account of their own: they arrive over Telegram. There is no
-- authenticated database user to key policies on, so RLS is driven by session
-- variables that the code sets per request with SET LOCAL, from the *verified*
-- inbound payload — never from anything the model produced.
--
--   app.conversation_id  the conversation this request belongs to
--   app.guest_id         the guest that conversation is linked to
--
-- Both read through the helpers below, which return NULL when the variable was
-- never set. A NULL comparison is false, so an un-scoped query returns nothing
-- instead of everything: forgetting to set the variable fails closed.

BEGIN;

-- ---------------------------------------------------------------------------
-- Session helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_conversation_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.conversation_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION public.current_guest_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.guest_id', true), '')::uuid $$;

REVOKE ALL ON FUNCTION public.current_conversation_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_guest_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_conversation_id() TO bot_user, admin_user;
GRANT EXECUTE ON FUNCTION public.current_guest_id() TO bot_user, admin_user;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table in public
-- ---------------------------------------------------------------------------
-- Enabled everywhere, including tables the bot has no grant on. A grant added
-- later must not also silently hand over every row.
ALTER TABLE public.guests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_allowlist   ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- admin_user — sees and writes everything in public
-- ---------------------------------------------------------------------------
-- Written as explicit policies rather than the BYPASSRLS role attribute. A role
-- that bypasses RLS also bypasses every policy added in the future, invisibly;
-- a policy per table is listed here, and a table added without one fails
-- closed and loudly.
CREATE POLICY admin_all ON public.guests            FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.units             FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.unit_availability FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.bookings          FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.conversations     FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.messages          FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.requests          FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.tasks             FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.admin_allowlist   FOR ALL TO admin_user USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- bot_user — the current conversation, and the guest it belongs to
-- ---------------------------------------------------------------------------

-- Published apartments are public information. Unpublished ones are not.
CREATE POLICY bot_select_published ON public.units
  FOR SELECT TO bot_user
  USING (is_published);

CREATE POLICY bot_select_published_units ON public.unit_availability
  FOR SELECT TO bot_user
  USING (unit_id IN (SELECT id FROM public.units WHERE is_published));

-- Guest A asking for guest B's row gets nothing back — not an error, an empty
-- result, which is what a row-level boundary looks like from above.
CREATE POLICY bot_select_own_guest ON public.guests
  FOR SELECT TO bot_user
  USING (id = public.current_guest_id());

CREATE POLICY bot_select_own_bookings ON public.bookings
  FOR SELECT TO bot_user
  USING (guest_id = public.current_guest_id());

CREATE POLICY bot_select_own_conversation ON public.conversations
  FOR SELECT TO bot_user
  USING (id = public.current_conversation_id());

-- The code generates the id and sets app.conversation_id before inserting, so
-- the bot can only ever create the conversation it has declared it is handling.
CREATE POLICY bot_insert_own_conversation ON public.conversations
  FOR INSERT TO bot_user
  WITH CHECK (id = public.current_conversation_id());

CREATE POLICY bot_update_own_conversation ON public.conversations
  FOR UPDATE TO bot_user
  USING (id = public.current_conversation_id())
  WITH CHECK (id = public.current_conversation_id());

CREATE POLICY bot_select_own_messages ON public.messages
  FOR SELECT TO bot_user
  USING (conversation_id = public.current_conversation_id());

CREATE POLICY bot_insert_own_messages ON public.messages
  FOR INSERT TO bot_user
  WITH CHECK (conversation_id = public.current_conversation_id());

CREATE POLICY bot_select_own_requests ON public.requests
  FOR SELECT TO bot_user
  USING (
    conversation_id = public.current_conversation_id()
    OR guest_id = public.current_guest_id()
  );

CREATE POLICY bot_insert_own_requests ON public.requests
  FOR INSERT TO bot_user
  WITH CHECK (conversation_id = public.current_conversation_id());

-- The queue to the admin side: the bot may enqueue work for its own
-- conversation and may not read the queue back.
CREATE POLICY bot_insert_own_tasks ON public.tasks
  FOR INSERT TO bot_user
  WITH CHECK (conversation_id = public.current_conversation_id());

-- No bot policy on public.admin_allowlist, and no grant on it either.

COMMIT;
