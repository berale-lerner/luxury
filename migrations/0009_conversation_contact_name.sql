-- What the platform says the person is called.
--
-- Telegram sends first_name, last_name and username on every message; the
-- webhook was parsing only the sender id and discarding them, so every
-- conversation in the admin list read "unidentified customer".
--
-- It belongs on the conversation rather than on public.guests, because a
-- prospect who messaged once is not a guest record — guest_id stays null
-- until a manager deliberately links the two (0002). This is the name to
-- show in a list of conversations; a guest's own display_name still wins
-- once that link exists.
--
-- Not identity, and not to be trusted as such: a person chooses their own
-- Telegram name and can change it. It is a label for a human reading a list.

BEGIN;

ALTER TABLE public.conversations
  ADD COLUMN contact_name text;

COMMENT ON COLUMN public.conversations.contact_name IS
  'Display name as reported by the messaging platform. Self-chosen by the contact; a label, never an identity check.';

-- The bot writes it when the conversation is created, follows it when the
-- person renames themselves, and reads it back to know whether it changed.
GRANT SELECT (contact_name), INSERT (contact_name), UPDATE (contact_name)
  ON public.conversations TO bot_user;

COMMIT;
