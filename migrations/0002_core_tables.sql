-- 0002 — core tables.
--
-- Placement rule (CLAUDE.md, "When adding a feature"): anything financial goes
-- in `business`. That is why a booking here carries dates, unit and status but
-- no money — the amount charged for it lives in business.booking_charges.

BEGIN;

-- ---------------------------------------------------------------------------
-- public
-- ---------------------------------------------------------------------------

CREATE TABLE public.guests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name       text NOT NULL,
  preferred_language text NOT NULL DEFAULT 'he',
  phone              text,
  email              text,
  internal_notes     text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.units (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  description         text,
  capacity            integer NOT NULL CHECK (capacity > 0),
  bedrooms            integer CHECK (bedrooms >= 0),
  amenities           text[] NOT NULL DEFAULT '{}',
  is_published        boolean NOT NULL DEFAULT false,
  -- The identifier used against the Mini-Hotel API. Operational, not
  -- guest-facing; not granted to bot_user in 0003.
  minihotel_unit_code text,
  internal_notes      text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.unit_availability (
  unit_id      uuid NOT NULL REFERENCES public.units (id) ON DELETE CASCADE,
  date         date NOT NULL,
  is_available boolean NOT NULL,
  -- Why a date is blocked. Operational; never granted to bot_user.
  block_reason text,
  synced_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unit_id, date)
);

CREATE TABLE public.bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      text NOT NULL UNIQUE,
  guest_id       uuid NOT NULL REFERENCES public.guests (id),
  unit_id        uuid NOT NULL REFERENCES public.units (id),
  check_in       date NOT NULL,
  check_out      date NOT NULL,
  status         text NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  internal_notes text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE INDEX bookings_guest_id_idx ON public.bookings (guest_id);

CREATE TABLE public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Null until a manager links the conversation to a guest. A prospect on
  -- Telegram is not a guest record.
  guest_id        uuid REFERENCES public.guests (id),
  channel         text NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'instagram')),
  -- The address the send layer resolves to. It is read from here, never
  -- supplied by a caller and never produced by the model.
  channel_chat_id text NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  -- Set when a manager writes into the conversation: the agent is muted there
  -- automatically and resumes only on an explicit manager action.
  agent_muted     boolean NOT NULL DEFAULT false,
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, channel_chat_id)
);

CREATE TABLE public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender          text NOT NULL CHECK (sender IN ('guest', 'agent', 'manager')),
  -- Untrusted text. Rendered as text in the admin UI, never as HTML.
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_id_created_at_idx
  ON public.messages (conversation_id, created_at);

CREATE TABLE public.requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations (id) ON DELETE SET NULL,
  guest_id        uuid REFERENCES public.guests (id),
  kind            text NOT NULL CHECK (kind IN ('booking_lead', 'service', 'other')),
  details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'in_progress', 'done')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- The one channel from bot to admin. The bot writes; admin pulls and processes.
-- Deliberately write-only for the bot: a queue it could read back is a queue it
-- could use to learn what the admin side is doing.
CREATE TABLE public.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations (id) ON DELETE SET NULL,
  kind            text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);

CREATE INDEX tasks_status_created_at_idx ON public.tasks (status, created_at);

-- Authentication is not authorization: signing in with Google proves identity,
-- this table decides access. Checked server-side against the returned profile.
CREATE TABLE public.admin_allowlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  added_by   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- business — money. No app role reaches this schema.
-- ---------------------------------------------------------------------------

CREATE TABLE business.suppliers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  contact    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business.unit_pricing (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id        uuid NOT NULL REFERENCES public.units (id) ON DELETE CASCADE,
  valid_from     date NOT NULL,
  valid_to       date,
  nightly_rate   numeric(12, 2) NOT NULL,
  -- The number that must never reach a guest, and therefore never reaches the
  -- model: it is not in a schema the bot can read at all.
  cost_per_night numeric(12, 2),
  currency       text NOT NULL DEFAULT 'ILS'
);

CREATE TABLE business.booking_charges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  amount     numeric(12, 2) NOT NULL,
  currency   text NOT NULL DEFAULT 'ILS',
  charged_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business.costs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     uuid REFERENCES public.units (id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES business.suppliers (id) ON DELETE SET NULL,
  amount      numeric(12, 2) NOT NULL,
  currency    text NOT NULL DEFAULT 'ILS',
  incurred_on date NOT NULL,
  category    text NOT NULL,
  note        text
);

CREATE TABLE business.payroll (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person     text NOT NULL,
  amount     numeric(12, 2) NOT NULL,
  currency   text NOT NULL DEFAULT 'ILS',
  paid_on    date NOT NULL
);

COMMIT;
