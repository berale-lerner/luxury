-- The agent's system prompt, as an ordered set of documents the owner edits.
--
-- Three tables rather than one, because the manager edits a draft while the
-- bot serves whatever was last published (DESIGN.md):
--
--   prompt_documents   the working set, edited freely
--   prompt_versions    a snapshot of the whole set, taken at publish
--
-- Versioning is set-level on purpose. Reverting one document while the others
-- moved on would produce a combination that never ran and was never reviewed.

BEGIN;

CREATE TABLE public.agents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable handle the code refers to, so a rename in the UI breaks nothing.
  key        text NOT NULL UNIQUE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prompt_documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid NOT NULL REFERENCES public.agents (id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  -- Assembly is concatenation, so order is part of the meaning.
  position   integer NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, position)
);

CREATE TABLE public.prompt_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       uuid NOT NULL REFERENCES public.agents (id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  -- The assembled prompt exactly as the agent will receive it. Frozen at
  -- publish: reading the documents at call time would mean a half-finished
  -- edit could reach a guest.
  body           text NOT NULL,
  -- What the set looked like, for the history view and for revert.
  snapshot       jsonb NOT NULL,
  published_by   text,
  published_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, version_number)
);

CREATE INDEX prompt_versions_latest_idx
  ON public.prompt_versions (agent_id, version_number DESC);

-- admin_user reaches everything here through its schema-wide grant; the rows
-- below are only about what the bot may see.
ALTER TABLE public.agents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all ON public.agents           FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.prompt_documents FOR ALL TO admin_user USING (true) WITH CHECK (true);
CREATE POLICY admin_all ON public.prompt_versions  FOR ALL TO admin_user USING (true) WITH CHECK (true);

-- The bot resolves an agent by key and reads published versions. It is given
-- no access to prompt_documents at all: those are drafts, and a draft is
-- exactly the text the manager has not decided to serve yet.
GRANT SELECT (id, key, name) ON public.agents TO bot_user;
GRANT SELECT (id, agent_id, version_number, body, published_at)
  ON public.prompt_versions TO bot_user;

CREATE POLICY bot_select_agents ON public.agents
  FOR SELECT TO bot_user
  USING (true);

CREATE POLICY bot_select_published_versions ON public.prompt_versions
  FOR SELECT TO bot_user
  USING (true);

-- Seeded so the service has an agent to resolve on a fresh database. The
-- prompt itself is content, and content is the owner's to write.
INSERT INTO public.agents (key, name) VALUES ('guest', 'Guest conversation agent');

COMMIT;
