-- Telling the guest when the agent could not answer.
--
-- A model provider returning 503 is not a bug in this system and not
-- something it can fix. What it can do is stop leaving the guest in silence:
-- the platform redelivers the same update after a failure, so counting those
-- deliveries gives a place to say "not right now, try later" and stop.
--
-- Three pieces:
--   messages.delivery_attempts   how many times this update arrived
--   public.message_templates     the words, so they are not in the code
--   sender 'system'              so the thread does not credit the agent

BEGIN;

-- ---------------------------------------------------------------------------
-- Counting deliveries
-- ---------------------------------------------------------------------------
-- Incremented by the deduplicating insert: the first delivery writes the row,
-- and each redelivery bumps this instead of writing a second one.
ALTER TABLE public.messages
  ADD COLUMN delivery_attempts integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.messages.delivery_attempts IS
  'How many times the provider delivered this inbound update. 1 for anything the provider delivered once, and for outbound rows.';

-- Column-level, like every other grant to bot_user. It may raise the counter
-- on a row it already wrote and nothing else — not the body, not the sender,
-- not the direction.
GRANT SELECT (delivery_attempts) ON public.messages TO bot_user;
GRANT INSERT (delivery_attempts) ON public.messages TO bot_user;
GRANT UPDATE (delivery_attempts) ON public.messages TO bot_user;

-- ---------------------------------------------------------------------------
-- sender 'system'
-- ---------------------------------------------------------------------------
-- The fallback is written by code, not by the model. Recording it as 'agent'
-- would tell the manager that the agent said something it never said, and
-- would put it in the history the model is replayed — so a failure to answer
-- would become part of how the agent believes it talks.
ALTER TABLE public.messages
  DROP CONSTRAINT messages_sender_check,
  ADD CONSTRAINT messages_sender_check
    CHECK (sender IN ('guest', 'agent', 'manager', 'system'));

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------
-- Guest-facing text belongs in a table, not in a string literal: the owner
-- changes what the guest reads without a deploy (CLAUDE.md, "Editable
-- content"). This is the first one; a screen for it is its own task.
CREATE TABLE public.message_templates (
  key         text PRIMARY KEY,
  body        text NOT NULL,
  -- What this template is for, shown beside it in the admin UI.
  description text NOT NULL,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.message_templates
  FOR ALL TO admin_user USING (true) WITH CHECK (true);

-- The bot reads the words it is about to send, and nothing else about the
-- row: not who last changed it, not when.
GRANT SELECT (key, body) ON public.message_templates TO bot_user;

CREATE POLICY bot_select ON public.message_templates
  FOR SELECT TO bot_user USING (true);

-- Bilingual, because guests write in both and this message is sent precisely
-- when there is no model available to choose a language.
INSERT INTO public.message_templates (key, body, description, updated_by) VALUES (
  'agent_unavailable',
  E'מצטערים, יש כרגע תקלה זמנית ולא הצלחנו לענות. נסו שוב בעוד כמה דקות — ההודעה שלכם נשמרה.\n\nSorry — we are having a temporary problem and could not reply. Please try again in a few minutes; your message has been saved.',
  'Sent to the guest when the agent failed to answer after several delivery attempts.',
  'migration'
);

COMMIT;
