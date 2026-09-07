-- Inbound messages carry the provider's update id, so a redelivery is a
-- no-op instead of a duplicate.
--
-- Telegram retries a webhook whenever the endpoint does not answer 2xx in
-- time, and MiniHotel retries six times over six hours (MINIHOTEL.md). Both
-- mean the same inbound event arrives more than once. Without a key to
-- deduplicate on, a slow response turns one guest message into two rows, the
-- agent answers twice, and the guest sees the bot talking to itself.
--
-- The column is nullable because outbound messages and manager messages have
-- no provider update to point at. The unique index is partial for the same
-- reason: it constrains the inbound rows that have one, and ignores the rest.

BEGIN;

ALTER TABLE public.messages
  ADD COLUMN provider_update_id text;

COMMENT ON COLUMN public.messages.provider_update_id IS
  'The channel provider''s id for the inbound update, used only to reject a redelivery. Null for outbound and manager messages.';

CREATE UNIQUE INDEX messages_provider_update_id_key
  ON public.messages (conversation_id, provider_update_id)
  WHERE provider_update_id IS NOT NULL;

-- Column-level, like every other grant to bot_user: it may write the id it
-- received and read it back to recognise a repeat, and nothing more.
GRANT SELECT (provider_update_id) ON public.messages TO bot_user;
GRANT INSERT (provider_update_id) ON public.messages TO bot_user;

COMMIT;
