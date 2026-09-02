-- 0003 — GRANTs.
--
-- Grants for bot_user are column-level, not table-level, and each block below
-- states exactly what it exposes (CLAUDE.md: never add a GRANT to bot_user
-- without checking what it exposes). Adding a column to one of these lists is
-- a security decision, and the permission tests will notice it either way.
--
-- A column absent from a list is not merely unread — it is unreadable. That is
-- the point: the tool layer shrinks output, and the database makes the shrink
-- impossible to undo from application code.

BEGIN;

-- ---------------------------------------------------------------------------
-- admin_user — full access to both schemas
-- ---------------------------------------------------------------------------
-- The admin service is the highest-value target in the system precisely
-- because of this block. It is gated by an allowlist checked server-side, not
-- by the fact that its role can read everything.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public   TO admin_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA business TO admin_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public   TO admin_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA business TO admin_user;

-- Tables added by later migrations are readable by admin without a follow-up
-- grant. Applies to objects created by the role that runs the migrations, which
-- is the only role that creates objects here.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO admin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA business
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO admin_user;
-- There is deliberately no equivalent for bot_user. A new table is invisible to
-- the bot until someone writes a grant for it and justifies the columns.

-- ---------------------------------------------------------------------------
-- bot_user — start from nothing
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM bot_user;

-- units — what a prospect may be told about an apartment.
-- Exposes: name, description, capacity, bedrooms, amenities, publication flag.
-- Withheld: internal_notes (operational remarks), minihotel_unit_code (the
-- integration identifier — it gets its own grant when check_availability lands,
-- with its own justification).
GRANT SELECT (id, name, description, capacity, bedrooms, amenities, is_published)
  ON public.units TO bot_user;

-- unit_availability — whether a date is open. Nothing about why it is closed.
-- Withheld: block_reason (would leak internal operations), synced_at.
GRANT SELECT (unit_id, date, is_available)
  ON public.unit_availability TO bot_user;

-- guests — only enough to address a returning guest by name, and only their
-- own row (RLS, 0004).
-- Withheld: phone, email (contact details the bot never needs — the send layer
-- resolves the destination from the conversation), internal_notes.
GRANT SELECT (id, display_name, preferred_language)
  ON public.guests TO bot_user;

-- bookings — a guest asking about their own stay.
-- Withheld: internal_notes. Money is not withheld here; it is in `business`,
-- which this role cannot reach at all.
GRANT SELECT (id, reference, guest_id, unit_id, check_in, check_out, status)
  ON public.bookings TO bot_user;

-- conversations — the bot's own conversation, and the destination the send
-- layer resolves. The row is created by code that already knows which
-- conversation it is opening (see the INSERT policy in 0004).
GRANT SELECT (id, guest_id, channel, channel_chat_id, status, agent_muted, last_message_at)
  ON public.conversations TO bot_user;
GRANT INSERT (id, guest_id, channel, channel_chat_id)
  ON public.conversations TO bot_user;
-- The bot may record activity. It may not clear agent_muted: un-muting is an
-- explicit manager action, and a column it cannot write is one it cannot be
-- talked into writing.
GRANT UPDATE (last_message_at) ON public.conversations TO bot_user;

-- messages — conversation history, limited by RLS to the current conversation.
GRANT SELECT (id, conversation_id, direction, sender, body, created_at)
  ON public.messages TO bot_user;
GRANT INSERT (conversation_id, direction, sender, body)
  ON public.messages TO bot_user;

-- requests — the agent prepares, a human closes.
GRANT SELECT (id, conversation_id, guest_id, kind, status, created_at)
  ON public.requests TO bot_user;
GRANT INSERT (conversation_id, guest_id, kind, details)
  ON public.requests TO bot_user;

-- tasks — the queue to the admin side. Write-only, by design: no SELECT.
GRANT INSERT (conversation_id, kind, payload) ON public.tasks TO bot_user;

-- Not granted to bot_user in any form, and listed here so the omission is
-- visible rather than accidental:
--   public.admin_allowlist  — who may enter the admin interface
--   business.*              — every table; the role has no USAGE on the schema

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
-- Created in 0004; the revoke of default EXECUTE for PUBLIC happens there,
-- next to the definitions.

COMMIT;
