-- Lets the bot find the conversation it is already handling.
--
-- 0004 scopes bot_user to `id = current_conversation_id()`, which works once
-- the id is known. What arrives from Telegram is a chat id, so on the second
-- message from the same guest the bot had no way to reach the existing row:
-- it could only ever insert a new conversation, forever.
--
-- The fix stays inside the mechanism already in use. The bot declares which
-- chat it is serving, taken from the verified webhook payload, and may then
-- see that one conversation and nothing else. No SECURITY DEFINER function,
-- no broadened grant, and the same failure mode as the rest: a query that
-- forgets to declare its scope returns nothing.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_channel_chat_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.channel_chat_id', true), '') $$;

COMMENT ON FUNCTION public.current_channel_chat_id() IS
  'The chat id the request declared it is serving, from the verified inbound payload. Never supplied by the model.';

CREATE POLICY bot_select_conversation_by_chat ON public.conversations
  FOR SELECT TO bot_user
  USING (channel_chat_id = public.current_channel_chat_id());

COMMIT;
