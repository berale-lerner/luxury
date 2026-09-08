-- The tables Better Auth stores sign-in state in.
--
-- Written as a migration rather than created by `npx auth migrate`, because
-- migrations are the single source of truth for this database (CLAUDE.md).
-- A table that exists in production but not in the migration files is a
-- table the permission tests never see.
--
-- The shape is Better Auth's, taken from its own getSchema() output for this
-- exact configuration rather than from documentation. Camel-cased column
-- names are quoted because that is what the library queries for.
--
-- These hold identity, not authorisation. Who may actually enter is
-- public.admin_allowlist, checked separately on every request.

BEGIN;

CREATE TABLE public."user" (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  email           text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image           text,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.session (
  id          text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token       text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  -- Cascading matters here: deleting a person must not leave a session that
  -- still authenticates as them.
  "userId"    text NOT NULL REFERENCES public."user" (id) ON DELETE CASCADE
);

CREATE INDEX session_user_id_idx ON public.session ("userId");
CREATE INDEX session_expires_at_idx ON public.session ("expiresAt");

CREATE TABLE public.account (
  id                       text PRIMARY KEY,
  "accountId"              text NOT NULL,
  "providerId"             text NOT NULL,
  "userId"                 text NOT NULL REFERENCES public."user" (id) ON DELETE CASCADE,
  "accessToken"            text,
  "refreshToken"           text,
  "idToken"                text,
  "accessTokenExpiresAt"   timestamptz,
  "refreshTokenExpiresAt"  timestamptz,
  scope                    text,
  password                 text,
  "createdAt"              timestamptz NOT NULL DEFAULT now(),
  "updatedAt"              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX account_user_id_idx ON public.account ("userId");

CREATE TABLE public.verification (
  id           text PRIMARY KEY,
  identifier   text NOT NULL,
  value        text NOT NULL,
  "expiresAt"  timestamptz NOT NULL,
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  "updatedAt"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX verification_identifier_idx ON public.verification (identifier);

-- admin_user runs the sign-in flow, so it reads and writes these.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public."user", public.session, public.account, public.verification
  TO admin_user;

-- bot_user is granted nothing. It has no sign-in flow, and these tables hold
-- OAuth tokens: the strongest reason yet for the internet-facing service not
-- to reach them.
ALTER TABLE public."user"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification  ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public."user"       FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.session      FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.account      FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.verification FOR ALL TO admin_user USING (true) WITH CHECK (true);

COMMIT;
