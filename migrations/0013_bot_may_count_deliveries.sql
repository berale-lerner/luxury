-- The row-level half of the delivery counter.
--
-- 0012 granted bot_user UPDATE on messages.delivery_attempts and stopped
-- there, which is exactly half a permission: RLS is enabled on the table and
-- bot_user has policies for SELECT and INSERT only. Postgres then refuses the
-- ON CONFLICT ... DO UPDATE with "new row violates row-level security policy",
-- so the first delivery was stored and every redelivery failed.
--
-- Separate from 0012 rather than folded into it because 0012 has already been
-- applied to a database whose contents are worth keeping, and a migration
-- that has run is not edited afterwards.
--
-- What this exposes, stated plainly (CLAUDE.md: never add a grant to bot_user
-- without checking exactly what it exposes): rows of the conversation the
-- request has already claimed, which is the same scope the SELECT and INSERT
-- policies use. The GRANT in 0012 is column-level, so the only column this
-- policy can reach is delivery_attempts — not the body, not the sender, not
-- the direction. A message cannot be rewritten through it.

BEGIN;

CREATE POLICY bot_update_own_message_attempts ON public.messages
  FOR UPDATE TO bot_user
  USING (conversation_id = public.current_conversation_id())
  WITH CHECK (conversation_id = public.current_conversation_id());

COMMIT;
