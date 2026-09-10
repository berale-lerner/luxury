-- Reordering prompt documents.
--
-- UNIQUE (agent_id, position) is checked per row, so swapping two documents
-- fails halfway through no matter how the UPDATE is written: the moment the
-- first row takes the second's position, the constraint sees a duplicate that
-- the very next row would have resolved.
--
-- DEFERRABLE INITIALLY IMMEDIATE keeps today's behaviour everywhere else —
-- an ordinary insert still fails immediately, where the error is useful — and
-- lets a reorder ask for the check to be postponed to COMMIT:
--
--   BEGIN;
--   SET CONSTRAINTS prompt_documents_agent_id_position_key DEFERRED;
--   ... rewrite every position ...
--   COMMIT;   -- uniqueness is verified here, once
--
-- The alternative is shuffling through a temporary range of positions, which
-- works and leaves a table whose contents are briefly nonsense, in a way the
-- next reader has to reconstruct from a comment.

BEGIN;

ALTER TABLE public.prompt_documents
  DROP CONSTRAINT prompt_documents_agent_id_position_key,
  ADD CONSTRAINT prompt_documents_agent_id_position_key
    UNIQUE (agent_id, position) DEFERRABLE INITIALLY IMMEDIATE;

COMMIT;
