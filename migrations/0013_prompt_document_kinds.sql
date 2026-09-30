-- Two kinds of prompt document: text, and a table (work/0016).
--
-- A table keeps its cells as JSON — the columns are the manager's to define,
-- so there is nothing here to normalise them into — and becomes Markdown only
-- when the set is assembled (packages/shared/src/prompt.ts). body is unused
-- by a table: the cells are the one source, and a rendered copy stored beside
-- them would be a second one that could disagree.
--
-- No grant changes. bot_user still has no access to prompt_documents at all
-- (migration 0007); it reads the assembled text from prompt_versions, which
-- is where a table arrives already rendered.

BEGIN;

ALTER TABLE public.prompt_documents
  ADD COLUMN kind text NOT NULL DEFAULT 'text'
    CONSTRAINT prompt_documents_kind_check CHECK (kind IN ('text', 'table')),
  -- { "columns": [string], "rows": [[string]] }. Its shape is checked by the
  -- code that writes it; the database guarantees only that a table has one
  -- and a text document does not.
  ADD COLUMN table_content jsonb,
  ADD CONSTRAINT prompt_documents_table_content_check
    CHECK ((kind = 'table') = (table_content IS NOT NULL));

COMMIT;
