---
status: todo
opened: 2026-09-09
---

# The prompt editing page

## The storage question is already answered

The backend for this exists — migration 0007 built it and the bot reads it in
production today. Three tables:

| | |
|---|---|
| `agents` | The stable key the code resolves (`guest`) |
| `prompt_documents` | The editable set. Ordered by `position`, assembled by concatenation |
| `prompt_versions` | A frozen snapshot, taken at publish |

Documents are a draft; a version is what the bot serves. `bot_user` has **no
grant at all** on `prompt_documents`, so a half-written sentence cannot reach
a guest even by mistake — that is a boundary, not a convention.

Versioning is set-level rather than per document, because reverting one
document while the others moved on produces a combination that never ran and
nobody reviewed.

## And so is the efficiency question

Loading is not a cost worth designing around, because three things already
handle it:

1. **The assembly happens at publish, not at call time.** `prompt_versions.body`
   holds the finished text. A guest message reads one row through
   `prompt_versions_latest_idx` — no join across documents, no concatenation
2. **`PromptCache`, 60s TTL** ([prompt.ts](../apps/bot/src/agent/prompt.ts)).
   One read per minute per process, not one per message. The TTL is
   deliberately dumb: publishing happens in the admin process, so there is
   nothing in the bot to invalidate it, and a manager waits at most a minute
3. **Provider-side prompt caching.** The Anthropic adapter marks the system
   prompt `cache_control: ephemeral`, so the stable prefix is not reprocessed
   or recharged on every turn

So the work here is the page, not the storage.

## What is actually missing

- **No routes.** The admin server serves conversations and `/api/me` and
  nothing else. Read, edit, reorder, preview and publish all need endpoints
- **Publishing is a script.** `scripts/publish-prompt.mjs` writes both tables
  from files under `prompts/<agent>/`, as a stopgap that says so in its own
  header. The page replaces it — see the conflict below
- **The assembly rule lives in the script.** The separator (`\n\n---\n\n`) and
  the ordering are defined in `publish-prompt.mjs`. The preview must produce
  byte-identical output to what publish stores, so this belongs in one shared
  place before there are two callers, not after

## The trap: deploy republishes over the manager

`scripts/deploy.mjs` calls `publishIfChanged` on **every deploy**. It assembles
`prompts/guest/` from the repo and publishes a new version whenever the body
differs from the latest one.

The moment the page exists, that is a silent revert: the manager publishes
version 5 in the UI, the next push deploys, the files still say something
else, and version 6 rewinds their work — with no error, because from the
script's point of view it did its job.

Deciding what happens to `publishIfChanged` is part of this task, not after
it. Bootstrapping a fresh database still needs it, so the likely shape is
publish-only-if-nothing-has-ever-been-published — but it is a decision to make
deliberately.

## Two things that will bite in implementation

**Reordering.** `UNIQUE (agent_id, position)` is checked per row, so swapping
two documents fails halfway through no matter how the update is written.
Either the constraint becomes `DEFERRABLE` in a migration and the reorder runs
in one transaction, or positions are rewritten through a temporary range.
The first is cleaner and it is a three-line migration.

**Version numbers.** `UNIQUE (agent_id, version_number)` means two publishes
at once collide. Allocate inside the transaction with a lock on the agent row
rather than reading the maximum and adding one.

## Revert

`prompt_versions.snapshot` already holds what the document set looked like, so
revert is: copy that snapshot back over the documents, then publish it as a
**new** version. Never rewind to an old row — the bot reads the highest
version number, and rewinding would mean history that disagrees with what is
being served.

## Boundaries

CLAUDE.md, and worth repeating on the page itself in some form: **a prompt
document is not a security mechanism.** "Never reveal cost prices" is not
protection — the protection is that the tool does not return the field. And no
secrets in a document, ever; it is text sent to a third-party model on every
message.

Facts about apartments belong in tools, not in documents. A document that
lists prices is a second source of truth that goes stale without anyone
noticing.

## Depends on

[0004](0004-admin-app-shell.md) for somewhere to put the page.
[0005](0005-user-management-and-roles.md) decides who may publish — an edit
here changes what every guest is told, immediately and with no deploy to roll
back, which argues for the highest role rather than the middle one.

## Tests

- Preview and publish produce identical text for the same document set. If
  they can diverge, the preview is decoration
- Reordering a set of three survives, including the swap that trips the
  unique constraint
- Revert produces a new version whose body equals the reverted one, and leaves
  the intervening versions in place
- `bot_user` still cannot select from `prompt_documents` — the existing
  permission suite covers this and it must stay covered
